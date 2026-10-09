import type { Active, Exercise, Log, Workout } from './types';

export const MUSCLES = ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Jambes', 'Fessiers', 'Mollets', 'Abdos', 'Autre'];
export const EQUIP: Record<string, string> = {
  barre: 'Barre',
  halteres: 'Haltères',
  machine: 'Machine / poulie',
  pdc: 'Poids du corps',
};
export const BAR = 20;
export const STEPS = [0.5, 1, 1.25, 2, 2.5, 5, 10];

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

export const r2 = (v: number) => Math.round(v * 100) / 100;
export const fmt = (v: number) => {
  const n = r2(+v || 0);
  const s = Number.isInteger(n) ? String(n) : String(n);
  return s.replace('.', ',');
};
export const parseNum = (s: string) => {
  const v = parseFloat(String(s).replace(',', '.'));
  return isNaN(v) ? 0 : v;
};
export const pad = (n: number) => String(n).padStart(2, '0');
export const dayStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fDate = (t: string | number) => {
  const d = new Date(t);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
export const fDateL = (t: string | number) => {
  const d = new Date(t);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
export const fTime = (t: number) => {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const loadLabel = (ex: Exercise) =>
  ex.equip === 'pdc' ? (ex.load ? `+${fmt(ex.load)}` : 'PdC') : fmt(ex.load);

export const sharedCount = (workouts: Workout[], id: string) =>
  workouts.filter((w) => w.items.some((i) => i.ex === id)).length;

/** Disques à mettre de chaque côté d'une barre de 20 kg. */
export const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25] as const;
export function platesPerSide(load: number): { plates: number[]; missing: number } {
  let side = r2((load - BAR) / 2);
  const plates: number[] = [];
  for (const p of PLATES) {
    while (side >= p - 1e-9) {
      plates.push(p);
      side = r2(side - p);
    }
  }
  return { plates, missing: side > 0 ? side : 0 };
}

/** 1RM estimé, formule d'Epley. */
export const e1rm = (kg: number, r: number) => (r > 0 ? kg * (1 + r / 30) : 0);

export const logVolume = (l: Log) =>
  l.entries.reduce((a, e) => a + e.sets.filter((s) => s.done).reduce((b, s) => b + s.kg * s.r, 0), 0);

export interface Point {
  t: number;
  kg: number;
  e1: number;
}
export function exPoints(logs: Log[], id: string): Point[] {
  const pts: Point[] = [];
  for (const l of logs) {
    const e = l.entries.find((x) => x.ex === id);
    if (!e) continue;
    const done = e.sets.filter((s) => s.done && s.r > 0);
    if (!done.length) continue;
    pts.push({
      t: new Date(l.date).getTime(),
      kg: Math.max(...done.map((s) => s.kg)),
      e1: r2(Math.max(...done.map((s) => e1rm(s.kg, s.r)))),
    });
  }
  return pts.sort((a, b) => a.t - b.t);
}

export function weekKey(d: string | number | Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return dayStr(x);
}
export function weeklyVolume(logs: Log[], weeks = 10) {
  const out: { k: string; t: number; v: number; n: number }[] = [];
  const monday = new Date(weekKey(new Date()) + 'T12:00:00');
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(monday);
    d.setDate(d.getDate() - i * 7);
    out.push({ k: dayStr(d), t: d.getTime(), v: 0, n: 0 });
  }
  for (const l of logs) {
    const w = out.find((x) => x.k === weekKey(l.date));
    if (w) {
      w.v += logVolume(l);
      w.n++;
    }
  }
  return out;
}

export function niceScale(lo: number, hi: number, ticks = 4) {
  if (hi - lo < 1) {
    lo -= 2.5;
    hi += 2.5;
  }
  const raw = (hi - lo) / ticks;
  const steps = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];
  const st = steps.find((s) => s >= raw) ?? 10000;
  return { lo: Math.floor(lo / st) * st, hi: Math.ceil(hi / st) * st, st };
}

export interface Proposal {
  ex: string;
  nv: number;
  on: boolean;
  kind: 'up' | 'keep';
  text: string;
}
/** Propositions de charge en fin de séance (double progression). */
export function proposals(active: Active, exercises: Record<string, Exercise>): Proposal[] {
  const out: Proposal[] = [];
  for (const e of active.entries) {
    const ex = exercises[e.ex];
    if (!ex) continue;
    const done = e.sets.filter((s) => s.done);
    if (!done.length) continue;
    const top = Math.max(...done.map((s) => parseNum(s.kg)));
    const all = done.length === e.sets.length && done.every((s) => parseNum(s.r) >= e.target);
    if (all && top >= ex.load) {
      const nv = r2(Math.max(top, ex.load) + (ex.step || 2.5));
      out.push({ ex: ex.id, nv, on: true, kind: 'up', text: `Toutes les séries réussies à ${e.target} reps. Passer à ${fmt(nv)} kg la prochaine fois ?` });
    } else if (top !== ex.load) {
      out.push({ ex: ex.id, nv: top, on: false, kind: 'keep', text: `Travaillé à ${fmt(top)} kg (charge enregistrée : ${fmt(ex.load)} kg). Garder ${fmt(top)} kg ?` });
    }
  }
  return out;
}

export function lastDone(logs: Log[], woId: string) {
  return logs.find((l) => l.workoutId === woId)?.date;
}
