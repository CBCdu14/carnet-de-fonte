import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Btn, Card, Empty, Header, LoadCtl, Meta, NavBtn, Screen, SectionTitle, Body, useNav } from '../ui';
import { EQUIP, MUSCLES, fmt, sharedCount } from '../logic';
import type { Exercise } from '../types';
import { ExerciseSheet } from '../sheets/ExerciseSheet';

export function Exercices() {
  const t = useTheme();
  const { data, changeLoad } = useStore();
  const { toast } = useNav();
  const [edit, setEdit] = useState<string | null | undefined>(undefined);
  const list = Object.values(data.exercises);
  const groups: Record<string, Exercise[]> = {};
  list.forEach((e) => (groups[e.muscle || 'Autre'] ??= []).push(e));
  const order = [...MUSCLES, ...Object.keys(groups).filter((k) => !MUSCLES.includes(k))].filter((m) => groups[m]);

  const onLoad = (id: string, dir: 1 | -1) => {
    const nv = changeLoad(id, dir);
    const n = sharedCount(data.workouts, id);
    if (n > 1) toast(`${data.exercises[id].name} : ${fmt(nv)} kg dans ${n} séances`);
  };

  return (
    <Screen header={<Header title="Exercices" right={<NavBtn label="Ajouter" onPress={() => setEdit(null)} />} />}>
      {!list.length ? (
        <Empty title="Catalogue vide" text="Ajoute tes exercices avec leur charge de travail. Une même charge sert dans toutes tes séances." action={<Btn label="Ajouter un exercice" onPress={() => setEdit(null)} />} />
      ) : (
        <Meta>Une seule charge par exercice : la modifier ici, dans une séance ou pendant l'entraînement la met à jour partout. Touche un nom pour le modifier.</Meta>
      )}
      {order.map((m) => (
        <React.Fragment key={m}>
        <SectionTitle>{m}</SectionTitle>
        <Card pad={false}>
          {groups[m]
            .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
            .map((ex, i) => {
              const n = sharedCount(data.workouts, ex.id);
              return (
                <View key={ex.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 12, marginLeft: 16, paddingVertical: 10, borderTopWidth: i ? 0.5 : 0, borderTopColor: t.line }}>
                  <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => setEdit(ex.id)} accessibilityRole="button">
                    <Body>{ex.name}</Body>
                    <Meta>
                      {EQUIP[ex.equip]} · pas de {fmt(ex.step)} kg · {n ? `${n} séance${n > 1 ? 's' : ''}` : 'hors séance'}
                    </Meta>
                  </Pressable>
                  <LoadCtl ex={ex} onChange={(d) => onLoad(ex.id, d)} />
                </View>
              );
            })}
        </Card>
        </React.Fragment>
      ))}
      {edit !== undefined ? <ExerciseSheet id={edit ?? undefined} onClose={() => setEdit(undefined)} /> : null}
    </Screen>
  );
}
