import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Btn, Chip, Eyebrow, Field, H2, H3, Meta, Sheet, Body, useNav } from '../ui';
import { fmt } from '../logic';
import type { WorkoutItem } from '../types';
import { ExerciseForm } from './ExerciseSheet';
import { CATALOG, type CatalogEx } from '../catalog';

export function WorkoutSheet({ id, onClose, startPicking }: { id: string | null; onClose: () => void; startPicking?: boolean }) {
  const t = useTheme();
  const { data, saveWorkout, deleteWorkout } = useStore();
  const { toast } = useNav();
  const orig = id ? data.workouts.find((w) => w.id === id) : undefined;
  const [name, setName] = useState(orig?.name ?? '');
  const [items, setItems] = useState<(WorkoutItem & { setsT: string; repsT: string })[]>(
    (orig?.items ?? []).map((i) => ({ ...i, setsT: String(i.sets), repsT: String(i.reps) })),
  );
  const [picking, setPicking] = useState(!!startPicking);
  const [creating, setCreating] = useState<false | true | CatalogEx>(false);
  const [zone, setZone] = useState<string>('mes');
  const [confirmDel, setConfirmDel] = useState(false);

  const available = useMemo(
    () => Object.values(data.exercises).filter((e) => !items.some((i) => i.ex === e.id)).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [data.exercises, items],
  );

  const upd = (i: number, k: 'setsT' | 'repsT', v: string) => setItems((it) => it.map((x, j) => (j === i ? { ...x, [k]: v.replace(/[^0-9]/g, '') } : x)));
  const move = (i: number) => setItems((it) => { if (i === 0) return it; const n = it.slice(); [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; });
  const add = (exId: string) => {
    const ex = data.exercises[exId];
    setItems((it) => [...it, { ex: exId, name: ex?.name ?? '', sets: 3, reps: 10, setsT: '3', repsT: '10' }]);
    setPicking(false);
  };
  const save = () => {
    if (!name.trim()) return toast('Donne un nom à la séance.');
    saveWorkout({
      id: id ?? undefined,
      name: name.trim(),
      items: items.map((i) => ({ ex: i.ex, name: data.exercises[i.ex]?.name ?? i.name, sets: Math.max(1, parseInt(i.setsT) || 3), reps: Math.max(1, parseInt(i.repsT) || 8) })),
    });
    toast('Séance enregistrée');
    onClose();
  };

  const small = { borderWidth: 1, borderColor: t.line, borderRadius: 8, backgroundColor: t.bg, color: t.ink, fontSize: 16, textAlign: 'center' as const, width: 54, paddingVertical: 7 };
  const icon = (label: string, onPress: () => void, a11y: string) => (
    <Pressable onPress={onPress} accessibilityLabel={a11y} style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: t.sunk, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: t.ink, fontSize: 16 }}>{label}</Text>
    </Pressable>
  );

  if (creating) {
    return (
      <Sheet visible onClose={() => setCreating(false)}>
        <H2>Nouvel exercice</H2>
        {typeof creating === 'object' ? <Meta>{creating.why} Indique la charge avec laquelle tu commences.</Meta> : null}
        <ExerciseForm
          preset={typeof creating === 'object' ? creating : undefined}
          submitLabel="Ajouter à la séance"
          onCancel={() => setCreating(false)}
          onSaved={(exId) => {
            setCreating(false);
            setItems((it) => [...it, { ex: exId, name: '', sets: 3, reps: 10, setsT: '3', repsT: '10' }]);
          }}
        />
      </Sheet>
    );
  }

  return (
    <Sheet visible onClose={onClose}>
      <H2>{id ? 'Modifier la séance' : 'Nouvelle séance'}</H2>
      <Field label="Nom de la séance" value={name} onChangeText={setName} placeholder="Push, Haut du corps…" />
      <View>
        <View style={{ flexDirection: 'row', gap: 6, paddingBottom: 6 }}>
          <Eyebrow style={{ flex: 1 }}>Exercice</Eyebrow>
          <Eyebrow style={{ width: 54, textAlign: 'center' }}>Séries</Eyebrow>
          <Eyebrow style={{ width: 54, textAlign: 'center' }}>Reps</Eyebrow>
          <View style={{ width: 72 }} />
        </View>
        {items.length === 0 ? <Meta>Aucun exercice pour l'instant.</Meta> : null}
        {items.map((it, i) => {
          const ex = data.exercises[it.ex];
          return (
            <View key={it.ex} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.line }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Body numberOfLines={2}>{ex?.name ?? it.name}</Body>
                {ex ? <Meta>{fmt(ex.load)} kg</Meta> : null}
              </View>
              <TextInput style={small} keyboardType="number-pad" value={it.setsT} onChangeText={(v) => upd(i, 'setsT', v)} accessibilityLabel="Séries" />
              <TextInput style={small} keyboardType="number-pad" value={it.repsT} onChangeText={(v) => upd(i, 'repsT', v)} accessibilityLabel="Répétitions" />
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {icon('↑', () => move(i), 'Monter')}
                {icon('✕', () => setItems((x) => x.filter((_, j) => j !== i)), 'Retirer')}
              </View>
            </View>
          );
        })}
      </View>

      {picking ? (
        <View style={{ gap: 10 }}>
          <H3>Ajouter un exercice</H3>
          <Meta>Quelle zone veux-tu travailler ?</Meta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip label="Mes exercices" active={zone === 'mes'} onPress={() => setZone('mes')} />
            {CATALOG.map((c) => <Chip key={c.zone} label={c.zone} active={zone === c.zone} onPress={() => setZone(c.zone)} />)}
          </View>
          {zone === 'mes' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {available.map((e) => (
                <Chip key={e.id} label={`${e.name} · ${fmt(e.load)} kg`} onPress={() => add(e.id)} />
              ))}
              {!available.length ? <Meta>Tous tes exercices sont déjà dans cette séance.</Meta> : null}
            </View>
          ) : (
            <View style={{ borderRadius: 12, backgroundColor: t.bg, overflow: 'hidden' }}>
              {(CATALOG.find((c) => c.zone === zone)?.exs ?? []).map((c, k) => {
                const mine = Object.values(data.exercises).find((e) => e.name.trim().toLowerCase() === c.name.toLowerCase());
                const inWo = mine ? items.some((i) => i.ex === mine.id) : false;
                return (
                  <Pressable
                    key={c.name}
                    disabled={inWo}
                    onPress={() => (mine ? add(mine.id) : (setPicking(false), setCreating(c)))}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: k ? 0.5 : 0, borderTopColor: t.line, opacity: inWo ? 0.4 : pressed ? 0.6 : 1 })}
                  >
                    <View style={{ flex: 1 }}>
                      <Body>{c.name}</Body>
                      <Meta style={{ fontSize: 13 }}>{inWo ? 'Déjà dans la séance' : mine ? `Déjà dans tes exercices · ${fmt(mine.load)} kg` : c.why}</Meta>
                    </View>
                    <Text style={{ color: t.accent, fontSize: 15 }}>{mine ? 'Ajouter' : 'Créer'}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <Chip label="+ Autre exercice (libre)" active onPress={() => { setPicking(false); setCreating(true); }} />
        </View>
      ) : (
        <Btn kind="ghost" label="+ Ajouter un exercice" onPress={() => setPicking(true)} />
      )}

      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
        {id ? (
          <Btn
            kind={confirmDel ? 'danger' : 'ghost'}
            label={confirmDel ? 'Confirmer la suppression' : 'Supprimer'}
            style={{ marginRight: 'auto' }}
            onPress={() => {
              if (!confirmDel) return setConfirmDel(true);
              deleteWorkout(id);
              toast('Séance supprimée');
              onClose();
            }}
          />
        ) : null}
        <Btn kind="ghost" label="Annuler" onPress={onClose} />
        <Btn label="Enregistrer" onPress={save} />
      </View>
    </Sheet>
  );
}
