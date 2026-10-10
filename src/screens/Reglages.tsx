import React, { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { exportBackup, pickBackup } from '../platform/backup';
import Constants from 'expo-constants';
import { useStore } from '../store';
import { Btn, Card, Chip, Field, H3, Header, Meta, NavBtn, Screen, Body, useNav } from '../ui';
import { getKey, setKey } from '../coach';
import { getGhToken, setGhToken } from '../garmin';
import { useGarminSync } from '../useGarminSync';
import { useCloudSync } from '../useCloudSync';
import { fDateL } from '../logic';
import { dayStr } from '../logic';
import type { Data } from '../types';

const restLabel = (s: number) => (s < 120 ? `${s} s` : `${Math.floor(s / 60)} min${s % 60 ? ' ' + (s % 60) : ''}`);

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
  const [repo, setRepo] = useState(data.settings.garminRepo);
  const [gh, setGh] = useState('');
  const [hasGh, setHasGh] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncGarmin = useGarminSync();
  const syncCloud = useCloudSync();

  useEffect(() => {
    getKey().then((k) => setHasKey(!!k)).catch(() => {});
    getGhToken().then((k) => setHasGh(!!k)).catch(() => {});
  }, []);

  const saveGarmin = async () => {
    const r = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
    if (!/^[\w.-]+\/[\w.-]+$/.test(r)) return toast('Dépôt attendu au format pseudo/carnet-data.');
    if (gh.trim()) {
      await setGhToken(gh.trim());
      setGh('');
      setHasGh(true);
    }
    setRepo(r);
    setSettings({ garminRepo: r });
    toast('Synchro configurée');
  };
  const runSync = async () => {
    setSyncing(true);
    const err = await syncCloud();
    const errG = await syncGarmin();
    setSyncing(false);
    toast(err ?? (errG && !/introuvable/.test(errG) ? errG : 'Synchronisé'));
  };
  // Première synchro dès que dépôt et jeton sont renseignés
  useEffect(() => {
    if (data.settings.garminRepo && hasGh && !data.meta.syncedAt) runSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.settings.garminRepo, hasGh]);
  const t2 = (ms: number) => {
    const d = new Date(ms);
    return `${fDateL(ms)} à ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

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
    <Screen header={<Header title="Réglages" left={<NavBtn label="‹ Séances" onPress={() => go('seances')} />} />}>
      <Card>
        <H3>Synchro entre appareils et Garmin</H3>
        <Meta>
          {data.meta.syncedAt
            ? `Dernière synchro : ${t2(data.meta.syncedAt)}${data.meta.rev !== data.meta.syncedRev ? ' · modifications en attente' : ''}.`
            : 'Tes séances, exercices et charges sont enregistrés dans ton dépôt GitHub privé carnet-data : tous tes appareils retrouvent les mêmes données. Renseigne le même dépôt et le même jeton sur chaque appareil.'}
          {data.meta.lastError ? <Text style={{ color: '#FF3B30' }}>{`\n${data.meta.lastError}`}</Text> : null}
          {data.garmin ? `\nGarmin : données du ${data.garmin.updatedAt ? fDateL(data.garmin.updatedAt) : '?'} (${data.garmin.days.length} jours, ${data.garmin.weights.length} pesées, ${data.garmin.activities.length} activités).` : ''}
        </Meta>
        <Field label="Dépôt GitHub privé" value={repo} onChangeText={setRepo} placeholder="pseudo/carnet-data" autoCapitalize="none" autoCorrect={false} />
        <Field
          label={hasGh ? 'Remplacer le jeton GitHub' : 'Jeton GitHub (Contents : lecture et écriture)'}
          value={gh}
          onChangeText={setGh}
          placeholder="github_pat_…"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Btn small label="Enregistrer" onPress={saveGarmin} disabled={!repo.trim() || (!hasGh && !gh.trim())} />
          {data.settings.garminRepo && hasGh ? <Btn small kind="ghost" label={syncing ? 'Synchro…' : 'Synchroniser maintenant'} onPress={runSync} disabled={syncing} /> : null}
        </View>
      </Card>

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
        <Meta>Le chrono se lance quand tu valides une série.</Meta>
        <Meta style={{ fontWeight: '600', marginTop: 4 }}>Entre deux séries</Meta>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {[60, 90, 120, 150, 180, 240].map((s) => (
            <Chip key={s} label={restLabel(s)} active={data.settings.restSec === s} onPress={() => setSettings({ restSec: s })} />
          ))}
        </View>
        <Meta style={{ fontWeight: '600', marginTop: 4 }}>Entre deux exercices</Meta>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {[60, 90, 120, 150, 180, 240].map((s) => (
            <Chip key={s} label={restLabel(s)} active={data.settings.restExSec === s} onPress={() => setSettings({ restExSec: s })} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 }}>
          <Chip label={data.settings.sound ? 'Bip de fin : activé' : 'Bip de fin : coupé'} active={data.settings.sound} onPress={() => setSettings({ sound: !data.settings.sound })} />
        </View>
        <Meta style={{ fontSize: 13 }}>Sur iPhone, le bip ne sonne pas si le mode silencieux est activé.</Meta>
      </Card>

      <Card>
        <H3>Sauvegarde</H3>
        <Meta>
          Copie de secours de tes données ({Object.keys(data.exercises).length} exercices, {data.workouts.length} séances types, {data.logs.length} séances enregistrées). Importer une sauvegarde remplace tout, y compris sur tes autres appareils synchronisés.
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
