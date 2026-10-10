import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Btn, Card, Empty, H2, Header, Hint, LoadCtl, Meta, NavBtn, Screen, SectionTitle, Sheet, Body, useNav } from '../ui';
import { EQUIP, fDate, fmt, lastDone, lastPerf, sharedCount } from '../logic';
import type { Workout } from '../types';
import { WorkoutSheet } from '../sheets/WorkoutSheet';

/** Prochaine séance de la rotation : celle qui suit la dernière faite. */
function nextWorkout(workouts: Workout[], lastId?: string) {
  if (!workouts.length) return undefined;
  const i = workouts.findIndex((w) => w.id === lastId);
  return i < 0 ? workouts[0] : workouts[(i + 1) % workouts.length];
}

const ago = (iso?: string) => {
  if (!iso) return 'pas encore faite';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  return d <= 0 ? "faite aujourd'hui" : d === 1 ? 'faite hier' : d < 7 ? `il y a ${d} jours` : `le ${fDate(iso)}`;
};

function Badge({ name }: { name: string }) {
  const t = useTheme();
  const m = name.match(/\b([A-Z0-9])\s*$/) ?? name.match(/[A-Za-zÀ-ÿ0-9]/);
  return (
    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: t.accent, fontSize: 18, fontWeight: '700' }}>{(m?.[1] ?? m?.[0] ?? '•').toUpperCase()}</Text>
    </View>
  );
}

