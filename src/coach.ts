import * as SecureStore from 'expo-secure-store';
import type { Data } from './types';
import { EQUIP, dayStr, fmt, logVolume } from './logic';

const KEY = 'openai_api_key';
export const getKey = () => SecureStore.getItemAsync(KEY);
export const setKey = (k: string) => (k ? SecureStore.setItemAsync(KEY, k) : SecureStore.deleteItemAsync(KEY));

export function dataContext(d: Data) {
  const name = (id: string, fb: string) => d.exercises[id]?.name ?? fb;
  const exs = Object.values(d.exercises)
    .map((e) => `- ${e.name} (${e.muscle}, ${EQUIP[e.equip]}) : charge de travail ${e.equip === 'pdc' && !e.load ? 'poids du corps' : fmt(e.load) + ' kg'}, pas ${fmt(e.step)} kg`)
    .join('\n');
  const wos = d.workouts.map((w) => `- ${w.name} : ${w.items.map((i) => `${name(i.ex, i.name)} ${i.sets}×${i.reps}`).join(', ')}`).join('\n');
  const logs = d.logs
    .slice(0, 15)
    .map(
      (l) =>
        `- ${dayStr(new Date(l.date))} ${l.workoutName} (${l.durationMin} min, ${Math.round(logVolume(l))} kg) : ` +
        l.entries
          .map((e) => `${name(e.ex, e.name)} ${e.sets.filter((s) => s.done).map((s) => `${fmt(s.kg)}×${s.r}`).join(',') || 'non fait'} (objectif ${e.target} reps)`)
          .join(' ; ') +
        (l.note ? ` — note : ${l.note}` : ''),
    )
    .join('\n');
  return `Date du jour : ${dayStr(new Date())}

EXERCICES ET CHARGES ACTUELLES
${exs || '(aucun)'}

SÉANCES TYPES
${wos || '(aucune)'}

DERNIÈRES SÉANCES (la plus récente d'abord, charge×reps des séries validées)
${logs || '(aucune séance enregistrée)'}`;
}

export const rules = (d: Data) =>
  `Tu es le coach de musculation de l'utilisateur, intégré à son carnet d'entraînement. Réponds en français, de façon concrète et directe, en t'appuyant sur ses données ci-dessous (charges en kg ; la charge de travail d'un exercice est la même dans toutes ses séances). Reste court (environ 200 mots maximum) sauf s'il demande un programme détaillé. N'utilise pas de tableaux. Quand tu proposes de changer une charge, écris-le sur une ligne au format « Exercice : X kg → Y kg ». Tu ne donnes pas d'avis médical : en cas de douleur, conseille de consulter.

${dataContext(d)}`;

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

export class CoachError extends Error {}

export async function askOpenAI(apiKey: string, model: string, system: string, chat: ChatMsg[], signal?: AbortSignal): Promise<string> {
  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, ...chat.slice(-12)] }),
      signal,
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    throw new CoachError('Pas de connexion internet : réessaie quand tu captes.');
  }
  const body: any = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) throw new CoachError('Clé OpenAI refusée : vérifie-la dans Réglages.');
    if (res.status === 429) throw new CoachError('Limite ou crédit OpenAI atteint : vérifie ton compte OpenAI (facturation) puis réessaie.');
    if (res.status === 404) throw new CoachError(`Modèle « ${model} » introuvable : change-le dans Réglages.`);
    throw new CoachError(body?.error?.message ?? `Erreur OpenAI (${res.status}).`);
  }
  const text: string | undefined = body?.choices?.[0]?.message?.content;
  if (!text) throw new CoachError('Réponse vide, réessaie.');
  return text.trim();
}
