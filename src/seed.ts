import type { Exercise, Workout } from './types';
import { dayStr } from './logic';

type Def = [string, string, string, Exercise['equip'], number, number];
const DEFS: Def[] = [
  ['dc', 'Développé couché', 'Pectoraux', 'barre', 60, 2.5],
  ['dic', 'Développé incliné haltères', 'Pectoraux', 'halteres', 22, 2],
  ['dm', 'Développé militaire', 'Épaules', 'barre', 40, 2.5],
  ['el', 'Élévations latérales', 'Épaules', 'halteres', 10, 1],
  ['ext', 'Extension triceps poulie', 'Triceps', 'machine', 25, 2.5],
  ['trac', 'Tractions', 'Dos', 'pdc', 0, 2.5],
  ['rb', 'Rowing barre', 'Dos', 'barre', 55, 2.5],
  ['tv', 'Tirage vertical', 'Dos', 'machine', 50, 5],
  ['curl', 'Curl haltères', 'Biceps', 'halteres', 12, 1],
  ['sq', 'Squat', 'Jambes', 'barre', 80, 2.5],
  ['sdtr', 'Soulevé de terre roumain', 'Jambes', 'barre', 70, 2.5],
  ['presse', 'Presse à cuisses', 'Jambes', 'machine', 140, 5],
  ['moll', 'Mollets debout', 'Mollets', 'machine', 60, 5],
];

export function seedExercises(): Record<string, Exercise> {
  const d = dayStr(new Date());
  const out: Record<string, Exercise> = {};
  for (const [id, name, muscle, equip, load, step] of DEFS) {
    out[id] = { id, name, muscle, equip, load, step, loadHistory: [{ d, v: load }] };
  }
  return out;
}

export function seedWorkouts(ex: Record<string, Exercise>): Workout[] {
  const it = (id: string, sets: number, reps: number) => ({ ex: id, name: ex[id].name, sets, reps });
  return [
    { id: 'push', name: 'Push', order: 0, items: [it('dc', 4, 8), it('dic', 3, 10), it('dm', 3, 8), it('el', 3, 12), it('ext', 3, 12)] },
    { id: 'pull', name: 'Pull', order: 1, items: [it('trac', 4, 6), it('rb', 4, 8), it('tv', 3, 10), it('curl', 3, 10)] },
    { id: 'jambes', name: 'Jambes', order: 2, items: [it('sq', 4, 6), it('sdtr', 3, 8), it('presse', 3, 10), it('moll', 4, 12)] },
    { id: 'fullbody', name: 'Full body', order: 3, items: [it('sq', 3, 8), it('dc', 3, 8), it('rb', 3, 8), it('dm', 3, 10)] },
  ];
}
