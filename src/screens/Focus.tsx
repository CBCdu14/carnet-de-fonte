import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Btn, Card, Meta, Plates, Sheet, Body, H2, useNav } from '../ui';
import { fmt, goalFor, parseNum, sharedCount } from '../logic';
import { chooseExercise, completeSet, currentIdx, fmtClock, nextSet, remaining } from '../session';
import { buzz } from '../platform/buzz';
import { unlockAudio } from '../platform/beep';
import type { Active } from '../types';

function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, [active]);
  return now;
}

/** Bouton rond − / + géant (saisie des reps). */
function Round({ label, onPress, a11y, small }: { label: string; onPress: () => void; a11y: string; small?: boolean }) {
  const t = useTheme();
  const d = small ? 48 : 64;
  return (
    <Pressable onPress={onPress} accessibilityLabel={a11y} hitSlop={6} style={({ pressed }) => ({ width: d, height: d, borderRadius: d / 2, backgroundColor: pressed ? t.accent : t.sunk, alignItems: 'center', justifyContent: 'center' })}>
      {({ pressed }) => <Text style={{ fontSize: small ? 26 : 32, fontWeight: '500', color: pressed ? '#FFFFFF' : t.ink, marginTop: -3 }}>{label}</Text>}
    </Pressable>
  );
}

function SetDots({ total, done, current }: { total: number; done: number; current: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {Array.from({ length: total }, (_, k) => (
        <View
          key={k}
          style={{ width: k === current ? 22 : 10, height: 10, borderRadius: 5, backgroundColor: k < done ? t.good : k === current ? t.accent : t.sunk }}
        />
      ))}
    </View>
  );
}

