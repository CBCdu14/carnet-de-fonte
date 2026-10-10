import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeepAwake } from './src/platform/keepAwake';
import { buzz } from './src/platform/buzz';
import Svg, { Circle, Path } from 'react-native-svg';
import { StoreProvider, useStore } from './src/store';
import { useTheme } from './src/theme';
import { NavCtx, type Nav } from './src/ui';
import { pad } from './src/logic';
import { beep } from './src/platform/beep';
import type { Tab } from './src/types';
import { Seances } from './src/screens/Seances';
import { Session } from './src/screens/Session';
import { Exercices } from './src/screens/Exercices';
import { Progres } from './src/screens/Progres';
import { Coach } from './src/screens/Coach';
import { Reglages } from './src/screens/Reglages';
import { useGarminSync } from './src/useGarminSync';
import { useCloudSync } from './src/useCloudSync';

/* Barre d'onglets translucide façon iOS (web : flou d'arrière-plan) */
const TAB_BLUR: any = Platform.OS === 'web' ? { backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)' } : null;

function TabIcon({ k, color }: { k: Tab; color: string }) {
  const s = { stroke: color, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {k === 'seances' ? <Path d="M3 10h2v4H3zM19 10h2v4h-2zM6 7h2v10H6zM16 7h2v10h-2zM8 11h8v2H8z" fill={color} /> : null}
      {k === 'seance' ? (
        <>
          <Circle cx={12} cy={13} r={8} {...s} />
          <Path d="M12 9v4l3 2M10 2h4" {...s} />
        </>
      ) : null}
      {k === 'exos' ? <Path d="M4 6h16M4 12h16M4 18h10" {...s} /> : null}
      {k === 'progres' ? <Path d="M3 19l6-6 4 3 8-9M16 7h5v5" {...s} /> : null}
      {k === 'coach' ? <Path d="M4 5h16v11H9l-5 4zM8 10h8M8 13h5" {...s} /> : null}
    </Svg>
  );
}

function Shell() {
  const t = useTheme();
  const ins = useSafeAreaInsets();
  const { data } = useStore();
  const [tab, setTab] = useState<Tab>(data.active ? 'seance' : 'seances');
  useGarminSync(true);
  useCloudSync(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { updateActive } = useStore();
  const rest = data.active?.rest;
  const restEnd = rest?.end ?? null;
  const [now, setNow] = useState(Date.now());
  const lastTick = useRef(0);

  const toast = useCallback((m: string) => {
    setToastMsg(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2400);
  }, []);
  const nav = useMemo<Nav>(() => ({ tab, go: setTab, toast, startRest: () => {} }), [tab, toast]);

  // Minuteur de repos (gardé dans la séance en cours : il survit à la fermeture de l'appli)
  useEffect(() => {
    if (!restEnd) return;
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, [restEnd]);
  useEffect(() => {
    if (!restEnd) return;
    const left = Math.ceil((restEnd - now) / 1000);
    if (left <= 0) {
      updateActive((x) => (x.rest && x.rest.end === restEnd ? { ...x, rest: undefined } : x));
      buzz('alert');
      if (data.settings.sound) beep('end');
      if (tab !== 'seance' || data.active?.view === 'list') toast(rest?.kind === 'ex' ? 'Repos terminé : exercice suivant' : 'Repos terminé : série suivante');
    } else if (left <= 3 && left !== lastTick.current) {
      lastTick.current = left;
      if (data.settings.sound) beep('tick');
    }
  }, [now, restEnd]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setNow(Date.now()));
    return () => sub.remove();
  }, []);

  const current: Tab = tab === 'seance' && !data.active ? 'seances' : tab;
  const tabs: [Tab, string][] = [['seances', 'Séances'], ...(data.active ? ([['seance', 'En cours']] as [Tab, string][]) : []), ['exos', 'Exercices'], ['progres', 'Progrès'], ['coach', 'Coach']];
  const left = restEnd ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : 0;

  return (
    <NavCtx.Provider value={nav}>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <StatusBar style="auto" />
        {data.active ? <KeepAwake /> : null}
        <View style={{ flex: 1 }}>
          {current === 'seances' && <Seances />}
          {current === 'seance' && <Session />}
          {current === 'exos' && <Exercices />}
          {current === 'progres' && <Progres />}
          {current === 'coach' && <Coach />}
          {current === 'reglages' && <Reglages />}
        </View>

        {restEnd && now < restEnd && !(current === 'seance' && (data.active?.view ?? 'focus') === 'focus') ? (
          <View style={{ position: 'absolute', bottom: ins.bottom + 76, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.ink, borderRadius: 999, paddingVertical: 8, paddingLeft: 18, paddingRight: 8 }}>
            <Text style={{ color: t.bg, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
              Repos {Math.floor(left / 60)}:{pad(left % 60)}
            </Text>
            <Pressable onPress={() => updateActive((x) => (x.rest ? { ...x, rest: { ...x.rest, end: x.rest.end + 30000, total: x.rest.total + 30 } } : x))} style={{ backgroundColor: t.bg, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}>
              <Text style={{ color: t.ink, fontWeight: '700' }}>+30 s</Text>
            </Pressable>
            <Pressable onPress={() => updateActive((x) => ({ ...x, rest: undefined }))} style={{ backgroundColor: t.bg, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}>
              <Text style={{ color: t.ink, fontWeight: '700' }}>Passer</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: Platform.OS === 'web' ? t.surface + 'D9' : t.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line, paddingBottom: Math.max(ins.bottom - 6, 6) }, TAB_BLUR]}>
          <View style={{ flexDirection: 'row', maxWidth: 680, width: '100%', alignSelf: 'center' }}>
            {tabs.map(([k, label]) => {
              const on = current === k;
              const color = on ? t.accent : k === 'seance' ? t.good : t.muted;
              return (
                <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: 'center', paddingTop: 9, paddingBottom: 10, gap: 3 }}>
                  <TabIcon k={k} color={color} />
                  <Text style={{ color, fontSize: 10, fontWeight: '500' }} numberOfLines={1}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {toastMsg ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: ins.top + 10, left: 16, right: 16, alignItems: 'center' }}>
            <View style={{ backgroundColor: t.ink, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18 }}>
              <Text style={{ color: t.bg, fontWeight: '700', fontSize: 15, textAlign: 'center' }}>{toastMsg}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </NavCtx.Provider>
  );
}

function Loading() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
      <ActivityIndicator color={t.accent} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider fallback={<Loading />}>
        <Shell />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
