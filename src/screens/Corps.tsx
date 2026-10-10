import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Btn, Card, Chip, Empty, H3, Meta, Body, useNav } from '../ui';
import { BarChart, LineChart } from '../charts';
import { actLabel, pace, summary } from '../garmin';
import { fDate, fDateL, fmt } from '../logic';

const ts = (d: string) => new Date(d.length <= 10 ? d + 'T12:00:00' : d.replace(' ', 'T')).getTime();

export function Corps() {
  const t = useTheme();
  const { data } = useStore();
  const { go } = useNav();
  const [metric, setMetric] = useState<'kcal' | 'steps' | 'restingHr' | 'sleepH'>('kcal');
  const g = data.garmin;

  if (!g || !g.days.length) {
    return (
      <Empty
        title="Garmin non relié"
        text="Relie ton compte Garmin (montre et balance) pour voir ici ton poids, tes calories dépensées, tes pas, ton sommeil et tes courses."
        action={<Btn label="Configurer dans Réglages" onPress={() => go('reglages')} />}
      />
    );
  }

  const s7 = summary(g, 7);
  const w = g.weights;
  const lastW = w[w.length - 1];
  const ref = w.find((x) => ts(x.date) >= ts(lastW?.date ?? '1970-01-01') - 30 * 864e5);
  const dW = lastW && ref && ref !== lastW ? lastW.kg - ref.kg : null;
  const days30 = g.days.slice(-30);
  const METRICS = {
    kcal: { label: 'Calories', unit: ' kcal', get: (d: any) => d.kcal },
    steps: { label: 'Pas', unit: '', get: (d: any) => d.steps },
    restingHr: { label: 'FC repos', unit: ' bpm', get: (d: any) => d.restingHr },
    sleepH: { label: 'Sommeil', unit: ' h', get: (d: any) => d.sleepH },
  } as const;
  const m = METRICS[metric];
  const series = days30.filter((d) => typeof m.get(d) === 'number' && m.get(d) > 0).map((d) => ({ t: ts(d.date), v: m.get(d) as number }));
  const runs = g.activities.slice(-12).reverse();

  const stat = (label: string, value: string, sub?: string) => (
    <View style={{ width: '50%', padding: 12, borderColor: t.line, borderWidth: 0.5, backgroundColor: t.surface }}>
      <Meta>{label}</Meta>
      <Text style={{ color: t.ink, fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{value}</Text>
      {sub ? <Meta style={{ fontSize: 12 }}>{sub}</Meta> : null}
    </View>
  );
  const n0 = (v?: number) => (v == null ? '–' : fmt(Math.round(v)));

  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: t.line }}>
        {stat('Poids', lastW ? `${fmt(lastW.kg)} kg` : '–', dW != null ? `${dW > 0 ? '+' : ''}${fmt(Math.round(dW * 10) / 10)} kg sur 30 j` : lastW ? `pesée du ${fDate(ts(lastW.date))}` : undefined)}
        {stat('Dépense / jour', `${n0(s7.kcal)}`, `kcal, moyenne 7 j (active ${n0(s7.activeKcal)})`)}
        {stat('Pas / jour', n0(s7.steps), 'moyenne 7 j')}
        {stat('Sommeil', s7.sleepH ? `${fmt(Math.round(s7.sleepH * 10) / 10)} h` : '–', `FC repos ${n0(s7.restingHr)} bpm`)}
      </View>

      {w.length ? (
        <Card>
          <H3>Poids</H3>
          <LineChart pts={w.slice(-90).map((x) => ({ t: ts(x.date), v: x.kg }))} unit=" kg" />
          {lastW?.fatPct ? <Meta>Masse grasse : {fmt(lastW.fatPct)} %{lastW.muscleKg ? ` · masse musculaire : ${fmt(lastW.muscleKg)} kg` : ''}</Meta> : null}
        </Card>
      ) : null}

      <Card>
        <H3>30 derniers jours</H3>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {(Object.keys(METRICS) as (keyof typeof METRICS)[]).map((k) => (
            <Chip key={k} label={METRICS[k].label} active={k === metric} onPress={() => setMetric(k)} />
          ))}
        </View>
        {series.length ? (
          metric === 'kcal' || metric === 'steps' ? <BarChart bars={series} every={7} /> : <LineChart pts={series} unit={m.unit} decimals={metric === 'sleepH' ? 1 : 0} />
        ) : (
          <Meta>Pas de données sur cette période.</Meta>
        )}
      </Card>

      <Card pad={false}>
        <H3 style={{ padding: 16, paddingBottom: 6 }}>Activités</H3>
        {runs.length === 0 ? <Meta style={{ paddingHorizontal: 16, paddingBottom: 16 }}>Aucune activité récente.</Meta> : null}
        {runs.map((a, i) => (
          <View key={String(a.id)} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: t.line, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flexShrink: 1 }}>
              <Body style={{ fontWeight: '700' }}>
                {actLabel(a.type)}
                {a.km ? ` · ${fmt(a.km)} km` : ''}
              </Body>
              <Meta>{fDateL(ts(a.date))}{a.name ? ` · ${a.name}` : ''}</Meta>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Meta>{a.min ? `${Math.round(a.min)} min` : ''}{a.paceMinKm && a.type.includes('run') ? ` · ${pace(a.paceMinKm)}` : ''}</Meta>
              <Meta>{a.avgHr ? `FC ${a.avgHr}` : ''}{a.kcal ? ` · ${fmt(a.kcal)} kcal` : ''}</Meta>
            </View>
          </View>
        ))}
      </Card>
      <Meta style={{ textAlign: 'center' }}>
        Données Garmin du {g.updatedAt ? fDateL(g.updatedAt) : '?'} · reçues le {fDateL(g.fetchedAt)}
      </Meta>
    </>
  );
}