export function Seances() {
  const t = useTheme();
  const { data, changeLoad, startWorkout, abandonWorkout } = useStore();
  const { go, toast } = useNav();
  const [edit, setEdit] = useState<string | null | undefined>(undefined); // undefined = fermé, null = nouvelle
  const [conflict, setConflict] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const start = (id: string) => {
    if (data.active && data.active.workoutId !== id) return setConflict(id);
    if (!data.active) startWorkout(id);
    go('seance');
  };
  const onLoad = (id: string, dir: 1 | -1) => {
    const nv = changeLoad(id, dir);
    const n = sharedCount(data.workouts, id);
    if (n > 1) toast(`${data.exercises[id].name} : ${fmt(nv)} kg dans ${n} séances`);
  };

  const lastLog = data.logs.find((l) => data.workouts.some((w) => w.id === l.workoutId));
  const next = nextWorkout(data.workouts, lastLog?.workoutId);
  const open = openId ? data.workouts.find((w) => w.id === openId) : undefined;

  const sheets = (
    <>
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
    </>
  );

  /* ---------- Détail d'une séance ---------- */
  if (open) {
    const running = data.active?.workoutId === open.id;
    return (
      <Screen
        header={
          <Header
            title={open.name}
            left={<NavBtn label="‹ Séances" onPress={() => setOpenId(null)} />}
            right={<NavBtn label="Modifier" onPress={() => setEdit(open.id)} />}
          />
        }
      >
        <Meta style={{ marginTop: -12 }}>
          {open.items.length} exercices · {ago(lastDone(data.logs, open.id))}
        </Meta>
        <Btn label={running ? 'Reprendre la séance' : 'Démarrer la séance'} onPress={() => start(open.id)} disabled={!open.items.length} />

        <SectionTitle>Exercices et charges</SectionTitle>
        <Card pad={false}>
          {open.items.length === 0 ? <Meta style={{ padding: 16 }}>Aucun exercice : touche Modifier pour en ajouter.</Meta> : null}
          {open.items.map((it, i) => {
            const ex = data.exercises[it.ex];
            const n = ex ? sharedCount(data.workouts, ex.id) : 0;
            const prev = lastPerf(data.logs, it.ex);
            return (
              <View key={it.ex + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingRight: 12, marginLeft: 16, borderTopWidth: i ? 0.5 : 0, borderTopColor: t.line }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Body>{ex?.name ?? it.name}</Body>
                  <Meta>
                    {it.sets} × {it.reps}
                    {prev ? `  ·  dernière ${prev.sets.map((p) => fmt(p.r)).join('/')}` : ''}
                  </Meta>
                  {n > 1 || ex?.equip === 'halteres' ? (
                    <Meta style={{ fontSize: 13 }}>
                      {[ex?.equip === 'halteres' ? 'par haltère' : '', n > 1 ? `charge commune à ${n} séances` : ''].filter(Boolean).join(' · ')}
                    </Meta>
                  ) : null}
                </View>
                {ex ? <LoadCtl ex={ex} onChange={(d) => onLoad(ex.id, d)} /> : null}
              </View>
            );
          })}
        </Card>
        <Meta style={{ marginHorizontal: 16, marginTop: -8, fontSize: 13 }}>
          La charge appartient à l'exercice : la changer ici la change dans toutes les séances qui l'utilisent.
        </Meta>
        {sheets}
      </Screen>
    );
  }

  /* ---------- Liste ---------- */
  const gear = (
    <Pressable onPress={() => go('reglages')} accessibilityLabel="Réglages" hitSlop={10}>
      {({ pressed }) => (
        <Svg width={24} height={24} viewBox="0 0 24 24" opacity={pressed ? 0.4 : 1}>
          <Path
            d="M10.3 2.5h3.4l.5 2.6 1.9.8 2.2-1.5 2.4 2.4-1.5 2.2.8 1.9 2.6.5v3.4l-2.6.5-.8 1.9 1.5 2.2-2.4 2.4-2.2-1.5-1.9.8-.5 2.6h-3.4l-.5-2.6-1.9-.8-2.2 1.5-2.4-2.4 1.5-2.2-.8-1.9-2.6-.5v-3.4l2.6-.5.8-1.9-1.5-2.2 2.4-2.4 2.2 1.5 1.9-.8z"
            stroke={t.accent}
            strokeWidth={1.7}
            strokeLinejoin="round"
            fill="none"
          />
          <Circle cx={12} cy={12} r={3} stroke={t.accent} strokeWidth={1.7} fill="none" />
        </Svg>
      )}
    </Pressable>
  );
  const plus = (
    <Pressable onPress={() => setEdit(null)} accessibilityLabel="Nouvelle séance" hitSlop={10}>
      {({ pressed }) => (
        <Svg width={24} height={24} viewBox="0 0 24 24" opacity={pressed ? 0.4 : 1}>
          <Path d="M12 4v16M4 12h16" stroke={t.accent} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      )}
    </Pressable>
  );

  return (
    <Screen header={<Header title="Séances" right={<>{gear}{plus}</>} />}>
      {data.active ? (
        <Pressable onPress={() => go('seance')} style={({ pressed }) => ({ backgroundColor: t.accent, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.85 : 1 })}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.accentInk, fontSize: 13, opacity: 0.85 }}>Séance en cours</Text>
            <Text style={{ color: t.accentInk, fontSize: 20, fontWeight: '600' }}>{data.active.name}</Text>
          </View>
          <Text style={{ color: t.accentInk, fontSize: 17, fontWeight: '600' }}>Reprendre ›</Text>
        </Pressable>
      ) : next ? (
        <Card style={{ padding: 18, gap: 14 }}>
          <View style={{ gap: 2 }}>
            <Meta style={{ fontSize: 13 }}>À suivre</Meta>
            <Text style={{ color: t.ink, fontSize: 28, fontWeight: '700' }}>{next.name}</Text>
            <Meta>
              {next.items.length} exercices · {ago(lastDone(data.logs, next.id))}
            </Meta>
          </View>
          <Btn label="Démarrer" onPress={() => start(next.id)} disabled={!next.items.length} />
        </Card>
      ) : null}

      {!data.workouts.length ? (
        <Empty title="Aucune séance" text="Crée ta première séance type puis ajoute-y tes exercices." action={<Btn small label="Créer une séance" onPress={() => setEdit(null)} />} />
      ) : (
        <>
          <SectionTitle>Mes séances</SectionTitle>
          <Card pad={false}>
            {data.workouts.map((w, i) => (
              <Pressable key={w.id} onPress={() => setOpenId(w.id)} accessibilityRole="button">
                {({ pressed }) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14, backgroundColor: pressed ? t.sunk : 'transparent' }}>
                    <Badge name={w.name} />
                    <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingRight: 14, borderTopWidth: i ? 0.5 : 0, borderTopColor: t.line }}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Body>{w.name}</Body>
                        <Meta style={{ fontSize: 14 }}>
                          {w.items.length} exercices · {ago(lastDone(data.logs, w.id))}
                        </Meta>
                      </View>
                      {data.active?.workoutId === w.id ? <Text style={{ color: t.good, fontSize: 14, marginRight: 8 }}>en cours</Text> : null}
                      <Text style={{ color: t.muted, fontSize: 22, fontWeight: '300' }}>›</Text>
                    </View>
                  </View>
                )}
              </Pressable>
            ))}
          </Card>
        </>
      )}

      {data.workouts.length > 0 && !data.logs.length ? (
        <Hint>Touche une séance pour voir ses exercices et ajuster les charges. Une charge modifiée change dans toutes les séances qui utilisent l'exercice.</Hint>
      ) : null}
      {sheets}
    </Screen>
  );
}
