import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Btn, Card, Chip, Field, H2, H3, Meta, Sheet, Body, useNav } from '../ui';
import type { Ingredient, Recipe } from '../types';
import { foodMacros, recipeMacros } from '../nutrition/calc';
import { findFood, searchFoods } from '../nutrition/foods';
import { MacroLine } from './AddMealSheet';
import { parseNum } from '../logic';

/** Fiche recette (lecture) avec accès à l'édition. */
export function RecipeSheet({ id, onClose, onAdd }: { id: string | null; onClose: () => void; onAdd: (r: Recipe) => void }) {
  const { data, deleteRecipe } = useStore();
  const { toast } = useNav();
  const t = useTheme();
  const r = id ? data.recipes.find((x) => x.id === id) : undefined;
  const [editing, setEditing] = useState(!id);
  const [confirm, setConfirm] = useState(false);
  if (editing) return <RecipeEditor recipe={r} onClose={() => (r ? setEditing(false) : onClose())} onSaved={onClose} />;
  if (!r) return null;
  const m = recipeMacros(r, data.foods);
  return (
    <Sheet visible onClose={onClose}>
      <H2>{r.name}</H2>
      <Meta>
        {r.servings} portion{r.servings > 1 ? 's' : ''} · {r.minutes} min
      </Meta>
      <Card style={{ gap: 4 }}>
        <Meta style={{ fontSize: 13 }}>Par portion</Meta>
        <Text style={{ color: t.ink, fontSize: 28, fontWeight: '700' }}>{Math.round(m.kcal)} kcal</Text>
        <MacroLine m={m} />
      </Card>
      <H3>Ingrédients{r.servings > 1 ? ` (pour ${r.servings})` : ''}</H3>
      <Card pad={false}>
        {r.ingredients.map((i, k) => {
          const f = findFood(i.food, data.foods);
          return (
            <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, paddingRight: 14, marginLeft: 14, borderTopWidth: k ? 0.5 : 0, borderTopColor: t.line }}>
              <Body style={{ fontSize: 16, flex: 1 }}>{f?.name ?? 'Aliment inconnu'}</Body>
              <Meta>{Math.round(i.g)} g</Meta>
            </View>
          );
        })}
      </Card>
      {r.steps ? (
        <>
          <H3>Préparation</H3>
          <Body style={{ fontSize: 16 }}>{r.steps}</Body>
        </>
      ) : null}
      <Btn label="Ajouter à un repas" onPress={() => onAdd(r)} />
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
        <Btn small kind="ghost" label="Modifier" onPress={() => setEditing(true)} />
        <Btn
          small
          kind={confirm ? 'danger' : 'ghost'}
          label={confirm ? 'Confirmer la suppression' : 'Supprimer'}
          onPress={() => {
            if (!confirm) return setConfirm(true);
            deleteRecipe(r.id);
            toast('Recette supprimée');
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}

function RecipeEditor({ recipe, onClose, onSaved }: { recipe?: Recipe; onClose: () => void; onSaved: () => void }) {
  const t = useTheme();
  const { data, saveRecipe } = useStore();
  const { toast } = useNav();
  const [name, setName] = useState(recipe?.name ?? '');
  const [servings, setServings] = useState(recipe?.servings ?? 1);
  const [minutes, setMinutes] = useState(String(recipe?.minutes ?? 15));
  const [steps, setSteps] = useState(recipe?.steps ?? '');
  const [ings, setIngs] = useState<(Ingredient & { gt: string })[]>((recipe?.ingredients ?? []).map((i) => ({ ...i, gt: String(i.g) })));
  const [q, setQ] = useState('');
  const results = useMemo(() => (q.trim() ? searchFoods(q, data.foods).slice(0, 12) : []), [q, data.foods]);
  const draft: Recipe = { id: 'draft', name, servings, minutes: parseNum(minutes), tags: recipe?.tags ?? [], steps, ingredients: ings.map((i) => ({ food: i.food, g: parseNum(i.gt) })) };
  const m = recipeMacros(draft, data.foods);

  const save = () => {
    if (!name.trim()) return toast('Donne un nom à la recette.');
    if (!ings.length) return toast('Ajoute au moins un ingrédient.');
    saveRecipe({ id: recipe?.id, name: name.trim(), servings, minutes: Math.round(parseNum(minutes)) || 10, tags: recipe?.tags ?? [], steps: steps.trim(), ingredients: draft.ingredients.filter((i) => i.g > 0) });
    toast('Recette enregistrée');
    onSaved();
  };

  return (
    <Sheet visible onClose={onClose}>
      <H2>{recipe ? 'Modifier la recette' : 'Nouvelle recette'}</H2>
      <Field label="Nom" value={name} onChangeText={setName} placeholder="Poulet curry express" />
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
        <View style={{ width: 120 }}>
          <Field label="Temps (min)" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" />
        </View>
        <View style={{ gap: 4 }}>
          <Meta style={{ fontWeight: '600' }}>Portions</Meta>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4, 6].map((n) => (
              <Chip key={n} label={String(n)} active={servings === n} onPress={() => setServings(n)} />
            ))}
          </View>
        </View>
      </View>
      <H3>Ingrédients (quantités crues, pour toute la recette)</H3>
      <Card pad={false}>
        {ings.length === 0 ? <Meta style={{ padding: 14 }}>Cherche un aliment ci-dessous pour l'ajouter.</Meta> : null}
        {ings.map((i, k) => {
          const f = findFood(i.food, data.foods);
          return (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingRight: 10, marginLeft: 14, borderTopWidth: k ? 0.5 : 0, borderTopColor: t.line }}>
              <Body style={{ flex: 1, fontSize: 16 }}>{f?.name ?? '?'}</Body>
              <TextInput
                value={i.gt}
                onChangeText={(v) => setIngs((x) => x.map((y, j) => (j === k ? { ...y, gt: v } : y)))}
                keyboardType="decimal-pad"
                selectTextOnFocus
                style={{ width: 64, textAlign: 'right', color: t.ink, fontSize: 16, backgroundColor: t.sunk, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8 }}
              />
              <Meta>g</Meta>
              <Pressable onPress={() => setIngs((x) => x.filter((_, j) => j !== k))} hitSlop={8} accessibilityLabel="Retirer">
                <Text style={{ color: t.muted, fontSize: 18 }}>✕</Text>
              </Pressable>
            </View>
          );
        })}
      </Card>
      <Field value={q} onChangeText={setQ} placeholder="Ajouter un ingrédient (riz, poulet…)" autoCorrect={false} />
      {results.length ? (
        <Card pad={false}>
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {results.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => {
                  setIngs((x) => [...x, { food: f.id, g: f.unit?.g ?? 100, gt: String(f.unit?.g ?? 100) }]);
                  setQ('');
                }}
              >
                <View style={{ paddingVertical: 9, marginLeft: 14, paddingRight: 14, borderBottomWidth: 0.5, borderBottomColor: t.line }}>
                  <Body style={{ fontSize: 16 }}>{f.name}</Body>
                  <Meta style={{ fontSize: 13 }}>{Math.round(foodMacros(f, 100).kcal)} kcal / 100 g</Meta>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </Card>
      ) : null}
      <Card style={{ gap: 2 }}>
        <Meta style={{ fontSize: 13 }}>Par portion</Meta>
        <MacroLine m={m} />
      </Card>
      <Field label="Préparation" value={steps} onChangeText={setSteps} multiline placeholder="Étapes, astuces…" style={{ minHeight: 80, textAlignVertical: 'top' }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn kind="ghost" label="Annuler" onPress={onClose} style={{ flex: 1 }} />
        <Btn label="Enregistrer" onPress={save} style={{ flex: 1 }} />
      </View>
    </Sheet>
  );
}