export function Focus({ onFinish }: { onFinish: () => void }) {
  const t = useTheme();
  const { data, changeLoad, updateActive } = useStore();
  const { toast } = useNav();
  const a = data.active as Active;
  const rest = a.rest;
  const now = useNow(!!rest);
  const resting = !!rest && now < rest.end;
  const ci = currentIdx(a);
  const [repsSheet, setRepsSheet] = useState(false);
  const [reps, setReps] = useState(0);
  const [picker, setPicker] = useState(false);

  /* ---------- Séance terminée ---------- */
  if (ci < 0) {
    return (
      <Card style={{ padding: 24, gap: 16, alignItems: 'center' }}>
        <Text style={{ color: t.good, fontSize: 48 }}>✓</Text>
        <H2>Tous les exercices sont faits</H2>
        <Meta style={{ textAlign: 'center' }}>Enregistre la séance pour mettre à jour ta progression et tes charges.</Meta>
        <Btn label="Enregistrer la séance" onPress={onFinish} style={{ alignSelf: 'stretch' }} />
      </Card>
    );
  }

  const e = a.entries[ci];
  const ex = data.exercises[e.ex];
  const j = nextSet(e);
  const kg = ex ? ex.load : parseNum(e.sets[j]?.kg ?? '0');
  const goal = goalFor(e.prev?.sets[j], kg, e.target);
  const prevSet = e.prev?.sets[j];
  const doneSets = e.sets.filter((s) => s.done);
  const others = remaining(a, ci);
  const exNumber = a.entries.filter((x) => nextSet(x) < 0).length + 1;

  const openReps = () => {
    unlockAudio();
    setReps(goal);
    setRepsSheet(true);
  };
  const validate = () => {
    buzz('tap');
    updateActive((x) => completeSet(x, ci, reps, String(kg).replace('.', ','), data.settings.restSec, data.settings.restExSec));
    setRepsSheet(false);
  };
  const pick = (idx: number) => {
    updateActive((x) => chooseExercise(x, idx));
    setPicker(false);
  };

  const pickerSheet = (
    <Sheet visible={picker} onClose={() => setPicker(false)}>
      <H2>Changer d'exercice</H2>
      <Meta>Machine occupée ? Choisis ce que tu fais maintenant, tu reviendras à « {ex?.name ?? e.name} » ensuite.</Meta>
      <Card pad={false}>
        {others.map(({ e: o, i }, k) => {
          const oex = data.exercises[o.ex];
          const left = o.sets.filter((s) => !s.done).length;
          return (
            <Pressable key={o.ex + i} onPress={() => pick(i)} accessibilityRole="button">
              {({ pressed }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingRight: 14, marginLeft: 16, borderTopWidth: k ? 0.5 : 0, borderTopColor: t.line, opacity: pressed ? 0.5 : 1 }}>
                  <View style={{ flex: 1 }}>
                    <Body>{oex?.name ?? o.name}</Body>
                    <Meta style={{ fontSize: 14 }}>
                      {left} série{left > 1 ? 's' : ''} · {oex ? `${fmt(oex.load)} kg` : ''} · objectif {o.target}
                    </Meta>
                  </View>
                  <Text style={{ color: t.muted, fontSize: 22, fontWeight: '300' }}>›</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </Card>
      <Btn kind="ghost" label="Garder l'exercice prévu" onPress={() => setPicker(false)} />
    </Sheet>
  );

  /* ---------- Repos ---------- */
  if (resting && rest) {
    const left = Math.max(0, Math.ceil((rest.end - now) / 1000));
    const R = 120, C = 2 * Math.PI * R;
    const frac = Math.min(1, Math.max(0, (rest.end - now) / (rest.total * 1000)));
    const shift = (sec: number) => updateActive((x) => (x.rest ? { ...x, rest: { ...x.rest, end: x.rest.end + sec * 1000, total: Math.max(x.rest.total + sec, 1) } } : x));
    return (
      <View style={{ gap: 18 }}>
        <View style={{ alignItems: 'center', gap: 4, paddingTop: 8 }}>
          <Meta>{rest.kind === 'ex' ? 'Repos avant le prochain exercice' : 'Repos entre les séries'}</Meta>
          <View style={{ width: 2 * R + 20, height: 2 * R + 20, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={2 * R + 20} height={2 * R + 20} style={{ position: 'absolute' }}>
              <Circle cx={R + 10} cy={R + 10} r={R} stroke={t.sunk} strokeWidth={10} fill="none" />
              <Circle
                cx={R + 10}
                cy={R + 10}
                r={R}
                stroke={left <= 10 ? t.good : t.accent}
                strokeWidth={10}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${C} ${C}`}
                strokeDashoffset={C * (1 - frac)}
                transform={`rotate(-90 ${R + 10} ${R + 10})`}
              />
            </Svg>
            <Text style={{ color: t.ink, fontSize: 72, fontWeight: '300', fontVariant: ['tabular-nums'] }}>{fmtClock(left)}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn small kind="ghost" label="−15 s" onPress={() => shift(-15)} />
            <Btn small kind="ghost" label="+30 s" onPress={() => shift(30)} />
          </View>
        </View>

        <Card style={{ gap: 6 }}>
          <Meta style={{ fontSize: 13 }}>Ensuite</Meta>
          <Text style={{ color: t.ink, fontSize: 22, fontWeight: '600' }}>{ex?.name ?? e.name}</Text>
          <Meta>
            Série {j + 1} sur {e.sets.length} · {fmt(kg)} kg · objectif {goal} reps
          </Meta>
          {rest.kind === 'ex' && others.length ? <Btn small kind="ghost" label="Machine occupée ? Changer d'exercice" onPress={() => setPicker(true)} style={{ alignSelf: 'flex-start', marginTop: 6 }} /> : null}
        </Card>
        <Btn label="Passer le repos" onPress={() => updateActive((x) => ({ ...x, rest: undefined }))} />
        {pickerSheet}
      </View>
    );
  }

  /* ---------- Exercice en cours ---------- */
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Meta>
          Exercice {Math.min(exNumber, a.entries.length)} sur {a.entries.length}
        </Meta>
        <Text style={{ color: t.ink, fontSize: 30, fontWeight: '700' }}>{ex?.name ?? e.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ color: t.muted, fontSize: 17 }}>
            Série {j + 1} sur {e.sets.length}
          </Text>
          <SetDots total={e.sets.length} done={doneSets.length} current={j} />
        </View>
      </View>

      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View>
            <Meta style={{ fontSize: 13 }}>Charge</Meta>
            <Text style={{ color: t.ink, fontSize: 40, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {ex?.equip === 'pdc' && !kg ? 'PdC' : `${fmt(kg)} kg`}
            </Text>
          </View>
          {ex ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {([-1, 1] as const).map((d) => (
                <Round
                  key={d}
                  small
                  label={d < 0 ? '−' : '+'}
                  a11y={d < 0 ? 'Baisser la charge' : 'Monter la charge'}
                  onPress={() => {
                    buzz('tick');
                    const nv = changeLoad(ex.id, d);
                    const n = sharedCount(data.workouts, ex.id);
                    if (n > 1) toast(`${ex.name} : ${fmt(nv)} kg dans ${n} séances`);
                  }}
                />
              ))}
            </View>
          ) : null}
        </View>
        <Plates ex={ex} />
        <View style={{ height: 0.5, backgroundColor: t.line }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Meta style={{ fontSize: 13 }}>Objectif</Meta>
            <Text style={{ color: t.ink, fontSize: 40, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{goal} reps</Text>
          </View>
          <Meta style={{ textAlign: 'right', marginBottom: 6 }}>{prevSet ? `La dernière fois\n${fmt(prevSet.kg)} kg × ${fmt(prevSet.r)}` : 'Première fois'}</Meta>
        </View>
      </Card>

      <Btn label="Série terminée" onPress={openReps} />

      {doneSets.length ? (
        <Card pad={false}>
          {e.sets.map((s, k) =>
            s.done ? (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingRight: 16, marginLeft: 16, borderTopWidth: k ? 0.5 : 0, borderTopColor: t.line }}>
                <Body>Série {k + 1}</Body>
                <Body style={{ color: parseNum(s.r) >= goalFor(e.prev?.sets[k], parseNum(s.kg), e.target) ? t.good : t.ink, fontVariant: ['tabular-nums'] }}>
                  {s.kg} kg × {s.r}
                </Body>
              </View>
            ) : null,
          )}
        </Card>
      ) : null}

      {others.length ? (
        <Pressable onPress={() => setPicker(true)} style={{ alignItems: 'center', paddingVertical: 6 }} accessibilityRole="button">
          <Text style={{ color: t.accent, fontSize: 17 }}>Machine occupée ? Changer d'exercice</Text>
        </Pressable>
      ) : null}

      <Sheet visible={repsSheet} onClose={() => setRepsSheet(false)}>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <H2>Répétitions faites</H2>
          <Meta>
            {ex?.name ?? e.name} · série {j + 1} · {fmt(kg)} kg
          </Meta>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, paddingVertical: 8 }}>
          <Round label="−" a11y="Une rep de moins" onPress={() => { buzz('tick'); setReps((r) => Math.max(0, r - 1)); }} />
          <Text style={{ color: reps >= goal ? t.good : t.ink, fontSize: 72, fontWeight: '600', minWidth: 110, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{reps}</Text>
          <Round label="+" a11y="Une rep de plus" onPress={() => { buzz('tick'); setReps((r) => r + 1); }} />
        </View>
        <Meta style={{ textAlign: 'center' }}>{reps >= goal ? 'Objectif atteint' : `Objectif : ${goal} reps`}</Meta>
        <Btn label="OK" onPress={validate} />
        <Meta style={{ textAlign: 'center', fontSize: 13 }}>
          Ensuite : repos de {fmtClock(nextSet({ ...e, sets: e.sets.map((s, k) => (k === j ? { ...s, done: true } : s)) }) >= 0 ? data.settings.restSec : data.settings.restExSec)}
        </Meta>
      </Sheet>
      {pickerSheet}
    </View>
  );
}
