import React, { useState } from 'react';
import { View } from 'react-native';
import { useStore } from '../store';
import { Btn, Chip, Field, H2, Meta, Sheet, useNav } from '../ui';
import { DEF_PROG, EQUIP, MUSCLES, STEPS, fmt, parseNum, sharedCount } from '../logic';
import type { Equip } from '../types';

export function ExerciseForm({
  id,
  onSaved,
  onCancel,
  submitLabel = 'Enregistrer',
}: {
  id?: string;
  onSaved: (id: string) => void;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const { data, saveExercise, deleteExercise } = useStore();
  const { toast } = useNav();
  const ex = id ? data.exercises[id] : undefined;
  const [name, setName] = useState(ex?.name ?? '');
  const [muscle, setMuscle] = useState(ex?.muscle ?? 'Pectoraux');
  const [equip, setEquip] = useState<Equip>(ex?.equip ?? 'barre');
  const [step, setStep] = useState(ex?.step ?? 2.5);
  const [load, setLoad] = useState(ex ? fmt(ex.load) : '20');
  const [setup, setSetup] = useState(ex?.setup ?? '');
  const [pMin, setPMin] = useState(String(ex?.prog?.min ?? DEF_PROG.min));
  const [pMax, setPMax] = useState(String(ex?.prog?.max ?? DEF_PROG.max));
  const [pCur, setPCur] = useState(ex?.prog ? String(ex.prog.reps) : '');
  const [confirmDel, setConfirmDel] = useState(false);
  const n = id ? sharedCount(data.workouts, id) : 0;

  const submit = () => {
    if (!name.trim()) return toast("Donne un nom à l'exercice.");
    const min = Math.max(1, parseInt(pMin) || DEF_PROG.min);
    const max = Math.max(min, parseInt(pMax) || DEF_PROG.max);
    const cur = parseInt(pCur);
    const prog = ex?.prog || cur ? { min, max, reps: Math.min(max, Math.max(min, cur || ex?.prog?.reps || min)), hits: ex?.prog && ex.prog.reps === (cur || ex.prog.reps) ? ex.prog.hits : 0 } : undefined;
    const nid = saveExercise({ id, name: name.trim(), muscle, equip, step, setup, prog, load: Math.max(0, parseNum(load)) });
    toast(id ? 'Exercice mis à jour' : 'Exercice ajouté');
    onSaved(nid);
  };

  return (
    <View style={{ gap: 14 }}>
      <Field label="Nom" value={name} onChangeText={setName} placeholder="Développé couché" />
      <View style={{ gap: 6 }}>
        <Meta style={{ fontWeight: '600' }}>Muscle</Meta>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {MUSCLES.map((m) => (
            <Chip key={m} label={m} active={m === muscle} onPress={() => setMuscle(m)} />
          ))}
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <Meta style={{ fontWeight: '600' }}>Matériel</Meta>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {Object.entries(EQUIP).map(([k, v]) => (
            <Chip
              key={k}
              label={v}
              active={k === equip}
              onPress={() => {
                setEquip(k as Equip);
                if (!ex) setStep(k === 'halteres' ? 1 : k === 'machine' ? 5 : 2.5);
              }}
            />
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field label="Charge de travail (kg)" value={load} onChangeText={setLoad} keyboardType="decimal-pad" />
      </View>
      <Field label="Réglages de la machine" value={setup} onChangeText={setSetup} placeholder="Siège 4, dossier 2, poignées hautes…" />
      <View style={{ gap: 6 }}>
        <Meta style={{ fontWeight: '600' }}>Progression des reps</Meta>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Field label="Mini" value={pMin} onChangeText={setPMin} keyboardType="number-pad" />
          <Field label="Maxi" value={pMax} onChangeText={setPMax} keyboardType="number-pad" />
          <Field label="Objectif actuel" value={pCur} onChangeText={setPCur} keyboardType="number-pad" placeholder="auto" />
        </View>
        <Meta>Quand toutes les séries atteignent le maxi, la charge monte d'un pas et l'objectif repart au mini (2 séances réussies au mini, puis +1 rep par séance réussie).</Meta>
      </View>
      <View style={{ gap: 6 }}>
        <Meta style={{ fontWeight: '600' }}>Pas d'augmentation</Meta>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {STEPS.map((s) => (
            <Chip key={s} label={`${fmt(s)} kg`} active={s === step} onPress={() => setStep(s)} />
          ))}
        </View>
      </View>
      {n ? <Meta>Utilisé dans {n} séance{n > 1 ? 's' : ''} : un changement de charge s'applique partout.</Meta> : null}
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {id ? (
          <Btn
            kind={confirmDel ? 'danger' : 'ghost'}
            style={{ marginRight: 'auto' }}
            label={confirmDel ? (n ? `Supprimer et retirer de ${n} séance${n > 1 ? 's' : ''}` : 'Confirmer') : 'Supprimer'}
            onPress={() => {
              if (!confirmDel) return setConfirmDel(true);
              deleteExercise(id);
              toast('Exercice supprimé');
              onCancel();
            }}
          />
        ) : null}
        <Btn kind="ghost" label="Annuler" onPress={onCancel} />
        <Btn label={submitLabel} onPress={submit} />
      </View>
    </View>
  );
}

export function ExerciseSheet({ id, onClose }: { id?: string; onClose: () => void }) {
  return (
    <Sheet visible onClose={onClose}>
      <H2>{id ? "Modifier l'exercice" : 'Nouvel exercice'}</H2>
      <ExerciseForm id={id} onSaved={onClose} onCancel={onClose} />
    </Sheet>
  );
}
