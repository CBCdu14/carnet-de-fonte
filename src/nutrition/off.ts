import type { Food } from '../types';

/** Recherche de produits dans Open Food Facts (base collaborative gratuite). Valeurs pour 100 g. */
export async function searchOFF(q: string, signal?: AbortSignal): Promise<Food[]> {
  const url =
    'https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=20&lc=fr&cc=fr' +
    '&fields=code,product_name,product_name_fr,brands,nutriments,serving_quantity' +
    '&search_terms=' +
    encodeURIComponent(q);
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Recherche indisponible');
  const j: any = await res.json();
  const out: Food[] = [];
  for (const p of j.products ?? []) {
    const n = p.nutriments ?? {};
    const kcal = Number(n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : NaN));
    const name = (p.product_name_fr || p.product_name || '').trim();
    if (!name || !isFinite(kcal)) continue;
    const brand = String(p.brands ?? '').split(',')[0].trim();
    const serving = Number(p.serving_quantity);
    out.push({
      id: 'off:' + p.code,
      name: brand ? `${name} (${brand})` : name,
      kcal: Math.round(kcal),
      p: Math.round(Number(n.proteins_100g ?? 0) * 10) / 10,
      c: Math.round(Number(n.carbohydrates_100g ?? 0) * 10) / 10,
      f: Math.round(Number(n.fat_100g ?? 0) * 10) / 10,
      cat: 'Produits',
      ...(serving > 0 && serving < 2000 ? { unit: { name: 'portion', g: serving } } : {}),
    });
  }
  return out;
}
