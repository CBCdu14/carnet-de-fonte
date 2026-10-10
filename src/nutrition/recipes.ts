import type { Recipe } from '../types';

/* Recettes de départ : rapides (≤ 20 min) et riches en protéines. Quantités crues, par recette. */
const r = (id: string, name: string, servings: number, minutes: number, tags: string[], ing: [string, number][], steps: string): Recipe => ({
  id: 'r:' + id,
  name,
  servings,
  minutes,
  tags,
  ingredients: ing.map(([food, g]) => ({ food: 'b:' + food, g })),
  steps,
  u: 0,
});

export const SEED_RECIPES: Recipe[] = [
  r('bowl_poulet', 'Bowl poulet, riz, brocoli', 1, 20, ['déjeuner', 'dîner'], [['poulet', 150], ['riz', 70], ['brocoli', 150], ['huile', 5], ['sauce_soja', 10]],
    'Cuire le riz. Couper le poulet en dés et le saisir 6-8 min à la poêle avec l\'huile. Cuire le brocoli à la vapeur ou au micro-ondes (4 min). Servir avec la sauce soja.'),
  r('omelette', 'Omelette jambon-fromage et pain complet', 1, 10, ['petit-déj', 'dîner'], [['oeuf', 180], ['jambon', 40], ['emmental', 15], ['pain', 35]],
    'Battre les 3 œufs, ajouter le jambon en lanières et le fromage. Cuire 3-4 min à la poêle. Servir avec une tranche de pain.'),
  r('skyr_bowl', 'Skyr, avoine et fruits rouges', 1, 3, ['petit-déj', 'collation'], [['skyr', 200], ['avoine', 40], ['fruits_rouges', 100], ['miel', 8]],
    'Mélanger le skyr et les flocons, ajouter les fruits rouges et le miel.'),
  r('wrap_dinde', 'Wrap dinde avocat', 1, 12, ['déjeuner'], [['tortilla', 60], ['dinde', 120], ['avocat', 50], ['salade', 30], ['tomate', 60]],
    'Griller la dinde en lanières 5 min. Garnir la tortilla de salade, tomate, avocat écrasé et dinde. Rouler.'),
  r('bolo', 'Pâtes bolognaise maigre', 2, 20, ['déjeuner', 'dîner', 'batch'], [['pates', 160], ['boeuf5', 300], ['sauce_tomate', 300], ['oignon', 80], ['parmesan', 20]],
    'Cuire les pâtes. Faire revenir l\'oignon puis le bœuf haché 5 min, ajouter la sauce tomate et laisser mijoter 10 min. Servir avec le parmesan.'),
  r('saumon_pd', 'Saumon, patate douce, haricots verts', 1, 20, ['dîner'], [['saumon', 130], ['patate_douce', 200], ['haricots_verts', 150]],
    'Couper la patate douce en dés et la cuire 8 min au micro-ondes. Cuire le saumon 4 min par face à la poêle. Haricots verts à la vapeur.'),
  r('salade_thon', 'Salade thon, pois chiches, feta', 1, 8, ['déjeuner'], [['thon', 112], ['pois_chiches', 120], ['tomate', 100], ['concombre', 100], ['feta', 30], ['huile', 5]],
    'Tout couper et mélanger. Assaisonner avec l\'huile, sel, poivre, citron.'),
  r('shaker', 'Shaker whey, lait et kiwi', 1, 2, ['collation'], [['whey', 30], ['lait', 250], ['kiwi', 150]],
    'Secouer la whey et le lait, manger les kiwis à côté.'),
  r('cabillaud_quinoa', 'Cabillaud, quinoa et légumes', 1, 20, ['dîner'], [['cabillaud', 180], ['quinoa', 60], ['courgette', 150], ['poivron', 100], ['huile', 5]],
    'Cuire le quinoa 12 min. Poêler courgette et poivron 8 min avec l\'huile, ajouter le cabillaud 3 min par face.'),
  r('curry_lentilles', 'Curry express lentilles épinards', 2, 15, ['déjeuner', 'dîner', 'batch'], [['lentilles', 400], ['sauce_tomate', 200], ['oignon', 80], ['epinards', 100], ['riz', 120], ['huile', 10], ['skyr', 100]],
    'Cuire le riz. Faire revenir l\'oignon avec curry, ajouter lentilles et sauce tomate 8 min, puis les épinards 2 min. Hors du feu, ajouter le skyr pour le côté crémeux.'),
  r('fromage_blanc', 'Fromage blanc, pomme, amandes', 1, 2, ['collation'], [['fb0', 200], ['pomme', 150], ['amandes', 15]],
    'Couper la pomme, ajouter au fromage blanc avec les amandes.'),
  r('tofu_saute', 'Tofu sauté, riz et poivrons', 1, 15, ['dîner'], [['tofu', 150], ['riz', 70], ['poivron', 120], ['sauce_soja', 15], ['huile', 5]],
    'Cuire le riz. Dorer le tofu en dés 6 min, ajouter les poivrons 5 min puis la sauce soja.'),
];
