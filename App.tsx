import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeepAwake } from './src/platform/keepAwake';
import { buzz } from './src/platform/buzz';
import Svg, { Circle, Path } from 'react-native-svg';
import { StoreProvider, useStore } from './src/store';
import { useTheme } from './src/theme';
import { NavCtx, type Nav } from './src/ui';
import { pad } from './src/logic';
import type { Tab } from './src/types';
import { Seances } from './src/screens/Seances';
import { Session } from './src/screens/Session';
import { Exercices } from './src/screens/Exercices';
import { Progres } from './src/screens/Progres';
import { Coach } from './src/screens/Coach';
import { Reglages } from './src/screens/Reglages';
import { useGarminSync } from './src/useGarminSync';

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
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const toast = useCallback((m: string) => {
    setToastMsg(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2400);
  }, []);
  const restSec = data.settings.restSec;
  const nav = useMemo<Nav>(
    () => ({ tab, go: setTab, toast, startRest: () => { setRestEnd(Date.now() + restSec * 1000); setNow(Date.now()); } }),
    [tab, toast, restSec],
  );

  // Minuteur de repos
  useEffect(() => {
    if (!restEnd) return;
    const i = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(i);
  }, [restEnd]);
  useEffect(() => {
    if (restEnd && now >= restEnd) {
      setRestEnd(null);
      buzz('alert');
      toast('Repos terminé : série suivante');
    }
  }, [now, restEnd, toast]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setNow(Date.now()));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!data.active) setRestEnd(null);
  }, [data.active]);

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

        {restEnd ? (
          <View style={{ position: 'absolute', bottom: ins.bottom + 76, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.ink, borderRadius: 999, paddingVertical: 8, paddingLeft: 18, paddingRight: 8 }}>
            <Text style={{ color: t.bg, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
              Repos {Math.floor(left / 60)}:{pad(left % 60)}
            </Text>
            <Pressable onPress={() => setRestEnd((e) => (e ? e + 30000 : e))} style={{ backgroundColor: t.bg, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}>
              <Text style={{ color: t.ink, fontWeight: '700' }}>+30 s</Text>
            </Pressable>
            <Pressable onPress={() => setRestEnd(null)} style={{ backgroundColor: t.bg, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}>
              <Text style={{ color: t.ink, fontWeight: '700' }}>Passer</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.line, paddingBottom: ins.bottom }}>
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
