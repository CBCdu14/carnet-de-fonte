import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Btn, Card, Chip, Field, H2, Meta, Sheet, Body } from '../ui';
import type { Food, MealItem, Recipe, Slot } from '../types';
import { SLOTS, foodMacros, recipeMacros, type Macros } from '../nutrition/calc';
import { searchFoods } from '../nutrition/foods';
import { searchOFF } from '../nutrition/off';
import { parseNum } from '../logic';

const QUICK: [string, number, number][] = [
  ['Restaurant (plat)', 800, 35],
  ['Burger + frites', 1100, 40],
  ['Pizza entière', 950, 40],
  ['Sandwich jambon-beurre', 500, 22],
  ['Kebab frites', 1100, 45],
  ['Salade composée', 550, 25],
  ['Sushis (12 pièces)', 600, 25],
  ['Plat de cantine', 700, 30],
];

export const fmtM = (m: Macros) => `${Math.round(m.kcal)} kcal · ${Math.round(m.p)} g prot`;

export function MacroLine({ m }: { m: Macros }) {
  return (
    <Meta style={{ fontSize: 14 }}>
      {Math.round(m.kcal)} kcal · P {Math.round(m.p)} g · G {Math.round(m.c)} g · L {Math.round(m.f)} g
    </Meta>
  );
}

