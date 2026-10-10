import type { Data, DayPlan, Food, MealItem, NutriTargets, Recipe, Slot } from '../types';
import { findFood } from './foods';
import { dayStr } from '../logic';

export interface Macros {
  kcal: number;
  p: number;
  c: number;
  f: number;
}
export const ZERO: Macros = { kcal: 0, p: 0, c: 0, f: 0 };
export const add = (a: Macros, b: Macros): Macros => ({ kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f });
export const scale = (m: Macros, k: number): Macros => ({ kcal: m.kcal * k, p: m.p * k, c: m.c * k, f: m.f * k });

export const SLOTS: { id: Slot; label: string }[] = [
  { id: 'pdj', label: 'Petit-déjeuner' },
  { id: 'dej', label: 'Déjeuner' },
  { id: 'col', label: 'Collation' },
  { id: 'din', label: 'Dîner' },
];

export const foodMacros = (food: Food, g: number): Macros => scale({ kcal: food.kcal, p: food.p, c: food.c, f: food.f }, g / 100);

/** Macros d'une portion de recette. */
export function recipeMacros(r: Recipe, foods: Food[]): Macros {
  let m = ZERO;
  for (const i of r.ingredients) {
    const f = findFood(i.food, foods);
    if (f) m = add(m, foodMacros(f, i.g));
  }
  return scale(m, 1 / Math.max(1, r.servings));
}

export function itemMacros(it: MealItem, d: Pick<Data, 'recipes' | 'foods'>): Macros {
  if (it.kind === 'quick') return { kcal: it.kcal ?? 0, p: it.p ?? 0, c: it.c ?? 0, f: it.f ?? 0 };
  if (it.kind === 'recipe') {
    const r = d.recipes.find((x) => x.id === it.ref);
    return r ? scale(recipeMacros(r, d.foods), it.qty) : ZERO;
  }
  const f = it.food ?? (it.ref ? findFood(it.ref, d.foods) : undefined);
  return f ? foodMacros(f, it.qty) : ZERO;
}

export function itemLabel(it: MealItem, d: Pick<Data, 'recipes' | 'foods'>): string {
  if (it.kind === 'quick') return it.label || 'Repas';
  if (it.kind === 'recipe') {
    const r = d.recipes.find((x) => x.id === it.ref);
    return `${r?.name ?? 'Recette supprimée'}${it.qty !== 1 ? ` × ${String(it.qty).replace('.', ',')}` : ''}`;
  }
  const f = it.food ?? (it.ref ? findFood(it.ref, d.foods) : undefined);
  if (f?.unit && Math.abs(it.qty / f.unit.g - Math.round(it.qty / f.unit.g)) < 0.01 && it.qty >= f.unit.g) {
    const n = Math.round(it.qty / f.unit.g);
    return `${f.name} · ${n} ${f.unit.name}${n > 1 && !f.unit.name.endsWith('s') ? 's' : ''}`;
  }
  return `${f?.name ?? 'Aliment'} · ${Math.round(it.qty)} g`;
}

export function slotMacros(items: MealItem[] | undefined, d: Pick<Data, 'recipes' | 'foods'>): Macros {
  return (items ?? []).reduce((m, it) => add(m, itemMacros(it, d)), ZERO);
}
export function dayMacros(day: DayPlan | undefined, which: 'plan' | 'eaten', d: Pick<Data, 'recipes' | 'foods'>): Macros {
  if (!day) return ZERO;
  return Object.values(day[which]).reduce((m, items) => add(m, slotMacros(items, d)), ZERO);
}

/* ---------- Objectifs ---------- */
export interface AutoTargets extends Macros {
  weight?: number;
  maintenance?: number;
  source: 'garmin' | 'estimation' | 'aucune';
}
/** Objectifs pour perdre du gras : dépense réelle (Garmin) − déficit, protéines 2 g/kg, lipides 0,8 g/kg, le reste en glucides. */
export function autoTargets(d: Data, deficitPct: number): AutoTargets {
  const weight = d.garmin?.weights.length ? d.garmin.weights[d.garmin.weights.length - 1].kg : d.nutri.weightKg;
  const recent = (d.garmin?.days ?? []).slice(-14).map((x) => x.kcal).filter((x): x is number => !!x && x > 1000);
  let maintenance: number | undefined;
  let source: AutoTargets['source'] = 'aucune';
  if (recent.length >= 5) {
    maintenance = recent.reduce((a, b) => a + b, 0) / recent.length;
    source = 'garmin';
  } else if (weight) {
    maintenance = weight * 31; // estimation pour une activité modérée (3 séances + marche)
    source = 'estimation';
  }
  if (!maintenance || !weight) return { ...d.nutri, weight, maintenance, source };
  const kcal = Math.max(1500, Math.round((maintenance * (1 - deficitPct / 100)) / 10) * 10);
  const p = Math.round(weight * 2);
  const f = Math.round(weight * 0.8);
  const c = Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4));
  return { kcal, p, c, f, weight, maintenance: Math.round(maintenance), source };
}

export const DEFAULT_TARGETS: NutriTargets = { kcal: 2200, p: 160, c: 220, f: 65, mode: 'auto', deficit: 15 };

/** Lundi de la semaine d'une date. */
export function mondayOf(date: Date) {
  const x = new Date(date);
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
export function weekDates(monday: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return dayStr(d);
  });
}

/* ---------- Liste de courses ---------- */
export interface ShopLine {
  food: Food;
  g: number;
}
export function shoppingList(days: DayPlan[], dates: string[], d: Pick<Data, 'recipes' | 'foods'>): ShopLine[] {
  const acc = new Map<string, ShopLine>();
  const addFood = (food: Food | undefined, g: number) => {
    if (!food || g <= 0) return;
    const cur = acc.get(food.id);
    if (cur) cur.g += g;
    else acc.set(food.id, { food, g });
  };
  for (const day of days) {
    if (!dates.includes(day.id)) continue;
    for (const items of Object.values(day.plan)) {
      for (const it of items ?? []) {
        if (it.kind === 'recipe') {
          const r = d.recipes.find((x) => x.id === it.ref);
          if (!r) continue;
          for (const ing of r.ingredients) addFood(findFood(ing.food, d.foods), (ing.g * it.qty) / Math.max(1, r.servings));
        } else if (it.kind === 'food') addFood(it.food ?? (it.ref ? findFood(it.ref, d.foods) : undefined), it.qty);
      }
    }
  }
  return [...acc.values()].sort((a, b) => (a.food.cat ?? 'zz').localeCompare(b.food.cat ?? 'zz') || a.food.name.localeCompare(b.food.name, 'fr'));
}

/** Objectifs effectifs (calcul auto ou valeurs saisies). */
export function effectiveTargets(d: Data): Macros {
  if (d.nutri.mode === 'auto') {
    const a = autoTargets(d, d.nutri.deficit);
    if (a.source !== 'aucune') return a;
  }
  return d.nutri;
}
