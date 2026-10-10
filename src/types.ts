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
  /** Horodatage de la dernière modification (synchro entre appareils). */
  u?: number;
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
  u?: number;
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
  u?: number;
}

/** Séance en cours : les champs restent du texte pendant la saisie (virgule, champ vide…). */
export interface SetDraft {
  kg: string;
  r: string;
  done: boolean;
}

export interface PrevPerf {
  date: string;
  sets: { kg: number; r: number }[];
}

export interface ActiveEntry {
  ex: string;
  name: string;
  target: number;
  sets: SetDraft[];
  /** Dernière fois que l'exercice a été fait (toutes séances confondues). */
  prev?: PrevPerf;
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
  /** Dépôt GitHub privé des données Garmin, ex. "pseudo/carnet-data". */
  garminRepo: string;
}

/* ---------- Données Garmin (fichier data/garmin.json du dépôt carnet-data) ---------- */
export interface GarminDay {
  date: string;
  steps?: number;
  kcal?: number;
  activeKcal?: number;
  bmrKcal?: number;
  restingHr?: number;
  sleepH?: number;
  sleepScore?: number;
  stress?: number;
  bodyBattery?: number;
}
export interface GarminWeight {
  date: string;
  kg: number;
  fatPct?: number;
  muscleKg?: number;
}
export interface GarminActivity {
  id: number | string;
  date: string; // "YYYY-MM-DD HH:MM"
  type: string;
  name: string;
  min?: number;
  km?: number;
  paceMinKm?: number;
  kcal?: number;
  avgHr?: number;
}
export interface GarminData {
  updatedAt: string | null;
  fetchedAt: number;
  days: GarminDay[];
  weights: GarminWeight[];
  activities: GarminActivity[];
}

export interface Data {
  exercises: Record<string, Exercise>;
  workouts: Workout[];
  logs: Log[];
  active: Active | null;
  settings: Settings;
  garmin: GarminData | null;
  meta: SyncMeta;
}

export interface SyncMeta {
  /** Données de départ jamais modifiées : la première synchro les remplace par celles du compte. */
  pristine: boolean;
  /** Suppressions à propager aux autres appareils : id → date. */
  tomb: Record<string, number>;
  /** Compteur de modifications locales ; `syncedRev` = dernière version envoyée. */
  rev: number;
  syncedRev: number;
  syncedAt: number;
}

export type Tab = 'seances' | 'seance' | 'exos' | 'progres' | 'coach' | 'reglages';
