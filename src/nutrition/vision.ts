import { CoachError } from '../coach';

export interface PhotoItem {
  name: string;
  g: number;
  kcal: number;
  p: number;
  c: number;
  f: number;
}
export interface PhotoResult {
  items: PhotoItem[];
  comment: string;
}

const PROMPT = `Tu es nutritionniste. Analyse la photo de ce repas.
Pour chaque aliment visible, estime la quantité en grammes telle que servie (cuite si l'aliment est cuit) en t'aidant des repères visuels (taille de l'assiette, des couverts, épaisseur), puis les calories et macronutriments pour cette quantité.
Compte les sauces, l'huile visible et les accompagnements. Si un aliment est incertain, donne ta meilleure estimation et signale-le dans le commentaire.
Réponds uniquement en JSON, sans texte autour, au format :
{"items":[{"name":"Riz blanc cuit","g":180,"kcal":234,"p":4.9,"c":50,"f":0.5}],"comment":"Une phrase courte : niveau de confiance, ce qui est difficile à estimer."}
Noms en français, simples. Si ce n'est pas de la nourriture, renvoie {"items":[],"comment":"…"}.`;

/** Analyse une photo d'assiette avec le modèle OpenAI (vision). */
export async function analyzeMeal(apiKey: string, model: string, dataUrl: string, hint: string, signal?: AbortSignal): Promise<PhotoResult> {
  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT + (hint.trim() ? `\nPrécision de l'utilisateur : ${hint.trim()}` : '') },
              { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
            ],
          },
        ],
      }),
      signal,
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    throw new CoachError('Pas de connexion : réessaie quand tu captes.');
  }
  const body: any = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) throw new CoachError('Clé OpenAI refusée : vérifie-la dans Réglages.');
    if (res.status === 429) throw new CoachError('Limite ou crédit OpenAI atteint.');
    throw new CoachError(body?.error?.message ?? `Erreur OpenAI (${res.status}).`);
  }
  const text: string = body?.choices?.[0]?.message?.content ?? '';
  let j: any;
  try {
    j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  } catch {
    throw new CoachError("Réponse illisible, reprends la photo.");
  }
  const num = (x: any) => (isFinite(Number(x)) ? Math.max(0, Number(x)) : 0);
  const items: PhotoItem[] = (Array.isArray(j.items) ? j.items : [])
    .map((i: any) => ({ name: String(i.name ?? 'Aliment'), g: Math.round(num(i.g)), kcal: num(i.kcal), p: num(i.p), c: num(i.c), f: num(i.f) }))
    .filter((i: PhotoItem) => i.kcal > 0 || i.g > 0);
  return { items, comment: String(j.comment ?? '') };
}
