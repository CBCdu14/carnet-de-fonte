import { secret } from './platform/secret';
import type { GarminData, GarminDay } from './types';
import { fmt } from './logic';

const TOKEN = 'github_token';
export const getGhToken = () => secret.get(TOKEN);
export const setGhToken = (t: string) => (t ? secret.set(TOKEN, t) : secret.remove(TOKEN));

export class GarminError extends Error {}

/** Lit data/garmin.json dans le dépôt privé via l'API GitHub (jeton en lecture seule). */
export async function fetchGarmin(repo: string, token: string): Promise<GarminData> {
  const r = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  if (!/^[\w.-]+\/[\w.-]+$/.test(r)) throw new GarminError('Dépôt attendu au format pseudo/carnet-data.');
  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${r}/contents/data/garmin.json`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' },
      cache: 'no-store',
    });
  } catch {
    throw new GarminError('Pas de connexion internet : les dernières données reçues restent affichées.');
  }
  if (res.status === 401) throw new GarminError('Jeton GitHub refusé ou expiré : remplace-le dans Réglages.');
  if (res.status === 403) throw new GarminError("Le jeton GitHub n'a pas le droit de lire ce dépôt (permission Contents : lecture).");
  if (res.status === 404) throw new GarminError('Dépôt ou fichier introuvable : vérifie le nom du dépôt et que le jeton y a accès.');
  if (!res.ok) throw new GarminError(`GitHub a répondu ${res.status}.`);
  const j: any = await res.json().catch(() => null);
  if (!j || !Array.isArray(j.days)) throw new GarminError("Le fichier garmin.json n'a pas le format attendu.");
  return { updatedAt: j.updatedAt ?? null, fetchedAt: Date.now(), days: j.days, weights: j.weights ?? [], activities: j.activities ?? [] };
}

const avg = (xs: (number | undefined)[]) => {
  const v = xs.filter((x): x is number => typeof x === 'number' && x > 0);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined;
};
export function lastDays(g: GarminData, n: number): GarminDay[] {
  return g.days.slice(-n);
}
export function summary(g: GarminData, n = 7) {
  const d = lastDays(g, n);
  return {
    kcal: avg(d.map((x) => x.kcal)),
    activeKcal: avg(d.map((x) => x.activeKcal)),
    steps: avg(d.map((x) => x.steps)),
    restingHr: avg(d.map((x) => x.restingHr)),
    sleepH: avg(d.map((x) => x.sleepH)),
    sleepScore: avg(d.map((x) => x.sleepScore)),
  };
}
export const ACT_LABEL: Record<string, string> = {
  running: 'Course',
  trail_running: 'Trail',
  treadmill_running: 'Tapis',
  track_running: 'Piste',
  cycling: 'Vélo',
  road_biking: 'Vélo route',
  mountain_biking: 'VTT',
  indoor_cycling: 'Vélo intérieur',
  walking: 'Marche',
  hiking: 'Randonnée',
  strength_training: 'Muscu',
  lap_swimming: 'Natation',
  open_water_swimming: 'Eau libre',
  cardio: 'Cardio',
  hiit: 'HIIT',
  yoga: 'Yoga',
};
export const actLabel = (t: string) => ACT_LABEL[t] ?? t.replace(/_/g, ' ');
export const pace = (p?: number) => {
  if (!p) return '';
  const m = Math.floor(p);
  const s = Math.round((p - m) * 60);
  return `${m}'${String(s === 60 ? 0 : s).padStart(2, '0')}"/km`;
};

/** Résumé texte pour le coach. */
export function garminContext(g: GarminData | null) {
  if (!g || !g.days.length) return '';
  const s = summary(g, 14);
  const w = g.weights.slice(-6).map((x) => `${x.date} ${fmt(x.kg)} kg${x.fatPct ? ` (${fmt(x.fatPct)} % MG)` : ''}`).join(', ');
  const acts = g.activities
    .slice(-10)
    .map((a) => `${a.date.slice(0, 10)} ${actLabel(a.type)}${a.km ? ` ${fmt(a.km)} km` : ''}${a.min ? ` ${Math.round(a.min)} min` : ''}${a.paceMinKm ? ` ${pace(a.paceMinKm)}` : ''}${a.avgHr ? ` FC ${a.avgHr}` : ''}`)
    .join('\n');
  const r = (v?: number, d = 0) => (v == null ? '?' : fmt(Math.round(v * 10 ** d) / 10 ** d));
  return `

DONNÉES GARMIN (montre + balance, moyennes sur 14 jours)
Dépense totale ${r(s.kcal)} kcal/j (dont active ${r(s.activeKcal)}), ${r(s.steps)} pas/j, FC repos ${r(s.restingHr)}, sommeil ${r(s.sleepH, 1)} h (score ${r(s.sleepScore)})
Pesées récentes : ${w || '(aucune)'}
Activités récentes :
${acts || '(aucune)'}`;
}
