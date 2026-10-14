import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { buzz } from '../platform/buzz';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Btn, Field, H2, H3, LinkBtn, Meta, Sheet, Body, useNav } from '../ui';
import { fmt, parseNum, proposals, review } from '../logic';

export function FinishSheet({ onClose }: { onClose: () => void }) {
  const t = useTheme();
  const { data, finishWorkout, abandonWorkout } = useStore();
  const { go, toast } = useNav();
  const a = data.active!;
  const props = useMemo(() => proposals(a, data.exercises), [a, data.exercises]);
  const rev = useMemo(() => review(a, data.exercises), [a, data.exercises]);
  const ups = rev.filter((r) => r.verdict === 'up').length;
  const [on, setOn] = useState<boolean[]>(() => props.map((p) => p.on));
  const [note, setNote] = useState('');
  const [confirmAb, setConfirmAb] = useState(false);

  const mins = Math.max(1, Math.round((Date.now() - a.startedAt) / 60000));
  const vol = a.entries.reduce((s, e) => s + e.sets.filter((x) => x.done).reduce((b, x) => b + parseNum(x.kg) * parseNum(x.r), 0), 0);
  const doneSets = a.entries.reduce((s, e) => s + e.sets.filter((x) => x.done).length, 0);
  const tot = a.entries.reduce((s, e) => s + e.sets.length, 0);

  const save = () => {
    const apply = props.filter((_, k) => on[k]).map((p) => ({ ex: p.ex, nv: p.nv }));
    finishWorkout(note.trim(), apply);
    buzz('success');
    onClose();
    go('progres');
    toast(apply.length ? `Séance enregistrée · ${apply.length} charge${apply.length > 1 ? 's' : ''} mise${apply.length > 1 ? 's' : ''} à jour` : 'Séance enregistrée');
  };

  const stat = (label: string, value: string) => (
    <View style={{ flex: 1, backgroundColor: t.bg, borderRadius: 10, padding: 10 }}>
      <Meta>{label}</Meta>
      <Text style={{ color: t.ink, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );

  return (
    <Sheet visible onClose={onClose}>
      <H2>Fin de séance</H2>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {stat('Durée', `${mins} min`)}
        {stat('Séries', `${doneSets}/${tot}`)}
        {stat('Tonnage', fmt(Math.round(vol)))}
      </View>
      {doneSets ? (
        <View style={{ gap: 4 }}>
          <H3>Bilan</H3>
          <Meta>{ups ? `${ups} exercice${ups > 1 ? 's' : ''} au max : la charge monte.` : 'Pas encore de charge à monter : on consolide les reps.'}</Meta>
          {rev.filter((r) => r.verdict === 'skip').length ? <Meta style={{ fontSize: 14 }}>Non fait : {rev.filter((r) => r.verdict === 'skip').map((r) => r.name).join(', ')}</Meta> : null}
          {rev.filter((r) => r.verdict !== 'skip').map((r, k) => {
            const col = r.verdict === 'up' ? t.good : r.verdict === 'miss' ? t.bad : r.verdict === 'skip' ? t.muted : t.accent;
            const icon = r.verdict === 'up' ? '▲' : r.verdict === 'close' ? '≈' : r.verdict === 'miss' ? '▼' : r.verdict === 'skip' ? '–' : '•';
            return (
              <View key={r.ex + k} style={{ flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: k ? 0.5 : 0, borderTopColor: t.line }}>
                <Text style={{ color: col, fontSize: 16, width: 18, textAlign: 'center', marginTop: 2 }}>{icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <Body style={{ fontWeight: '600', flex: 1 }}>{r.name}</Body>
                    {r.kg ? <Meta style={{ fontVariant: ['tabular-nums'] }}>{fmt(r.kg)} kg · {r.reps}</Meta> : null}
                  </View>
                  <Meta style={{ fontSize: 14 }}>{r.delta}</Meta>
                  <Meta style={{ fontSize: 14, color: col }}>{r.next}</Meta>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
      {props.length ? (
        <View>
          <H3>Charges pour la prochaine fois</H3>
          <Meta>Appliqué à l'exercice, donc à toutes les séances qui l'utilisent.</Meta>
          {props.map((p, k) => (
            <Pressable
              key={p.ex}
              onPress={() => setOn((o) => o.map((v, i) => (i === k ? !v : v)))}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on[k] }}
              style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: t.line, marginTop: k ? 0 : 8 }}
            >
              <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: on[k] ? t.accent : t.line, backgroundColor: on[k] ? t.accent : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                {on[k] ? <Text style={{ color: t.accentInk, fontWeight: '800' }}>✓</Text> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Body style={{ fontWeight: '700' }}>{data.exercises[p.ex]?.name}</Body>
                <Meta>{p.text}</Meta>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Field label="Note (optionnel)" value={note} onChangeText={setNote} placeholder="Sensations, sommeil, douleur…" multiline style={{ minHeight: 64, textAlignVertical: 'top' }} />
      {!doneSets ? <Meta>Valide au moins une série (✓) pour enregistrer.</Meta> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn kind="ghost" label="Continuer" onPress={onClose} style={{ flex: 1 }} />
        <Btn label="Enregistrer" onPress={save} disabled={!doneSets} style={{ flex: 1 }} />
      </View>
      <View style={{ alignItems: 'center' }}>
        <LinkBtn
          color={t.bad}
          label={confirmAb ? "Confirmer l'abandon de la séance" : 'Abandonner la séance'}
          onPress={() => {
            if (!confirmAb) return setConfirmAb(true);
            onClose();
            abandonWorkout();
            go('seances');
            toast('Séance abandonnée');
          }}
        />
      </View>
    </Sheet>
  );
}
