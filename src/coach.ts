import { secret } from './platform/secret';
import type { Data } from './types';
import { EQUIP, dayStr, fmt, logVolume } from './logic';
import { garminContext } from './garmin';
import { SLOTS, dayMacros, effectiveTargets, itemLabel } from './nutrition/calc';

const KEY = 'openai_api_key';
export const getKey = () => secret.get(KEY);
export const setKey = (k: string) => (k ? secret.set(KEY, k) : secret.remove(KEY));

export function dataContext(d: Data) {
  const name = (id: string, fb: string) => d.exercises[id]?.name ?? fb;
  const exs = Object.values(d.exercises)
    .map((e) => `- ${e.name} (${e.muscle}, ${EQUIP[e.equip]}) : charge de travail ${e.equip === 'pdc' && !e.load ? 'poids du corps' : fmt(e.load) + ' kg'}, pas ${fmt(e.step)} kg${e.setup ? `, réglages : ${e.setup}` : ''}`)
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
${logs || '(aucune séance enregistrée)'}${garminContext(d.garmin)}${nutritionContext(d)}`;
}

export const rules = (d: Data) =>
  `Tu es le coach de musculation et de nutrition de l'utilisateur, intégré à son carnet d'entraînement. Respecte ses consignes personnelles ci-dessous. Réponds en français, de façon concrète et directe, en t'appuyant sur ses données ci-dessous (charges en kg ; la charge de travail d'un exercice est la même dans toutes ses séances). Règle de progression de l'appli : chaque exercice a un objectif de reps entre un mini (8) et un maxi (15) ; quand toutes les séries atteignent l'objectif, il monte d'une rep (deux séances réussies au mini, puis une) ; au maxi réussi, la charge monte d'un pas et l'objectif repart au mini. Reste court (environ 200 mots maximum) sauf s'il demande un programme détaillé. N'utilise pas de tableaux. Quand tu proposes de changer une charge, écris-le sur une ligne au format « Exercice : X kg → Y kg ». Tu ne donnes pas d'avis médical : en cas de douleur, conseille de consulter.

${dataContext(d)}`;

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

export class CoachError extends Error {}

/** Message clair pour les erreurs OpenAI courantes. */
export function openAIError(status: number, body: any, model: string): CoachError {
  const code = body?.error?.code ?? body?.error?.type;
  if (status === 401) return new CoachError('Clé OpenAI refusée : vérifie-la dans Réglages.');
  if (code === 'insufficient_quota')
    return new CoachError("Pas de crédit API sur ton compte OpenAI. L'abonnement ChatGPT (Go, Plus…) ne compte pas : ajoute quelques euros sur platform.openai.com/settings/organization/billing. En attendant, utilise « Copier mes données » ci-dessous.");
  if (status === 429) return new CoachError('Trop de requêtes d\'un coup : patiente une minute puis réessaie.');
  if (status === 404) return new CoachError(`Modèle « ${model} » introuvable : change-le dans Réglages.`);
  return new CoachError(body?.error?.message ?? `Erreur OpenAI (${status}).`);
}

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
  if (!res.ok) throw openAIError(res.status, body, model);
  const text: string | undefined = body?.choices?.[0]?.message?.content;
  if (!text) throw new CoachError('Réponse vide, réessaie.');
  return text.trim();
}

function nutritionContext(d: Data) {
  if (!d.days?.length && !d.nutri) return '';
  const n = effectiveTargets(d);
  const recent = [...(d.days ?? [])]
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 5)
    .map((day) => {
      const m = dayMacros(day, 'eaten', d);
      const meals = SLOTS.flatMap((s) => (day.eaten[s.id] ?? []).map((it) => itemLabel(it, d))).join(', ');
      return m.kcal ? `- ${day.id} : ${Math.round(m.kcal)} kcal, P ${Math.round(m.p)} g, G ${Math.round(m.c)} g, L ${Math.round(m.f)} g (${meals})` : '';
    })
    .filter(Boolean)
    .join('\n');
  return `

NUTRITION
Consignes personnelles : ${d.nutri?.notes || '(aucune)'}
Repères du jour : ${Math.round(n.kcal)} kcal, protéines ${Math.round(n.p)} g, glucides ${Math.round(n.c)} g, lipides ${Math.round(n.f)} g
Recettes enregistrées : ${(d.recipes ?? []).map((r) => r.name).join(', ') || '(aucune)'}
Derniers jours notés :
${recent || '(rien de noté)'}`;
}

/** Adapte les exercices de la séance à une zone à cibler (une seule requête pour toute la séance). */
export async function focusSession(
  apiKey: string,
  model: string,
  zone: string,
  exercises: { id: string; name: string; desc: string }[],
  notes: string,
  signal?: AbortSignal,
): Promise<{ general: string; tips: Record<string, string> }> {
  const list = exercises.map((e, i) => `${i + 1}. ${e.name} (${e.desc})`).join('\n');
  const prompt = `Tu es coach de musculation. Séance du jour, dans l'ordre :
${list}

L'utilisateur veut solliciter davantage : ${zone}.
Pour chaque exercice, donne UNE consigne courte (25 mots maximum) pour orienter l'exercice vers cette zone SANS changer de machine ni d'exercice : position, prise, écartement, amplitude, tempo, contraction volontaire. Si l'exercice ne s'y prête pas, écris exactement "Pas d'adaptation utile, fais-le normalement."
Ajoute "general" : 1 à 2 phrases, avec si pertinent UN exercice simple sans matériel lourd à ajouter en fin de séance (séries et répétitions).
Sécurité : pour le bas du dos, privilégie le dos neutre, le gainage et les charges modérées, jamais de flexion du dos chargée. Pas d'avis médical.
${notes ? `Consignes de l'utilisateur : ${notes}\n` : ''}Réponds uniquement en JSON : {"general":"…","tips":{"1":"consigne exercice 1","2":"…"}}`;
  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] }),
      signal,
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    throw new CoachError('Pas de connexion : réessaie quand tu captes.');
  }
  const body: any = await res.json().catch(() => null);
  if (!res.ok) throw openAIError(res.status, body, model);
  const text: string = body?.choices?.[0]?.message?.content ?? '';
  let j: any;
  try {
    j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  } catch {
    throw new CoachError('Réponse illisible, réessaie.');
  }
  const tips: Record<string, string> = {};
  exercises.forEach((e, i) => {
    const t = j?.tips?.[String(i + 1)] ?? j?.tips?.[e.name];
    if (t) tips[e.id] = String(t);
  });
  return { general: String(j?.general ?? ''), tips };
}
