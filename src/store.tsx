import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { kv } from './platform/storage';
import type { Active, Data, Exercise, GarminData, Log, Settings, Workout } from './types';
import { dayStr, parseNum, r2, uid } from './logic';
import { seedExercises, seedWorkouts } from './seed';

const K = {
  exercises: 'cdf.exercises',
  workouts: 'cdf.workouts',
  logs: 'cdf.logs',
  active: 'cdf.active',
  settings: 'cdf.settings',
  garmin: 'cdf.garmin',
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
  const [exercises, workouts, logs, active, settings, garmin] = await Promise.all([
    readJSON<Record<string, Exercise>>(K.exercises),
    readJSON<Workout[]>(K.workouts),
    readJSON<Log[]>(K.logs),
    readJSON<Active>(K.active),
    readJSON<Settings>(K.settings),
    readJSON<GarminData>(K.garmin),
  ]);
  if (!exercises) {
    // Premier lancement : programme de départ
    const ex = seedExercises();
    return { exercises: ex, workouts: seedWorkouts(ex), logs: [], active: null, settings: DEFAULT_SETTINGS, garmin: null };
  }
  return {
    exercises,
    workouts: workouts ?? [],
    logs: logs ?? [],
    active: active ?? null,
    settings: { ...DEFAULT_SETTINGS, ...(settings ?? {}) },
    garmin: garmin ?? null,
  };
}

const sortWo = (w: Workout[]) => [...w].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fr'));

function withLoad(ex: Exercise, v: number): Exercise {
  const d = dayStr(new Date());
  const h = ex.loadHistory.slice();
  if (h.length && h[h.length - 1].d === d) h[h.length - 1] = { d, v };
  else h.push({ d, v });
  return { ...ex, load: v, loadHistory: h.slice(-200) };
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

    const setLoad = (id: string, v: number) =>
      set((d) => {
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
        set((d) => {
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
          const workouts = d.workouts.map((w) => ({ ...w, items: w.items.map((i) => (i.ex === id ? { ...i, name: ex.name } : i)) }));
          return { ...d, exercises: { ...d.exercises, [id]: ex }, workouts };
        });
        return id;
      },
      deleteExercise: (id) =>
        set((d) => {
          const { [id]: _gone, ...rest } = d.exercises;
          return { ...d, exercises: rest, workouts: d.workouts.map((w) => ({ ...w, items: w.items.filter((i) => i.ex !== id) })) };
        }),
      saveWorkout: (w) =>
        set((d) => {
          const prev = w.id ? d.workouts.find((x) => x.id === w.id) : undefined;
          const order = prev?.order ?? (d.workouts.length ? Math.max(...d.workouts.map((x) => x.order)) + 1 : 0);
          const nw: Workout = { id: w.id || 'wo-' + uid(), name: w.name, order, items: w.items };
          return { ...d, workouts: sortWo([...d.workouts.filter((x) => x.id !== nw.id), nw]) };
        }),
      deleteWorkout: (id) => set((d) => ({ ...d, workouts: d.workouts.filter((w) => w.id !== id) })),
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
                return {
                  ex: it.ex,
                  name: ex.name,
                  target: it.reps,
                  sets: Array.from({ length: it.sets }, () => ({ kg: String(ex.load).replace('.', ','), r: String(it.reps), done: false })),
                };
              }),
          };
          return { ...d, active };
        }),
      updateActive: (fn) => set((d) => (d.active ? { ...d, active: fn(d.active) } : d)),
      finishWorkout: (note, apply) =>
        set((d) => {
          const a = d.active;
          if (!a) return d;
          const log: Log = {
            id: 'lg-' + uid(),
            date: new Date(a.startedAt).toISOString(),
            workoutId: a.workoutId,
            workoutName: a.name,
            durationMin: Math.max(1, Math.round((Date.now() - a.startedAt) / 60000)),
            note,
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
      deleteLog: (id) => set((d) => ({ ...d, logs: d.logs.filter((l) => l.id !== id) })),
      setSettings: (s) => set((d) => ({ ...d, settings: { ...d.settings, ...s } })),
      replaceAll: (n) =>
        set((d) => ({
          ...d,
          exercises: n.exercises,
          workouts: sortWo(n.workouts),
          logs: [...n.logs].sort((a, b) => b.date.localeCompare(a.date)),
          active: null,
        })),
      setGarmin: (g) => set((d) => ({ ...d, garmin: g })),
    };
  }, [data]);

  if (!store) return <>{fallback}</>;
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
