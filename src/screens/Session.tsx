import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { buzz } from '../platform/buzz';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Btn, Card, Eyebrow, H1, H2, LinkBtn, LoadCtl, Meta, Plates, Screen, useNav } from '../ui';
import { fTime, fmt, pad, sharedCount } from '../logic';
import { FinishSheet } from '../sheets/FinishSheet';

function useElapsed(start: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(i);
  }, []);
  const m = Math.max(0, Math.floor((now - start) / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${pad(m % 60)}`;
}

export function Session() {
  const t = useTheme();
  const { data, changeLoad, updateActive } = useStore();
  const { toast, startRest } = useNav();
  const [finish, setFinish] = useState(false);
  const a = data.active!;
  const elapsed = useElapsed(a.startedAt);

  const setField = (i: number, j: number, k: 'kg' | 'r', v: string) =>
    updateActive((x) => ({
      ...x,
      entries: x.entries.map((e, ei) => (ei !== i ? e : { ...e, sets: e.sets.map((s, sj) => (sj !== j ? s : { ...s, [k]: v.replace(k === 'r' ? /[^0-9]/g : /[^0-9.,]/g, '') })) })),
    }));
  const toggle = (i: number, j: number) => {
    const wasDone = a.entries[i].sets[j].done;
    updateActive((x) => ({
      ...x,
      entries: x.entries.map((e, ei) => (ei !== i ? e : { ...e, sets: e.sets.map((s, sj) => (sj !== j ? s : { ...s, done: !s.done })) })),
    }));
    if (!wasDone) {
      buzz('tap');
      startRest();
    }
  };
  const addSet = (i: number) =>
    updateActive((x) => ({
      ...x,
      entries: x.entries.map((e, ei) => {
        if (ei !== i) return e;
        const last = e.sets[e.sets.length - 1];
        return { ...e, sets: [...e.sets, { kg: last?.kg ?? fmt(data.exercises[e.ex]?.load ?? 0), r: String(e.target), done: false }] };
      }),
    }));
  const rmSet = (i: number) => updateActive((x) => ({ ...x, entries: x.entries.map((e, ei) => (ei !== i ? e : { ...e, sets: e.sets.slice(0, -1) })) }));

  const fieldBox = (done: boolean) => ({
    flex: 1,
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: done ? t.goodSoft : t.sunk,
    borderRadius: 8,
    paddingHorizontal: 10,
  });
  const input = { flex: 1, minWidth: 0, paddingVertical: 10, fontSize: 20, fontWeight: '700' as const, color: t.ink, fontVariant: ['tabular-nums' as const] };

  return (
    <Screen
      header={
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flexShrink: 1 }}>
            <Eyebrow>
              Depuis {fTime(a.startedAt)} · {elapsed}
            </Eyebrow>
            <H1>{a.name}</H1>
          </View>
          <Btn small label="Terminer" onPress={() => setFinish(true)} />
        </View>
      }
    >
      {a.entries.map((e, i) => {
        const ex = data.exercises[e.ex];
        const n = ex ? sharedCount(data.workouts, ex.id) : 0;
        return (
          <Card key={e.ex + i}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <View style={{ flexShrink: 1, minWidth: 0 }}>
                <H2>{ex?.name ?? e.name}</H2>
                <Meta>
                  Objectif {e.sets.length}×{e.target}
                  {n > 1 ? <Text style={{ color: t.accent, fontWeight: '700' }}>{` · charge partagée avec ${n - 1} autre${n > 2 ? 's' : ''} séance${n > 2 ? 's' : ''}`}</Text> : null}
                </Meta>
              </View>
              {ex ? (
                <LoadCtl
                  ex={ex}
                  onChange={(d) => {
                    const nv = changeLoad(ex.id, d);
                    if (n > 1) toast(`${ex.name} : ${fmt(nv)} kg dans ${n} séances`);
                  }}
                />
              ) : null}
            </View>
            <Plates ex={ex} />
            <View style={{ gap: 6 }}>
              {e.sets.map((s, j) => (
                <View key={j} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ width: 22, textAlign: 'center', color: t.muted, fontWeight: '800', fontSize: 16 }}>{j + 1}</Text>
                  <View style={fieldBox(s.done)}>
                    <TextInput style={input} value={s.kg} onChangeText={(v) => setField(i, j, 'kg', v)} keyboardType="decimal-pad" selectTextOnFocus accessibilityLabel={`Charge série ${j + 1}`} />
                    <Text style={{ color: t.muted, fontSize: 13 }}>kg</Text>
                  </View>
                  <View style={fieldBox(s.done)}>
                    <TextInput style={input} value={s.r} onChangeText={(v) => setField(i, j, 'r', v)} keyboardType="number-pad" selectTextOnFocus accessibilityLabel={`Répétitions série ${j + 1}`} />
                    <Text style={{ color: t.muted, fontSize: 13 }}>reps</Text>
                  </View>
                  <Pressable
                    onPress={() => toggle(i, j)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: s.done }}
                    accessibilityLabel={`Valider la série ${j + 1}`}
                    style={{ width: 48, height: 44, borderRadius: 8, borderWidth: 1.5, borderColor: s.done ? t.good : t.line, backgroundColor: s.done ? t.good : 'transparent', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: '800', color: s.done ? t.surface : t.muted }}>✓</Text>
                  </Pressable>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 18 }}>
              <LinkBtn label="+ Série" onPress={() => addSet(i)} />
              {e.sets.length > 1 ? <LinkBtn label="− Série" onPress={() => rmSet(i)} /> : null}
            </View>
          </Card>
        );
      })}
      <Btn kind="ghost" label="Terminer la séance" onPress={() => setFinish(true)} />
      {finish ? <FinishSheet onClose={() => setFinish(false)} /> : null}
    </Screen>
  );
}
