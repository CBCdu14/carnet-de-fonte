import type { Food } from '../types';

/* Aliments de base : valeurs moyennes pour 100 g (ordre de grandeur des tables Ciqual), produits crus sauf mention. */
type Row = [string, string, string, number, number, number, number, [string, number]?];
const ROWS: Row[] = [
  // Viandes, poissons, œufs
  ['poulet', 'Blanc de poulet (cru)', 'Viandes et poissons', 110, 23, 0, 1.8],
  ['dinde', 'Escalope de dinde (crue)', 'Viandes et poissons', 105, 23, 0, 1.2],
  ['boeuf5', 'Bœuf haché 5 % MG (cru)', 'Viandes et poissons', 125, 21, 0, 5],
  ['boeuf15', 'Bœuf haché 15 % MG (cru)', 'Viandes et poissons', 215, 18, 0, 15],
  ['jambon', 'Jambon blanc découenné', 'Viandes et poissons', 110, 21, 1, 3, ['tranche', 40]],
  ['saumon', 'Saumon (cru)', 'Viandes et poissons', 200, 20, 0, 13],
  ['cabillaud', 'Cabillaud (cru)', 'Viandes et poissons', 80, 18, 0, 0.7],
  ['thon', 'Thon au naturel (égoutté)', 'Viandes et poissons', 115, 26, 0, 1, ['boîte', 112]],
  ['crevettes', 'Crevettes cuites', 'Viandes et poissons', 95, 21, 0, 1.2],
  ['oeuf', 'Œuf entier', 'Viandes et poissons', 140, 12.5, 0.5, 10, ['œuf', 60]],
  ['blanc_oeuf', "Blanc d'œuf", 'Viandes et poissons', 48, 11, 0.7, 0.2],
  ['tofu', 'Tofu ferme', 'Viandes et poissons', 130, 14, 2, 8],
  ['poulet_kebab', 'Poulet façon kebab (barquette)', 'Viandes et poissons', 160, 22, 2, 7.5],
  ['cordon_bleu', 'Cordon-bleu de poulet', 'Viandes et poissons', 230, 14, 14, 13, ['pièce', 100]],
  ['steak', 'Steak haché 5 % MG (cru)', 'Viandes et poissons', 125, 21, 0, 5, ['steak', 125]],
  // Produits laitiers
  ['skyr', 'Skyr nature', 'Produits laitiers', 60, 10.5, 4, 0.2, ['pot', 150]],
  ['fb0', 'Fromage blanc 0 %', 'Produits laitiers', 47, 7.5, 4, 0.1],
  ['fb3', 'Fromage blanc 3 %', 'Produits laitiers', 80, 7, 4, 3.4],
  ['yaourt', 'Yaourt nature', 'Produits laitiers', 50, 4, 5, 1.5, ['pot', 125]],
  ['lait', 'Lait demi-écrémé', 'Produits laitiers', 46, 3.3, 4.8, 1.6],
  ['emmental', 'Emmental râpé', 'Produits laitiers', 380, 28, 0.5, 29],
  ['mozza', 'Mozzarella', 'Produits laitiers', 250, 18, 1, 19],
  ['parmesan', 'Parmesan', 'Produits laitiers', 400, 33, 0, 29],
  ['feta', 'Feta', 'Produits laitiers', 265, 14, 1, 22],
  ['creme15', 'Crème fraîche légère 15 %', 'Produits laitiers', 160, 2.5, 4, 15],
  ['whey', 'Whey (protéine en poudre)', 'Produits laitiers', 380, 78, 6, 5, ['dose', 30]],
  // Féculents
  ['riz', 'Riz blanc (cru)', 'Féculents', 355, 7, 78, 0.6],
  ['riz_cuit', 'Riz blanc (cuit)', 'Féculents', 130, 2.7, 28, 0.3],
  ['pates', 'Pâtes (crues)', 'Féculents', 355, 12.5, 71, 1.5],
  ['pates_cuites', 'Pâtes (cuites)', 'Féculents', 150, 5.5, 30, 0.9],
  ['pates_completes', 'Pâtes complètes (crues)', 'Féculents', 350, 13, 64, 2.5],
  ['semoule', 'Semoule (crue)', 'Féculents', 360, 12, 73, 1.5],
  ['quinoa', 'Quinoa (cru)', 'Féculents', 370, 14, 64, 6],
  ['avoine', "Flocons d'avoine", 'Féculents', 370, 13.5, 59, 7],
  ['pain', 'Pain complet', 'Féculents', 245, 9, 44, 2.5, ['tranche', 35]],
  ['pain_mie', 'Pain de mie complet', 'Féculents', 250, 9, 43, 4, ['tranche', 25]],
  ['tortilla', 'Tortilla de blé', 'Féculents', 300, 8, 50, 7, ['tortilla', 60]],
  ['pdt', 'Pomme de terre (crue)', 'Féculents', 80, 2, 17, 0.1],
  ['patate_douce', 'Patate douce (crue)', 'Féculents', 86, 1.6, 20, 0.1],
  ['lentilles', 'Lentilles (cuites)', 'Féculents', 115, 9, 17, 0.5],
  ['pois_chiches', 'Pois chiches (cuits, égouttés)', 'Féculents', 140, 7.5, 18, 2.5],
  ['haricots_rouges', 'Haricots rouges (cuits)', 'Féculents', 115, 8, 16, 0.5],
  // Légumes et fruits
  ['brocoli', 'Brocoli', 'Légumes et fruits', 34, 2.8, 4, 0.4],
  ['courgette', 'Courgette', 'Légumes et fruits', 17, 1.2, 2.2, 0.3],
  ['haricots_verts', 'Haricots verts', 'Légumes et fruits', 31, 1.8, 4.3, 0.2],
  ['epinards', 'Épinards', 'Légumes et fruits', 23, 2.9, 1.4, 0.4],
  ['tomate', 'Tomate', 'Légumes et fruits', 18, 0.9, 2.6, 0.2],
  ['poivron', 'Poivron', 'Légumes et fruits', 26, 1, 4.5, 0.3],
  ['carotte', 'Carotte', 'Légumes et fruits', 36, 0.8, 7, 0.3],
  ['champignons', 'Champignons de Paris', 'Légumes et fruits', 22, 3, 0.5, 0.3],
  ['oignon', 'Oignon', 'Légumes et fruits', 40, 1.1, 8, 0.1],
  ['salade', 'Salade verte', 'Légumes et fruits', 15, 1.3, 1.5, 0.2],
  ['concombre', 'Concombre', 'Légumes et fruits', 13, 0.7, 2, 0.1],
  ['poelee', 'Poêlée de légumes (surgelée)', 'Légumes et fruits', 45, 2, 6, 1],
  ['banane', 'Banane', 'Légumes et fruits', 90, 1.1, 20, 0.3, ['banane', 120]],
  ['kiwi', 'Kiwi', 'Légumes et fruits', 60, 1, 11, 0.6, ['kiwi', 75]],
  ['peche', 'Pêche / nectarine', 'Légumes et fruits', 45, 1, 10, 0.3, ['fruit', 150]],
  ['compote', 'Compote sans sucres ajoutés', 'Légumes et fruits', 55, 0.3, 12, 0.1, ['gourde', 90]],
  ['pomme', 'Pomme', 'Légumes et fruits', 52, 0.3, 12, 0.2, ['pomme', 150]],
  ['fruits_rouges', 'Fruits rouges (surgelés)', 'Légumes et fruits', 45, 1, 8, 0.3],
  ['avocat', 'Avocat', 'Légumes et fruits', 160, 2, 1.8, 15, ['avocat', 150]],
  // Matières grasses, sauces, divers
  ['huile', "Huile d'olive", 'Divers', 900, 0, 0, 100, ['c. à soupe', 10]],
  ['beurre_cacahuete', 'Beurre de cacahuète', 'Divers', 600, 25, 12, 50, ['c. à soupe', 15]],
  ['amandes', 'Amandes', 'Divers', 600, 21, 7, 52],
  ['sauce_tomate', 'Sauce tomate nature', 'Divers', 50, 1.5, 8, 1],
  ['sauce_soja', 'Sauce soja', 'Divers', 60, 8, 6, 0, ['c. à soupe', 15]],
  ['miel', 'Miel', 'Divers', 320, 0.4, 80, 0, ['c. à café', 8]],
  ['choco_noir', 'Chocolat noir 70 %', 'Divers', 570, 8, 33, 43, ['carré', 10]],
  ['gateau_yaourt', 'Gâteau au yaourt maison', 'Divers', 360, 6, 50, 15, ['part', 70]],
];

export const BUILTIN_FOODS: Food[] = ROWS.map(([id, name, cat, kcal, p, c, f, unit]) => ({
  id: 'b:' + id,
  name,
  cat,
  kcal,
  p,
  c,
  f,
  ...(unit ? { unit: { name: unit[0], g: unit[1] } } : {}),
}));

const BY_ID = new Map(BUILTIN_FOODS.map((f) => [f.id, f]));
export function findFood(id: string, custom: Food[]): Food | undefined {
  return BY_ID.get(id) ?? custom.find((f) => f.id === id);
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export function searchFoods(q: string, custom: Food[]): Food[] {
  const n = norm(q.trim());
  const all = [...custom, ...BUILTIN_FOODS];
  if (!n) return all;
  return all.filter((f) => norm(f.name).includes(n));
}
