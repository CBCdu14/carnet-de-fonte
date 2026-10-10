import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { exportBackup, pickBackup } from '../platform/backup';
import Constants from 'expo-constants';
import { useStore } from '../store';
import { Btn, Card, Chip, Field, H3, Header, Meta, Screen, Body, useNav } from '../ui';
import { getKey, setKey } from '../coach';
import { dayStr } from '../logic';
import type { Data } from '../types';

function validBackup(x: any): x is Pick<Data, 'exercises' | 'workouts' | 'logs'> {
  return x && typeof x === 'object' && x.exercises && typeof x.exercises === 'object' && Array.isArray(x.workouts) && Array.isArray(x.logs);
}

export function Reglages() {
  const { data, setSettings, replaceAll } = useStore();
  const { go, toast } = useNav();
  const [key, setKeyText] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [model, setModel] = useState(data.settings.model);
  const [pending, setPending] = useState<Pick<Data, 'exercises' | 'workouts' | 'logs'> | null>(null);

  useEffect(() => {
    getKey().then((k) => setHasKey(!!k)).catch(() => {});
  }, []);

  const saveKey = async () => {
    const k = key.trim();
    if (!k.startsWith('sk-')) return toast('Une clé OpenAI commence par « sk- ».');
    await setKey(k);
    setKeyText('');
    setHasKey(true);
    toast('Clé enregistrée sur ce téléphone');
  };

  const exportData = async () => {
    try {
      const json = JSON.stringify({ app: 'carnet-de-fonte', version: 1, exportedAt: new Date().toISOString(), exercises: data.exercises, workouts: data.workouts, logs: data.logs }, null, 1);
      const err = await exportBackup(`carnet-de-fonte-${dayStr(new Date())}.json`, json);
      if (err) toast(err);
    } catch {
      toast("L'export a échoué, réessaie.");
    }
  };

  const importData = async () => {
    try {
      const text = await pickBackup();
      if (text == null) return;
      const json = JSON.parse(text);
      if (!validBackup(json)) return toast("Ce fichier n'est pas une sauvegarde du carnet.");
      setPending(json);
    } catch {
      toast('Impossible de lire ce fichier.');
    }
  };

  return (
    <Screen header={<Header eyebrow="Carnet de fonte" title="Réglages" right={<Btn small kind="ghost" label="← Séances" onPress={() => go('seances')} />} />}>
      <Card>
        <H3>Coach ChatGPT</H3>
        <Meta>
          {hasKey
            ? Platform.OS === 'web'
              ? 'Une clé OpenAI est enregistrée sur ce téléphone, dans les données de l\'appli.'
              : 'Une clé OpenAI est enregistrée (chiffrée dans le trousseau du téléphone).'
            : 'Crée une clé sur platform.openai.com → API keys, ajoute un peu de crédit, puis colle-la ici.'}
        </Meta>
        <Field
          label={hasKey ? 'Remplacer la clé' : 'Clé API OpenAI'}
          value={key}
          onChangeText={setKeyText}
          placeholder="sk-…"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Btn small label="Enregistrer la clé" onPress={saveKey} disabled={!key.trim()} />
          {hasKey ? (
            <Btn
              small
              kind="ghost"
              label="Supprimer la clé"
              onPress={async () => {
                await setKey('');
                setHasKey(false);
                toast('Clé supprimée');
              }}
            />
          ) : null}
        </View>
        <Field label="Modèle" value={model} onChangeText={setModel} autoCapitalize="none" autoCorrect={false} onEndEditing={() => model.trim() && setSettings({ model: model.trim() })} />
        <Meta>Par défaut gpt-5-mini (rapide et bon marché). Tu peux mettre un autre modèle de ton compte OpenAI.</Meta>
      </Card>

      <Card>
        <H3>Temps de repos</H3>
        <Meta>Lancé automatiquement quand tu valides une série.</Meta>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {[60, 90, 120, 150, 180, 240].map((s) => (
            <Chip key={s} label={s < 120 ? `${s} s` : `${Math.floor(s / 60)} min${s % 60 ? ' ' + (s % 60) : ''}`} active={data.settings.restSec === s} onPress={() => setSettings({ restSec: s })} />
          ))}
        </View>
      </Card>

      <Card>
        <H3>Sauvegarde</H3>
        <Meta>
          Tes données sont stockées uniquement sur ce téléphone ({Object.keys(data.exercises).length} exercices, {data.workouts.length} séances types, {data.logs.length} séances enregistrées). Exporte-les de temps en temps (iCloud Drive, Google Drive, mail…) et
          réimporte-les pour changer de téléphone.
        </Meta>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Btn small label="Exporter" onPress={exportData} />
          <Btn small kind="ghost" label="Importer une sauvegarde" onPress={importData} />
        </View>
        {pending ? (
          <View style={{ gap: 8 }}>
            <Body>
              Remplacer toutes les données actuelles par cette sauvegarde ({Object.keys(pending.exercises).length} exercices, {pending.workouts.length} séances types, {pending.logs.length} séances) ?
            </Body>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn small kind="ghost" label="Annuler" onPress={() => setPending(null)} />
              <Btn
                small
                kind="danger"
                label="Remplacer"
                onPress={() => {
                  replaceAll(pending);
                  setPending(null);
                  toast('Sauvegarde importée');
                }}
              />
            </View>
          </View>
        ) : null}
      </Card>

      <Meta style={{ textAlign: 'center' }}>Carnet de Fonte · version {Constants.expoConfig?.version ?? '1.0.0'}</Meta>
    </Screen>
  );
}
