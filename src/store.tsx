import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { kv } from './platform/storage';
import type { Active, Data, Exercise, GarminData, Log, Settings, SyncMeta, Workout } from './types';
import { merge, toPayload, type Payload } from './cloud';
import { dayStr, goalFor, lastPerf, parseNum, r2, uid } from './logic';
import { seedExercises, seedWorkouts } from './seed';

const K = {
  exercises: 'cdf.exercises',
  workouts: 'cdf.workouts',
  logs: 'cdf.logs',
  active: 'cdf.active',
  settings: 'cdf.settings',
  garmin: 'cdf.garmin',
  meta: 'cdf.meta',
} as const;
type Key = keyof typeof K;

export const DEFAULT_SETTINGS: Settings = { restSec: 90, model: 'gpt-5-mini', garminRepo: '' };

async function readJSON<T>(key: string): Promise<T | null> {
  try {
    const s = await kv.get(key);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

async function loadData(): Promise<Data> {
  const [exercises, workouts, logs, active, settings, garmin, meta] = await Promise.all([
    readJSON<Record<string, Exercise>>(K.exercises),
    readJSON<Workout[]>(K.workouts),
    readJSON<Log[]>(K.logs),
    readJSON<Active>(K.active),
    readJSON<Settings>(K.settings),
    readJSON<GarminData>(K.garmin),
    readJSON<SyncMeta>(K.meta),
  ]);
  if (!exercises) {
    // Premier lancement : programme de départ
    const ex = seedExercises();
    return { exercises: ex, workouts: seedWorkouts(ex), logs: [], active: null, settings: DEFAULT_SETTINGS, garmin: null, meta: { ...EMPTY_META, pristine: true } };
  }
  return {
    exercises,
    workouts: workouts ?? [],
    logs: logs ?? [],
    active: active ?? null,
    settings: { ...DEFAULT_SETTINGS, ...(settings ?? {}) },
    garmin: garmin ?? null,
    // Version d'avant la synchro : si c'est encore le programme d'exemple, la synchro le remplacera
    meta: meta ?? { ...EMPTY_META, pristine: !(logs ?? []).length && (workouts ?? []).every((w) => SEED_WO.has(w.id)) },
  };
}

const SEED_WO = new Set(['push', 'pull', 'jambes', 'fullbody']);
const EMPTY_META: SyncMeta = { pristine: false, tomb: {}, rev: 0, syncedRev: 0, syncedAt: 0 };

const sortWo = (w: Workout[]) => [...w].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fr'));

function withLoad(ex: Exercise, v: number): Exercise {
  const d = dayStr(new Date());
  const h = ex.loadHistory.slice();
  if (h.length && h[h.length - 1].d === d) h[h.length - 1] = { d, v };
  else h.push({ d, v });
  return { ...ex, load: v, loadHistory: h.slice(-200), u: Date.now() };
}

export interface Store {
  data: Data;
  setLoad: (id: string, v: number) => void;
  changeLoad: (id: string, dir: 1 | -1) => number;
  saveExercise: (ex: Omit<Exercise, 'id' | 'loadHistory'> & { id?: string }) => string;
  deleteExercise: (id: string) => void;
  saveWorkout: (w: Omit<Workout, 'id' | 'order'> & { id?: string }) => void;
  deleteWorkout: (id: string) => void;
  startWorkout: (id: string) => void;
  updateActive: (fn: (a: Active) => Active) => void;
  finishWorkout: (note: string, apply: { ex: string; nv: number }[]) => void;
  abandonWorkout: () => void;
  deleteLog: (id: string) => void;
  setSettings: (s: Partial<Settings>) => void;
  replaceAll: (d: Pick<Data, 'exercises' | 'workouts' | 'logs'>) => void;
  setGarmin: (g: GarminData | null) => void;
  /** Applique le résultat d'une synchro démarrée à la version locale `rev`. */
  applySync: (p: Payload, rev: number) => void;
  setSyncError: (msg: string | null) => void;
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider manquant');
  return s;
};

export function StoreProvider({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const saved = useRef<Partial<Record<Key, unknown>>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<Data | null>(null);
  latest.current = data;

  useEffect(() => {
    loadData().then(setData);
  }, []);

  const flush = useCallback(async () => {
    const d = latest.current;
    if (!d) return;
    for (const k of Object.keys(K) as Key[]) {
      if (saved.current[k] === d[k]) continue;
      saved.current[k] = d[k];
      try {
        if (d[k] == null) await kv.remove(K[k]);
        else await kv.set(K[k], JSON.stringify(d[k]));
      } catch (e) {
        saved.current[k] = undefined; // réessai au prochain changement
      }
    }
  }, []);

  useEffect(() => {
    if (!data) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 300);
  }, [data, flush]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') flush();
    });
    return () => sub.remove();
  }, [flush]);

  const store = useMemo<Store | null>(() => {
    if (!data) return null;
    const set = (fn: (d: Data) => Data) => setData((d) => (d ? fn(d) : d));
    /** Modification de données synchronisées : marque une nouvelle version locale. */
    const mut = (fn: (d: Data) => Data) =>
      setData((d) => {
        if (!d) return d;
        const n = fn(d);
        return n === d ? d : { ...n, meta: { ...n.meta, pristine: false, rev: n.meta.rev + 1 } };
      });
    const now = () => Date.now();

    const setLoad = (id: string, v: number) =>
      mut((d) => {
        const ex = d.exercises[id];
        if (!ex) return d;
        const old = ex.load;
        const nv = Math.max(0, r2(v));
        let active = d.active;
        if (active) {
          active = {
            ...active,
            entries: active.entries.map((e) =>
              e.ex !== id ? e : { ...e, sets: e.sets.map((s) => (!s.done && parseNum(s.kg) === old ? { ...s, kg: String(nv).replace('.', ',') } : s)) },
            ),
          };
        }
        return { ...d, exercises: { ...d.exercises, [id]: withLoad(ex, nv) }, active };
      });

    return {
      data,
      setLoad,
      changeLoad: (id, dir) => {
        const ex = data.exercises[id];
        if (!ex) return 0;
        const nv = Math.max(0, r2(ex.load + dir * (ex.step || 2.5)));
        setLoad(id, nv);
        return nv;
      },
      saveExercise: (input) => {
        const id = input.id || 'ex-' + uid();
        mut((d) => {
          const prev = d.exercises[id];
          let ex: Exercise = {
            id,
            name: input.name,
            muscle: input.muscle,
            equip: input.equip,
            step: input.step,
            load: prev?.load ?? 0,
            loadHistory: prev?.loadHistory ?? [],
          };
          if (!prev || prev.load !== input.load) ex = withLoad(ex, r2(input.load));
          ex.u = now();
          const workouts = d.workouts.map((w) => (w.items.some((i) => i.ex === id && i.name !== ex.name) ? { ...w, u: now(), items: w.items.map((i) => (i.ex === id ? { ...i, name: ex.name } : i)) } : w));
          return { ...d, exercises: { ...d.exercises, [id]: ex }, workouts };
        });
        return id;
      },
      deleteExercise: (id) =>
        mut((d) => {
          const { [id]: _gone, ...rest } = d.exercises;
          return {
            ...d,
            exercises: rest,
            workouts: d.workouts.map((w) => (w.items.some((i) => i.ex === id) ? { ...w, u: now(), items: w.items.filter((i) => i.ex !== id) } : w)),
            meta: { ...d.meta, tomb: { ...d.meta.tomb, [id]: now() } },
          };
        }),
      saveWorkout: (w) =>
        mut((d) => {
          const prev = w.id ? d.workouts.find((x) => x.id === w.id) : undefined;
          const order = prev?.order ?? (d.workouts.length ? Math.max(...d.workouts.map((x) => x.order)) + 1 : 0);
          const nw: Workout = { id: w.id || 'wo-' + uid(), name: w.name, order, items: w.items, u: now() };
          return { ...d, workouts: sortWo([...d.workouts.filter((x) => x.id !== nw.id), nw]) };
        }),
      deleteWorkout: (id) => mut((d) => ({ ...d, workouts: d.workouts.filter((w) => w.id !== id), meta: { ...d.meta, tomb: { ...d.meta.tomb, [id]: now() } } })),
      startWorkout: (id) =>
        set((d) => {
          const w = d.workouts.find((x) => x.id === id);
          if (!w) return d;
          const active: Active = {
            workoutId: w.id,
            name: w.name,
            startedAt: Date.now(),
            entries: w.items
              .filter((it) => d.exercises[it.ex])
              .map((it) => {
                const ex = d.exercises[it.ex];
                const prev = lastPerf(d.logs, it.ex);
                return {
                  ex: it.ex,
                  name: ex.name,
                  target: it.reps,
                  prev,
                  sets: Array.from({ length: it.sets }, (_, j) => ({
                    kg: String(ex.load).replace('.', ','),
                    r: String(goalFor(prev?.sets[j], ex.load, it.reps)),
                    done: false,
                  })),
                };
              }),
          };
          return { ...d, active };
        }),
      updateActive: (fn) => set((d) => (d.active ? { ...d, active: fn(d.active) } : d)),
      finishWorkout: (note, apply) =>
        mut((d) => {
          const a = d.active;
          if (!a) return d;
          const log: Log = {
            id: 'lg-' + uid(),
            date: new Date(a.startedAt).toISOString(),
            workoutId: a.workoutId,
            workoutName: a.name,
            durationMin: Math.max(1, Math.round((Date.now() - a.startedAt) / 60000)),
            note,
            u: now(),
            entries: a.entries.map((e) => ({
              ex: e.ex,
              name: d.exercises[e.ex]?.name ?? e.name,
              target: e.target,
              sets: e.sets.map((s) => ({ kg: r2(parseNum(s.kg)), r: Math.max(0, Math.round(parseNum(s.r))), done: s.done })),
            })),
          };
          const exercises = { ...d.exercises };
          for (const p of apply) if (exercises[p.ex]) exercises[p.ex] = withLoad(exercises[p.ex], p.nv);
          return { ...d, exercises, logs: [log, ...d.logs], active: null };
        }),
      abandonWorkout: () => set((d) => ({ ...d, active: null })),
      deleteLog: (id) => mut((d) => ({ ...d, logs: d.logs.filter((l) => l.id !== id), meta: { ...d.meta, tomb: { ...d.meta.tomb, [id]: now() } } })),
      setSettings: (s) => set((d) => ({ ...d, settings: { ...d.settings, ...s } })),
      replaceAll: (n) =>
        mut((d) => {
          // Import = remplace tout, y compris sur les autres appareils
          const t = now();
          const keep = new Set([...Object.keys(n.exercises), ...n.workouts.map((w) => w.id), ...n.logs.map((l) => l.id)]);
          const tomb: Record<string, number> = {};
          for (const [k, v] of Object.entries(d.meta.tomb)) if (!keep.has(k)) tomb[k] = v;
          for (const k of [...Object.keys(d.exercises), ...d.workouts.map((w) => w.id), ...d.logs.map((l) => l.id)]) if (!keep.has(k)) tomb[k] = t;
          const exercises: Record<string, Exercise> = {};
          for (const [k, e] of Object.entries(n.exercises)) exercises[k] = { ...e, u: t };
          return {
            ...d,
            exercises,
            workouts: sortWo(n.workouts.map((w) => ({ ...w, u: t }))),
            logs: n.logs.map((l) => ({ ...l, u: t })).sort((a, b) => b.date.localeCompare(a.date)),
            active: null,
            meta: { ...d.meta, tomb },
          };
        }),
      setGarmin: (g) => set((d) => ({ ...d, garmin: g })),
      applySync: (p, rev) =>
        set((d) => {
          // Des modifications locales faites pendant la synchro sont fusionnées et repartiront à la suivante
          const m = d.meta.rev === rev ? p : merge(toPayload(d), p);
          return {
            ...d,
            exercises: m.exercises,
            workouts: sortWo(m.workouts),
            logs: m.logs,
            meta: { ...d.meta, tomb: m.tomb, pristine: false, syncedRev: rev, syncedAt: Date.now(), lastError: undefined },
          };
        }),
      setSyncError: (msg) => set((d) => (d.meta.lastError === (msg ?? undefined) ? d : { ...d, meta: { ...d.meta, lastError: msg ?? undefined } })),
    };
  }, [data]);

  if (!store) return <>{fallback}</>;
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
