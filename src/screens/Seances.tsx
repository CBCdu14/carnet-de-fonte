import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Btn, Card, Empty, H2, Header, Hint, LoadCtl, Meta, Screen, Sheet, Body, useNav } from '../ui';
import { EQUIP, fDate, fmt, lastDone, sharedCount } from '../logic';
import { WorkoutSheet } from '../sheets/WorkoutSheet';

export function Seances() {
  const t = useTheme();
  const { data, changeLoad, startWorkout, abandonWorkout } = useStore();
  const { go, toast } = useNav();
  const [edit, setEdit] = useState<string | null | undefined>(undefined); // undefined = fermé, null = nouvelle
  const [conflict, setConflict] = useState<string | null>(null);

  const onLoad = (id: string, dir: 1 | -1) => {
    const nv = changeLoad(id, dir);
    const n = sharedCount(data.workouts, id);
    if (n > 1) toast(`${data.exercises[id].name} : ${fmt(nv)} kg dans ${n} séances`);
  };
  const start = (id: string) => {
    if (data.active && data.active.workoutId !== id) return setConflict(id);
    if (!data.active) startWorkout(id);
    go('seance');
  };

  const gear = (
    <Pressable onPress={() => go('reglages')} accessibilityLabel="Réglages" hitSlop={8} style={{ padding: 6 }}>
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={3.2} stroke={t.ink} strokeWidth={2} fill="none" />
        <Path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke={t.ink} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </Pressable>
  );

  return (
    <Screen
      header={
        <Header
          eyebrow="Carnet de fonte"
          title="Séances"
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {gear}
              <Btn small label="Nouvelle séance" onPress={() => setEdit(null)} />
            </View>
          }
        />
      }
    >
      {data.active ? (
        <Pressable onPress={() => go('seance')} style={{ backgroundColor: t.ink, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: t.bg, fontWeight: '800', fontSize: 16, textTransform: 'uppercase', flexShrink: 1 }}>En cours · {data.active.name}</Text>
          <Text style={{ color: t.bg, fontWeight: '800', fontSize: 16, textTransform: 'uppercase' }}>Reprendre →</Text>
        </Pressable>
      ) : null}

      {!data.workouts.length ? (
        <Empty title="Aucune séance" text="Crée ta première séance type (Push, Pull, Jambes…) puis ajoute-y tes exercices." action={<Btn label="Créer une séance" onPress={() => setEdit(null)} />} />
      ) : null}

      {data.workouts.length > 0 && !data.logs.length ? (
        <Hint>
          Ces séances sont un programme de départ. Ajuste les charges avec − / + : la charge appartient à l'exercice, donc elle change dans toutes les séances qui l'utilisent.
        </Hint>
      ) : null}

      {data.workouts.map((w) => {
        const last = lastDone(data.logs, w.id);
        return (
          <Card key={w.id} pad={false}>
            <View style={{ padding: 16, paddingBottom: 12, gap: 10 }}>
              <View>
                <H2>{w.name}</H2>
                <Meta>
                  {w.items.length} exercices · {last ? 'dernière le ' + fDate(last) : 'pas encore faite'}
                </Meta>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn small kind="ghost" label="Modifier" onPress={() => setEdit(w.id)} />
                <Btn small label={data.active?.workoutId === w.id ? 'Reprendre' : 'Démarrer'} onPress={() => start(w.id)} />
              </View>
            </View>
            {w.items.length === 0 ? (
              <View style={{ borderTopWidth: 1, borderTopColor: t.line, padding: 16 }}>
                <Meta>Aucun exercice : touche Modifier pour en ajouter.</Meta>
              </View>
            ) : null}
            {w.items.map((it, i) => {
              const ex = data.exercises[it.ex];
              const n = ex ? sharedCount(data.workouts, ex.id) : 0;
              return (
                <View key={it.ex + i} style={{ borderTopWidth: 1, borderTopColor: t.line, paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Body style={{ fontWeight: '600' }}>{ex?.name ?? it.name}</Body>
                    <Meta>
                      {it.sets}×{it.reps} · {ex ? EQUIP[ex.equip] : ''}
                      {ex?.equip === 'halteres' ? ' (par haltère)' : ''}
                      {n > 1 ? <Text style={{ color: t.accent, fontWeight: '700' }}>{` · dans ${n} séances`}</Text> : null}
                    </Meta>
                  </View>
                  {ex ? <LoadCtl ex={ex} onChange={(d) => onLoad(ex.id, d)} /> : null}
                </View>
              );
            })}
          </Card>
        );
      })}

      {edit !== undefined ? <WorkoutSheet id={edit} onClose={() => setEdit(undefined)} /> : null}

      <Sheet visible={!!conflict} onClose={() => setConflict(null)}>
        <H2>Séance déjà en cours</H2>
        <Body>
          Tu as une séance « {data.active?.name} » non terminée. L'abandonner pour démarrer « {data.workouts.find((w) => w.id === conflict)?.name} » ?
        </Body>
        <View style={{ gap: 8 }}>
          <Btn kind="ghost" label={`Reprendre ${data.active?.name ?? ''}`} onPress={() => { setConflict(null); go('seance'); }} />
          <Btn
            kind="danger"
            label="Abandonner et démarrer"
            onPress={() => {
              const id = conflict!;
              setConflict(null);
              abandonWorkout();
              startWorkout(id);
              go('seance');
            }}
          />
        </View>
      </Sheet>
    </Screen>
  );
}
