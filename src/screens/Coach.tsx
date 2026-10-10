import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Btn, Card, Chip, Eyebrow, H1, H3, Meta, useNav } from '../ui';
import { askOpenAI, ChatMsg, CoachError, getKey, rules } from '../coach';

const STARTERS = ['Analyse ma dernière séance', 'Sur quels exercices je stagne ?', 'Quelles charges monter la semaine prochaine ?', 'Mon programme est-il équilibré ?'];

/** Rendu minimal du markdown renvoyé par le modèle : gras, listes, titres. */
function Md({ text, color }: { text: string; color: string }) {
  const lines = text.split('\n');
  return (
    <View style={{ gap: 6 }}>
      {lines.map((ln, i) => {
        if (!ln.trim()) return null;
        const li = ln.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)/);
        const hd = ln.match(/^#{1,4}\s+(.*)/);
        const raw = li ? li[1] : hd ? hd[1] : ln;
        const parts = raw.split(/\*\*(.+?)\*\*/g);
        const inner = parts.map((p, k) => (
          <Text key={k} style={{ fontWeight: k % 2 || hd ? '700' : '400' }}>
            {p}
          </Text>
        ));
        return (
          <Text key={i} style={{ color, fontSize: 16, lineHeight: 22 }}>
            {li ? '•  ' : ''}
            {inner}
          </Text>
        );
      })}
    </View>
  );
}

export function Coach() {
  const t = useTheme();
  const ins = useSafeAreaInsets();
  const { data } = useStore();
  const { go, toast } = useNav();
  const [chat, setChat] = useState<(ChatMsg & { err?: boolean })[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const ctl = useRef<AbortController | null>(null);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    getKey().then((k) => setHasKey(!!k)).catch(() => setHasKey(false));
  }, []);

  const send = async (q: string) => {
    q = q.trim();
    if (!q || busy) return;
    const key = await getKey().catch(() => null);
    if (!key) return setHasKey(false);
    const history: ChatMsg[] = [...chat.filter((m) => !m.err).map(({ role, content }) => ({ role, content })), { role: 'user', content: q }];
    setChat((c) => [...c, { role: 'user', content: q }]);
    setInput('');
    setBusy(true);
    ctl.current = new AbortController();
    try {
      const answer = await askOpenAI(key, data.settings.model, rules(data), history, ctl.current.signal);
      setChat((c) => [...c, { role: 'assistant', content: answer }]);
    } catch (e: any) {
      if (e?.name !== 'AbortError') setChat((c) => [...c, { role: 'assistant', content: e instanceof CoachError ? e.message : 'Réponse interrompue, réessaie.', err: true }]);
    } finally {
      setBusy(false);
      ctl.current = null;
    }
  };

  const copy = async () => {
    await Clipboard.setStringAsync(rules(data) + '\n\nPremière question : analyse ma progression et dis-moi quelles charges monter.');
    toast('Données copiées : colle-les dans ChatGPT');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scroll}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={{ paddingTop: ins.top + 16, paddingHorizontal: 16, paddingBottom: 16, gap: 14, maxWidth: 680, width: '100%', alignSelf: 'center' }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
          <View>
            <Eyebrow>Propulsé par ChatGPT</Eyebrow>
            <H1>Coach</H1>
          </View>
          {chat.length ? <Btn small kind="ghost" label="Nouvelle conversation" onPress={() => { ctl.current?.abort(); setChat([]); }} /> : null}
        </View>

        {hasKey === false ? (
          <Card>
            <H3>Connecte ton compte OpenAI</H3>
            <Meta>Le coach utilise l'API OpenAI avec ta propre clé, qui reste sur ce téléphone. Chaque question coûte environ un centime ou moins.</Meta>
            <Btn label="Ajouter ma clé dans Réglages" onPress={() => go('reglages')} />
          </Card>
        ) : null}

        {!chat.length ? (
          <>
            <Meta>Le coach lit ton catalogue, tes séances types et tes 15 dernières séances.</Meta>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {STARTERS.map((s) => (
                <Chip key={s} label={s} onPress={() => send(s)} />
              ))}
            </View>
          </>
        ) : null}

        {chat.map((m, i) =>
          m.role === 'user' ? (
            <View key={i} style={{ alignSelf: 'flex-end', maxWidth: '88%', backgroundColor: t.accent, borderRadius: 14, borderBottomRightRadius: 4, padding: 12 }}>
              <Text style={{ color: t.accentInk, fontSize: 16, lineHeight: 22 }}>{m.content}</Text>
            </View>
          ) : (
            <View key={i} style={{ alignSelf: 'flex-start', maxWidth: '94%', backgroundColor: m.err ? t.badSoft : t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 14, borderBottomLeftRadius: 4, padding: 12 }}>
              <Md text={m.content} color={t.ink} />
            </View>
          ),
        )}
        {busy ? (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <ActivityIndicator color={t.accent} />
            <Meta>Le coach réfléchit…</Meta>
          </View>
        ) : null}

        <Card>
          <H3>Dans l'app ChatGPT</H3>
          <Meta>Copie tes données avec les consignes du coach, puis colle-les dans une conversation ChatGPT.</Meta>
          <Btn small kind="ghost" label="Copier mes données" onPress={copy} />
        </Card>
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 96, borderTopWidth: 1, borderTopColor: t.line, backgroundColor: t.bg }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ex. : je bloque à 60 kg au couché, que faire ?"
          placeholderTextColor={t.muted}
          multiline
          style={{ flex: 1, minHeight: 46, maxHeight: 140, borderWidth: 1, borderColor: t.line, borderRadius: 12, backgroundColor: t.surface, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12, color: t.ink, fontSize: 16 }}
        />
        {busy ? <Btn kind="ghost" label="Stop" onPress={() => ctl.current?.abort()} /> : <Btn label="Envoyer" onPress={() => send(input)} disabled={!input.trim()} />}
      </View>
    </KeyboardAvoidingView>
  );
}
