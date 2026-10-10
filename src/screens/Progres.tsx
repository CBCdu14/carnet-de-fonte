import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Btn, Card, Chip, Empty, H3, Header, LinkBtn, Meta, Screen, Body, useNav } from '../ui';
import { exPoints, fDateL, fmt, logVolume, weeklyVolume } from '../logic';
import { LoadChart, VolumeChart } from '../charts';
import { Corps } from './Corps';

export function Progres() {
  const t = useTheme();
  const { data, deleteLog } = useStore();
  const { go, toast } = useNav();
  const exs = useMemo(() => Object.values(data.exercises).sort((a, b) => a.name.localeCompare(b.name, 'fr')), [data.exercises]);
  const withData = useMemo(() => exs.filter((e) => exPoints(data.logs, e.id).length), [exs, data.logs]);
  const [sel, setSel] = useState<string>('');
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const exId = data.exercises[sel] ? sel : (withData[0] ?? exs[0])?.id;
  const ex = exId ? data.exercises[exId] : undefined;
  const pts = useMemo(() => (exId ? exPoints(data.logs, exId) : []), [data.logs, exId]);
  const weeks = useMemo(() => weeklyVolume(data.logs), [data.logs]);
  const [view, setView] = useState<'muscu' | 'corps'>('muscu');
  const seg = (
    <View style={{ flexDirection: 'row', backgroundColor: t.sunk, borderRadius: 999, padding: 3 }}>
      {(['muscu', 'corps'] as const).map((k) => (
        <Pressable key={k} onPress={() => setView(k)} style={{ flex: 1, paddingVertical: 9, borderRadius: 999, backgroundColor: view === k ? t.surface : 'transparent', alignItems: 'center' }}>
          <Text style={{ color: view === k ? t.ink : t.muted, fontWeight: '700', fontSize: 15 }}>{k === 'muscu' ? 'Musculation' : 'Corps & cardio'}</Text>
        </Pressable>
      ))}
    </View>
  );
  if (view === 'corps') {
    return (
      <Screen header={<Header eyebrow="Suivi" title="Progrès" />}>
        {seg}
        <Corps />
      </Screen>
    );
  }

  if (!data.logs.length) {
    return (
      <Screen header={<Header eyebrow="Suivi" title="Progrès" />}>
        {seg}
        <Empty
          title="Pas encore de séance enregistrée"
          text="Démarre une séance depuis l'onglet Séances et termine-la : tes courbes de charge, ton 1RM estimé et ton volume hebdo apparaîtront ici."
          action={<Btn label="Aller aux séances" onPress={() => go('seances')} />}
        />
      </Screen>
    );
  }

  const best = pts.length ? Math.max(...pts.map((p) => p.e1)) : 0;
  const gain = pts.length > 1 ? pts[pts.length - 1].kg - pts[0].kg : 0;
  const stat = (label: string, value: string, up?: boolean) => (
    <View style={{ width: '50%', padding: 12, borderColor: t.line, borderWidth: 0.5, backgroundColor: t.surface }}>
      <Meta>{label}</Meta>
      <Text style={{ color: up ? t.good : t.ink, fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );

  return (
    <Screen header={<Header eyebrow="Suivi" title="Progrès" />}>
      {seg}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[...withData, ...exs.filter((e) => !withData.includes(e))].map((e) => (
          <Chip key={e.id} label={e.name} active={e.id === exId} onPress={() => setSel(e.id)} />
        ))}
      </ScrollView>

      {ex ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: t.line }}>
            {stat('Charge de travail', `${fmt(ex.load)} kg`)}
            {stat('1RM estimé max', best ? `${fmt(Math.round(best * 2) / 2)} kg` : '–')}
            {stat('Depuis le début', `${gain > 0 ? '+' : ''}${fmt(gain)} kg`, gain > 0)}
            {stat('Séances', String(pts.length))}
          </View>
          <Card>
            <H3>Charge max par séance</H3>
            {pts.length ? (
              <>
                <LoadChart pts={pts} />
                <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
                  <Meta><Text style={{ color: t.accent }}>━ </Text>Série la plus lourde</Meta>
                  <Meta><Text style={{ color: t.muted }}>╍ </Text>1RM estimé (Epley)</Meta>
                </View>
              </>
            ) : (
              <Meta>Aucune série validée pour cet exercice pour l'instant.</Meta>
            )}
          </Card>
        </>
      ) : null}

      <Card>
        <H3>Volume hebdomadaire</H3>
        <Meta>Tonnage soulevé (charge × reps des séries validées), 10 dernières semaines.</Meta>
        <VolumeChart weeks={weeks} />
      </Card>

      <Card pad={false}>
        <H3 style={{ padding: 16, paddingBottom: 6 }}>Historique</H3>
        {data.logs.slice(0, 60).map((l, i) => {
          const isOpen = open === l.id;
          return (
            <View key={l.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: t.line, paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
              <Pressable onPress={() => { setOpen(isOpen ? null : l.id); setConfirm(null); }} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flexShrink: 1 }}>
                  <Body style={{ fontWeight: '700' }}>{l.workoutName}</Body>
                  <Meta>{fDateL(l.date)}</Meta>
                </View>
                <Meta>
                  {l.durationMin} min · {fmt(Math.round(logVolume(l)))} kg
                </Meta>
              </Pressable>
              {isOpen ? (
                <View style={{ gap: 6 }}>
                  {l.entries.map((e, k) => (
                    <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                      <Body style={{ flexShrink: 1, fontSize: 15 }}>{data.exercises[e.ex]?.name ?? e.name}</Body>
                      <Meta style={{ flexShrink: 1, textAlign: 'right' }}>{e.sets.filter((s) => s.done).map((s) => `${fmt(s.kg)}×${s.r}`).join(' · ') || '–'}</Meta>
                    </View>
                  ))}
                  {l.note ? <Meta>« {l.note} »</Meta> : null}
                  <LinkBtn
                    color={t.bad}
                    label={confirm === l.id ? 'Confirmer la suppression' : 'Supprimer cette séance'}
                    onPress={() => {
                      if (confirm !== l.id) return setConfirm(l.id);
                      deleteLog(l.id);
                      setConfirm(null);
                      toast('Séance supprimée');
                    }}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}
