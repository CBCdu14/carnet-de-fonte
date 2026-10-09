export type Equip = 'barre' | 'halteres' | 'machine' | 'pdc';

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  equip: Equip;
  /** Charge de travail : une seule valeur par exercice, partagée par toutes les séances. */
  load: number;
  step: number;
  loadHistory: { d: string; v: number }[];
}

export interface WorkoutItem {
  ex: string;
  name: string;
  sets: number;
  reps: number;
}

export interface Workout {
  id: string;
  name: string;
  order: number;
  items: WorkoutItem[];
}

export interface SetLog {
  kg: number;
  r: number;
  done: boolean;
}

export interface EntryLog {
  ex: string;
  name: string;
  target: number;
  sets: SetLog[];
}

export interface Log {
  id: string;
  date: string; // ISO
  workoutId: string;
  workoutName: string;
  durationMin: number;
  note: string;
  entries: EntryLog[];
}

/** Séance en cours : les champs restent du texte pendant la saisie (virgule, champ vide…). */
export interface SetDraft {
  kg: string;
  r: string;
  done: boolean;
}

export interface ActiveEntry {
  ex: string;
  name: string;
  target: number;
  sets: SetDraft[];
}

export interface Active {
  workoutId: string;
  name: string;
  startedAt: number;
  entries: ActiveEntry[];
}

export interface Settings {
  restSec: number;
  model: string;
}

export interface Data {
  exercises: Record<string, Exercise>;
  workouts: Workout[];
  logs: Log[];
  active: Active | null;
  settings: Settings;
}

export type Tab = 'seances' | 'seance' | 'exos' | 'progres' | 'coach' | 'reglages';
