/* Synchro entre appareils : un fichier data/carnet.json dans le dépôt GitHub privé (carnet-data). */
import type { Data, Exercise, Log, Workout } from './types';

export interface Payload {
  exercises: Record<string, Exercise>;
  workouts: Workout[];
  logs: Log[];
  tomb: Record<string, number>;
}

const PATH = 'data/carnet.json';

export const toPayload = (d: Data): Payload => ({ exercises: d.exercises, workouts: d.workouts, logs: d.logs, tomb: d.meta.tomb });

/** Fusion : pour chaque élément, la version modifiée le plus récemment gagne ; une suppression gagne si elle est plus récente. */
export function merge(a: Payload, b: Payload): Payload {
  const tomb: Record<string, number> = { ...a.tomb };
  for (const [k, v] of Object.entries(b.tomb || {})) tomb[k] = Math.max(tomb[k] ?? 0, v);
  const alive = (x: { id: string; u?: number }) => !(tomb[x.id] != null && tomb[x.id] >= (x.u ?? 0));
  const pick = <T extends { id: string; u?: number }>(xs: T[], ys: T[]): T[] => {
    const m = new Map<string, T>();
    for (const x of [...xs, ...ys]) {
      const cur = m.get(x.id);
      if (!cur || (x.u ?? 0) > (cur.u ?? 0) || ((x.u ?? 0) === (cur.u ?? 0) && JSON.stringify(x) > JSON.stringify(cur))) m.set(x.id, x);
    }
    return [...m.values()].filter(alive);
  };
  const exercises: Record<string, Exercise> = {};
  for (const e of pick(Object.values(a.exercises), Object.values(b.exercises || {})).sort((x, y) => x.id.localeCompare(y.id))) exercises[e.id] = e;
  const workouts = pick(a.workouts, b.workouts || []).sort((x, y) => x.order - y.order || x.id.localeCompare(y.id));
  const logs = pick(a.logs, b.logs || []).sort((x, y) => y.date.localeCompare(x.date) || x.id.localeCompare(y.id));
  // Les suppressions de plus de 6 mois sont oubliées
  const old = Date.now() - 183 * 864e5;
  for (const k of Object.keys(tomb)) if (tomb[k] < old) delete tomb[k];
  return { exercises, workouts, logs, tomb };
}

/** Représentation stable pour savoir si deux versions sont identiques. */
export function canon(p: Payload) {
  const sortObj = (o: any): any =>
    Array.isArray(o) ? o.map(sortObj) : o && typeof o === 'object' ? Object.fromEntries(Object.keys(o).sort().map((k) => [k, sortObj(o[k])])) : o;
  return JSON.stringify(
    sortObj({
      exercises: p.exercises,
      workouts: [...p.workouts].sort((x, y) => x.id.localeCompare(y.id)),
      logs: [...p.logs].sort((x, y) => x.id.localeCompare(y.id)),
      tomb: p.tomb,
    }),
  );
}

const b64enc = (s: string) => btoa(unescape(encodeURIComponent(s)));
const b64dec = (b: string) => decodeURIComponent(escape(atob(b.replace(/\s/g, ''))));

export class SyncError extends Error {}

function headers(token: string) {
  return { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
}
function fail(status: number): never {
  if (status === 401) throw new SyncError('Jeton GitHub refusé ou expiré : remplace-le dans Réglages.');
  if (status === 403) throw new SyncError("Le jeton GitHub n'a pas le droit d'écrire dans le dépôt (permission Contents : lecture et écriture).");
  if (status === 404) throw new SyncError('Dépôt introuvable ou inaccessible avec ce jeton.');
  throw new SyncError(`GitHub a répondu ${status}.`);
}

async function getRemote(repo: string, token: string): Promise<{ sha: string; payload: Payload } | null> {
  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${repo}/contents/${PATH}`, { headers: headers(token), cache: 'no-store' });
  } catch {
    throw new SyncError('Pas de connexion : synchro reportée.');
  }
  if (res.status === 404) {
    // Fichier absent (première synchro) ou dépôt inaccessible : on vérifie le dépôt
    const r = await fetch(`https://api.github.com/repos/${repo}`, { headers: headers(token), cache: 'no-store' }).catch(() => null);
    if (r && r.ok) return null;
    fail(r?.status ?? 404);
  }
  if (!res.ok) fail(res.status);
  const j: any = await res.json();
  let b64: string = j.content ?? '';
  if (!b64 && j.size > 0) {
    // Fichier de plus de 1 Mo : lecture via l'API des blobs
    const r = await fetch(`https://api.github.com/repos/${repo}/git/blobs/${j.sha}`, { headers: headers(token), cache: 'no-store' });
    if (!r.ok) fail(r.status);
    b64 = (await r.json()).content;
  }
  const p = JSON.parse(b64dec(b64));
  return { sha: j.sha, payload: { exercises: p.exercises ?? {}, workouts: p.workouts ?? [], logs: p.logs ?? [], tomb: p.tomb ?? {} } };
}

async function putRemote(repo: string, token: string, p: Payload, sha?: string): Promise<'ok' | 'conflict'> {
  const body = JSON.stringify({
    message: `Carnet : synchro ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    content: b64enc(JSON.stringify({ app: 'carnet-de-fonte', version: 1, ...p })),
    ...(sha ? { sha } : {}),
  });
  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${repo}/contents/${PATH}`, { method: 'PUT', headers: { ...headers(token), 'Content-Type': 'application/json' }, body });
  } catch {
    throw new SyncError('Pas de connexion : synchro reportée.');
  }
  if (res.status === 409 || res.status === 422) return 'conflict';
  if (!res.ok) fail(res.status);
  return 'ok';
}

/** Synchronise : lit la version du dépôt, fusionne, renvoie le résultat (et l'écrit si besoin). */
export async function syncData(repo: string, token: string | null, local: Payload, pristine: boolean): Promise<Payload> {
  if (!token) throw new SyncError('Ajoute ton jeton GitHub dans Réglages pour synchroniser.');
  for (let attempt = 0; attempt < 3; attempt++) {
    const remote = await getRemote(repo, token);
    if (!remote && pristine) return local; // rien à récupérer, et on n'envoie pas le programme d'exemple
    // Appareil neuf avec le programme d'exemple : on prend directement les données du compte
    const merged = remote && pristine ? merge(remote.payload, { exercises: {}, workouts: [], logs: [], tomb: {} }) : remote ? merge(local, remote.payload) : local;
    if (remote && canon(merged) === canon(remote.payload)) return merged;
    const r = await putRemote(repo, token, merged, remote?.sha);
    if (r === 'ok') return merged;
  }
  throw new SyncError('Conflit de synchro, réessaie dans un instant.');
}
