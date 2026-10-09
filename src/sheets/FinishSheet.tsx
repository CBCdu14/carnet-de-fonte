import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Btn, Field, H2, H3, Meta, Sheet, Body, useNav } from '../ui';
import { fmt, parseNum, proposals } from '../logic';

export function FinishSheet({ onClose }: { onClose: () => void }) {
  const t = useTheme();
  const { data, finishWorkout, abandonWorkout } = useStore();
  const { go, toast } = useNav();
  const a = data.active!;
  const props = useMemo(() => proposals(a, data.exercises), [a, data.exercises]);
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <Btn
          kind={confirmAb ? 'danger' : 'ghost'}
          style={{ marginRight: 'auto' }}
          label={confirmAb ? "Confirmer l'abandon" : 'Abandonner'}
          onPress={() => {
            if (!confirmAb) return setConfirmAb(true);
            onClose();
            abandonWorkout();
            go('seances');
            toast('Séance abandonnée');
          }}
        />
        <Btn kind="ghost" label="Continuer" onPress={onClose} />
        <Btn label="Enregistrer" onPress={save} disabled={!doneSets} />
      </View>
    </Sheet>
  );
}