function Row({ title, sub, onPress, selected }: { title: string; sub: string; onPress: () => void; selected?: boolean }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {({ pressed }) => (
        <View style={{ paddingVertical: 10, paddingRight: 14, marginLeft: 14, borderBottomWidth: 0.5, borderBottomColor: t.line, opacity: pressed ? 0.5 : 1, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Body style={{ fontSize: 16, color: selected ? t.accent : t.ink }}>{title}</Body>
            <Meta style={{ fontSize: 13 }}>{sub}</Meta>
          </View>
          {selected ? <Text style={{ color: t.accent, fontSize: 18 }}>✓</Text> : null}
        </View>
      )}
    </Pressable>
  );
}

export function AddMealSheet({
  date,
  slot: slot0,
  which: which0,
  recipe: recipe0,
  onClose,
}: {
  date: string;
  slot: Slot;
  which: 'plan' | 'eaten';
  recipe?: Recipe;
  onClose: () => void;
}) {
  const t = useTheme();
  const { data, addMeal, saveFood } = useStore();
  const [tab, setTab] = useState<'recipe' | 'food' | 'quick'>(recipe0 ? 'recipe' : 'recipe');
  const [slot, setSlot] = useState<Slot>(slot0);
  const [which, setWhich] = useState(which0);
  const [q, setQ] = useState('');
  const [recipe, setRecipe] = useState<Recipe | undefined>(recipe0);
  const [portions, setPortions] = useState(1);
  const [food, setFood] = useState<Food | undefined>();
  const [grams, setGrams] = useState('100');
  const [online, setOnline] = useState<Food[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [onlineErr, setOnlineErr] = useState('');
  const [qLabel, setQLabel] = useState('');
  const [qKcal, setQKcal] = useState('');
  const [qProt, setQProt] = useState('');
  const ctl = useRef<AbortController | null>(null);

  const recipes = useMemo(() => {
    const n = q.trim().toLowerCase();
    return data.recipes.filter((r) => !n || r.name.toLowerCase().includes(n)).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [data.recipes, q]);
  const foods = useMemo(() => searchFoods(q, data.foods).slice(0, 40), [q, data.foods]);

  const done = (item: Omit<MealItem, 'id'>) => {
    addMeal(date, slot, which, item);
    onClose();
  };
  const searchOnline = async () => {
    if (q.trim().length < 3) return setOnlineErr('Tape au moins 3 lettres.');
    ctl.current?.abort();
    ctl.current = new AbortController();
    setLoading(true);
    setOnlineErr('');
    try {
      const r = await searchOFF(q.trim(), ctl.current.signal);
      setOnline(r);
      if (!r.length) setOnlineErr('Aucun produit trouvé.');
    } catch (e: any) {
      if (e?.name !== 'AbortError') setOnlineErr('Recherche en ligne indisponible (pas de réseau ?).');
    } finally {
      setLoading(false);
    }
  };

  const g = parseNum(grams);
  return (
    <Sheet visible onClose={onClose}>
      <H2>Ajouter</H2>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {SLOTS.map((s) => (
          <Chip key={s.id} label={s.label} active={slot === s.id} onPress={() => setSlot(s.id)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', backgroundColor: t.sunk, borderRadius: 9, padding: 2 }}>
        {(['eaten', 'plan'] as const).map((w) => (
          <Pressable key={w} onPress={() => setWhich(w)} style={{ flex: 1, paddingVertical: 7, borderRadius: 7, backgroundColor: which === w ? t.surface : 'transparent', alignItems: 'center' }}>
            <Text style={{ color: t.ink, fontWeight: which === w ? '600' : '400', fontSize: 14 }}>{w === 'eaten' ? 'Mangé' : 'Prévu'}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Chip label="Recette" active={tab === 'recipe'} onPress={() => setTab('recipe')} />
        <Chip label="Aliment" active={tab === 'food'} onPress={() => setTab('food')} />
        <Chip label="Rapide / dehors" active={tab === 'quick'} onPress={() => setTab('quick')} />
      </View>

      {tab !== 'quick' ? <Field value={q} onChangeText={(v) => { setQ(v); setOnline(null); }} placeholder={tab === 'recipe' ? 'Chercher une recette' : 'Chercher un aliment (poulet, skyr…)'} autoCorrect={false} /> : null}

      {tab === 'recipe' ? (
        <>
          <Card pad={false}>
            <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {recipes.map((r) => (
              <Row key={r.id} title={r.name} sub={`${fmtM(recipeMacros(r, data.foods))} / portion · ${r.minutes} min`} selected={recipe?.id === r.id} onPress={() => setRecipe(r)} />
            ))}
            {!recipes.length ? <Meta style={{ padding: 14 }}>Aucune recette. Crée-la dans l'onglet Recettes.</Meta> : null}
            </ScrollView>
          </Card>
          {recipe ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Meta>Portions</Meta>
                {[0.5, 1, 1.5, 2].map((p) => (
                  <Chip key={p} label={String(p).replace('.', ',')} active={portions === p} onPress={() => setPortions(p)} />
                ))}
              </View>
              <Meta>{fmtM({ ...recipeMacros(recipe, data.foods), kcal: recipeMacros(recipe, data.foods).kcal * portions, p: recipeMacros(recipe, data.foods).p * portions })}</Meta>
              <Btn label="Ajouter" onPress={() => done({ kind: 'recipe', ref: recipe.id, qty: portions })} />
            </View>
          ) : null}
        </>
      ) : null}

      {tab === 'food' ? (
        <>
          <Card pad={false}>
            <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {(online ?? foods).map((f) => (
              <Row key={f.id} title={f.name} sub={`${Math.round(f.kcal)} kcal · ${f.p} g prot / 100 g`} selected={food?.id === f.id} onPress={() => { setFood(f); setGrams(String(f.unit?.g ?? 100)); }} />
            ))}
            {!(online ?? foods).length && !loading ? <Meta style={{ padding: 14 }}>Rien dans la liste de base.</Meta> : null}
            </ScrollView>
          </Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {online ? <Btn small kind="ghost" label="Revenir à la liste de base" onPress={() => setOnline(null)} /> : <Btn small kind="ghost" label="Chercher en ligne (Open Food Facts)" onPress={searchOnline} />}
            {loading ? <ActivityIndicator color={t.accent} /> : null}
          </View>
          {onlineErr ? <Meta>{onlineErr}</Meta> : null}
          {food ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <View style={{ width: 120 }}>
                  <Field label="Quantité (g)" value={grams} onChangeText={setGrams} keyboardType="decimal-pad" selectTextOnFocus />
                </View>
                {food.unit
                  ? [1, 2, 3].map((n) => <Chip key={n} label={`${n} ${food.unit!.name}`} active={g === food.unit!.g * n} onPress={() => setGrams(String(food.unit!.g * n))} />)
                  : null}
              </View>
              <MacroLine m={foodMacros(food, g)} />
              <Btn
                label="Ajouter"
                disabled={!(g > 0)}
                onPress={() => {
                  if (food.id.startsWith('off:')) saveFood(food);
                  done({ kind: 'food', ref: food.id, qty: g, ...(food.id.startsWith('off:') ? { food } : {}) });
                }}
              />
            </View>
          ) : null}
        </>
      ) : null}

      {tab === 'quick' ? (
        <>
          <Meta>Repas pris dehors : estimation moyenne, ajustable.</Meta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {QUICK.map(([l, k, p]) => (
              <Chip key={l} label={`${l} · ${k}`} active={qLabel === l} onPress={() => { setQLabel(l); setQKcal(String(k)); setQProt(String(p)); }} />
            ))}
          </View>
          <Field label="Nom" value={qLabel} onChangeText={setQLabel} placeholder="Restaurant, snack…" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field label="Calories (kcal)" value={qKcal} onChangeText={setQKcal} keyboardType="number-pad" />
            <Field label="Protéines (g)" value={qProt} onChangeText={setQProt} keyboardType="number-pad" />
          </View>
          <Btn
            label="Ajouter"
            disabled={!(parseNum(qKcal) > 0)}
            onPress={() => {
              const k = parseNum(qKcal), p = parseNum(qProt);
              // Répartition par défaut du reste : moitié glucides, moitié lipides (en kcal)
              const rest = Math.max(0, k - p * 4);
              done({ kind: 'quick', qty: 1, label: qLabel || 'Repas', kcal: k, p, c: Math.round(rest / 2 / 4), f: Math.round(rest / 2 / 9) });
            }}
          />
        </>
      ) : null}
    </Sheet>
  );
}
