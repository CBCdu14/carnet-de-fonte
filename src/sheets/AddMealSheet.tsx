import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Btn, Card, Chip, Field, H2, Meta, Sheet, Body } from '../ui';
import type { Food, MealItem, Recipe, Slot } from '../types';
import { SLOTS, foodMacros, recipeMacros, type Macros } from '../nutrition/calc';
import { searchFoods } from '../nutrition/foods';
import { searchOFF } from '../nutrition/off';
import { parseNum } from '../logic';
import { pickPhoto } from '../platform/photo';
import { analyzeMeal, type PhotoItem } from '../nutrition/vision';
import { getKey } from '../coach';

const QUICK: [string, number, number][] = [
  ['Restaurant (plat)', 800, 35],
  ['Burger + frites', 1100, 40],
  ['Pizza entière', 950, 40],
  ['Sandwich jambon-beurre', 500, 22],
  ['Kebab frites', 1100, 45],
  ['Salade composée', 550, 25],
  ['Sushis (12 pièces)', 600, 25],
  ['Sushis (24 pièces)', 1150, 45],
  ['Barbecue (merguez, chorizo)', 1000, 40],
  ['Buffet chinois', 1100, 40],
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
  const [tab, setTab] = useState<'photo' | 'recipe' | 'food' | 'quick'>(recipe0 ? 'recipe' : 'photo');
  const [photo, setPhoto] = useState<string | null>(null);
  const [pItems, setPItems] = useState<(PhotoItem & { gt: string; on: boolean })[]>([]);
  const [pComment, setPComment] = useState('');
  const [pBusy, setPBusy] = useState(false);
  const [pErr, setPErr] = useState('');
  const [hint, setHint] = useState('');
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

  const analyze = async (img: string) => {
    const key = await getKey().catch(() => null);
    if (!key) return setPErr("Ajoute ta clé OpenAI dans Réglages pour analyser les photos.");
    setPBusy(true);
    setPErr('');
    setPItems([]);
    try {
      const r = await analyzeMeal(key, data.settings.model, img, hint);
      setPItems(r.items.map((i) => ({ ...i, gt: String(i.g), on: true })));
      setPComment(r.comment);
      if (!r.items.length) setPErr(r.comment || "Aucun aliment reconnu sur la photo.");
    } catch (e: any) {
      setPErr(e?.message ?? 'Analyse impossible, réessaie.');
    } finally {
      setPBusy(false);
    }
  };
  const takePhoto = async () => {
    try {
      const img = await pickPhoto();
      if (!img) return;
      setPhoto(img);
      analyze(img);
    } catch (e: any) {
      setPErr(e?.message ?? 'Photo impossible.');
    }
  };
  // Macros recalculées si on corrige les grammes
  const scaled = (i: PhotoItem & { gt: string }) => {
    const k = i.g > 0 ? parseNum(i.gt) / i.g : 1;
    return { kcal: i.kcal * k, p: i.p * k, c: i.c * k, f: i.f * k };
  };
  const pTotal = pItems.filter((i) => i.on).reduce((m, i) => { const x = scaled(i); return { kcal: m.kcal + x.kcal, p: m.p + x.p, c: m.c + x.c, f: m.f + x.f }; }, { kcal: 0, p: 0, c: 0, f: 0 });
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
        <Chip label="Photo" active={tab === 'photo'} onPress={() => setTab('photo')} />
        <Chip label="Recette" active={tab === 'recipe'} onPress={() => setTab('recipe')} />
        <Chip label="Aliment" active={tab === 'food'} onPress={() => setTab('food')} />
        <Chip label="Dehors" active={tab === 'quick'} onPress={() => setTab('quick')} />
      </View>

      {tab === 'photo' ? (
        <>
          {!photo ? <Meta>Prends ton assiette en photo, bien à plat et en entier : l'IA liste les aliments et estime les quantités. Tu corriges ensuite si besoin.</Meta> : null}
          <Field value={hint} onChangeText={setHint} placeholder="Précision (facultatif) : pâtes complètes…" />
          {photo ? <Image source={{ uri: photo }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 12 }} resizeMode="cover" /> : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label={photo ? 'Reprendre une photo' : 'Prendre une photo'} kind={photo ? 'ghost' : 'primary'} onPress={takePhoto} disabled={pBusy} style={{ flex: 1 }} />
            {photo && !pBusy ? <Btn kind="ghost" label="Réanalyser" onPress={() => analyze(photo)} /> : null}
          </View>
          {pBusy ? (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <ActivityIndicator color={t.accent} />
              <Meta>Analyse de l'assiette…</Meta>
            </View>
          ) : null}
          {pErr ? <Meta style={{ color: t.bad }}>{pErr}</Meta> : null}
          {pItems.length ? (
            <>
              <Card pad={false}>
                {pItems.map((i, k) => {
                  const x = scaled(i);
                  return (
                    <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingRight: 10, marginLeft: 12, borderTopWidth: k ? 0.5 : 0, borderTopColor: t.line, opacity: i.on ? 1 : 0.4 }}>
                      <Pressable onPress={() => setPItems((xs) => xs.map((y, j) => (j === k ? { ...y, on: !y.on } : y)))} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: i.on }}>
                        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: i.on ? t.accent : t.line, backgroundColor: i.on ? t.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                          {i.on ? <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>✓</Text> : null}
                        </View>
                      </Pressable>
                      <View style={{ flex: 1 }}>
                        <Body style={{ fontSize: 16 }}>{i.name}</Body>
                        <Meta style={{ fontSize: 13 }}>
                          {Math.round(x.kcal)} kcal · P {Math.round(x.p)} g
                        </Meta>
                      </View>
                      <TextInput
                        value={i.gt}
                        onChangeText={(v) => setPItems((xs) => xs.map((y, j) => (j === k ? { ...y, gt: v } : y)))}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                        style={{ width: 62, textAlign: 'right', color: t.ink, fontSize: 16, backgroundColor: t.sunk, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8 }}
                      />
                      <Meta>g</Meta>
                    </View>
                  );
                })}
              </Card>
              {pComment ? <Meta style={{ fontSize: 13 }}>{pComment}</Meta> : null}
              <Card style={{ gap: 2 }}>
                <Meta style={{ fontSize: 13 }}>Total</Meta>
                <MacroLine m={pTotal} />
              </Card>
              <Btn
                label="Ajouter ce repas"
                disabled={!pItems.some((i) => i.on)}
                onPress={() => {
                  for (const i of pItems.filter((x) => x.on)) {
                    const x = scaled(i);
                    addMeal(date, slot, which, { kind: 'quick', qty: 1, label: `${i.name} (${Math.round(parseNum(i.gt))} g)`, kcal: Math.round(x.kcal), p: Math.round(x.p * 10) / 10, c: Math.round(x.c * 10) / 10, f: Math.round(x.f * 10) / 10 });
                  }
                  onClose();
                }}
              />
              <Meta style={{ fontSize: 13 }}>Estimation par IA : les quantités peuvent varier de 20 à 30 %. Corrige les grammes si tu les connais.</Meta>
            </>
          ) : null}
        </>
      ) : null}

      {tab !== 'quick' && tab !== 'photo' ? <Field value={q} onChangeText={(v) => { setQ(v); setOnline(null); }} placeholder={tab === 'recipe' ? 'Chercher une recette' : 'Chercher un aliment (poulet, skyr…)'} autoCorrect={false} /> : null}

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
