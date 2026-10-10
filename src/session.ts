import type { Active, ActiveEntry } from './types';

/** Première série non faite d'un exercice (-1 si fini). */
export const nextSet = (e: ActiveEntry) => e.sets.findIndex((s) => !s.done);

/** Exercice en cours : celui choisi s'il reste des séries, sinon le premier non terminé (-1 = séance finie). */
export function currentIdx(a: Active): number {
  const c = a.cur ?? 0;
  if (a.entries[c] && nextSet(a.entries[c]) >= 0) return c;
  return a.entries.findIndex((e) => nextSet(e) >= 0);
}

/** Exercices restants (hors exercice en cours). */
export const remaining = (a: Active, except: number) => a.entries.map((e, i) => ({ e, i })).filter(({ e, i }) => i !== except && nextSet(e) >= 0);

/** Fait passer l'exercice `from` en exercice en cours (machine occupée…). L'ordre réel est conservé dans l'historique. */
export function chooseExercise(a: Active, from: number): Active {
  const at = currentIdx(a);
  if (at < 0 || from === at) return { ...a, cur: from };
  const entries = a.entries.slice();
  const [moved] = entries.splice(from, 1);
  const to = from < at ? at - 1 : at;
  entries.splice(to, 0, moved);
  return { ...a, entries, cur: to };
}

/** Valide la série en cours avec le nombre de reps fait et lance le bon repos. */
export function completeSet(a: Active, i: number, reps: number, kg: string, restSec: number, restExSec: number): Active {
  const entries = a.entries.map((e, k) => {
    if (k !== i) return e;
    const j = nextSet(e);
    return { ...e, sets: e.sets.map((s, sj) => (sj === j ? { ...s, kg, r: String(reps), done: true } : s)) };
  });
  let n: Active = { ...a, entries };
  if (nextSet(entries[i]) >= 0) {
    n = { ...n, cur: i, rest: restSec > 0 ? { end: Date.now() + restSec * 1000, total: restSec, kind: 'set' } : undefined };
  } else {
    const next = entries.findIndex((e) => nextSet(e) >= 0);
    n = { ...n, cur: next < 0 ? i : next, rest: next >= 0 && restExSec > 0 ? { end: Date.now() + restExSec * 1000, total: restExSec, kind: 'ex' } : undefined };
  }
  return n;
}

export const fmtClock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
