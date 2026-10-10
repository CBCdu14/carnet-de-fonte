import React, { createContext, useContext } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import { buzz } from './platform/buzz';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme, useTheme } from './theme';
import type { Exercise, Tab } from './types';
import { BAR, fmt, loadLabel, platesPerSide } from './logic';

/* ---------- navigation + toast ---------- */
export interface Nav {
  tab: Tab;
  go: (t: Tab) => void;
  toast: (msg: string) => void;
  startRest: () => void;
}
export const NavCtx = createContext<Nav>({ tab: 'seances', go: () => {}, toast: () => {}, startRest: () => {} });
export const useNav = () => useContext(NavCtx);

/* ---------- type ---------- */
export function H1(p: TextProps) {
  const t = useTheme();
  return <Text {...p} style={[{ color: t.ink, fontSize: 32, fontWeight: '800', letterSpacing: -0.5, textTransform: 'uppercase' }, p.style]} />;
}
export function H2(p: TextProps) {
  const t = useTheme();
  return <Text {...p} style={[{ color: t.ink, fontSize: 20, fontWeight: '800', textTransform: 'uppercase' }, p.style]} />;
}
export function H3(p: TextProps) {
  const t = useTheme();
  return <Text {...p} style={[{ color: t.ink, fontSize: 15, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 }, p.style]} />;
}
export function Eyebrow(p: TextProps) {
  const t = useTheme();
  return <Text {...p} style={[{ color: t.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.4 }, p.style]} />;
}
export function Body(p: TextProps) {
  const t = useTheme();
  return <Text {...p} style={[{ color: t.ink, fontSize: 16, lineHeight: 22 }, p.style]} />;
}
export function Meta(p: TextProps) {
  const t = useTheme();
  return <Text {...p} style={[{ color: t.muted, fontSize: 14, lineHeight: 19, fontVariant: ['tabular-nums'] }, p.style]} />;
}

/* ---------- buttons ---------- */
type BtnKind = 'primary' | 'ghost' | 'danger';
export function Btn({
  label,
  onPress,
  kind = 'primary',
  small,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: BtnKind;
  small?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.accent : kind === 'danger' ? t.bad : 'transparent';
  const fg = kind === 'ghost' ? t.ink : kind === 'danger' ? t.surface : t.accentInk;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderColor: kind === 'ghost' ? t.line : bg,
          borderWidth: 1,
          borderRadius: 999,
          paddingVertical: small ? 7 : 11,
          paddingHorizontal: small ? 14 : 18,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
          alignItems: 'center',
        },
        style,
      ]}
    >
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 14 : 16 }}>{label}</Text>
    </Pressable>
  );
}

export function LinkBtn({ label, onPress, color }: { label: string; onPress: () => void; color?: string }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button">
      <Text style={{ color: color ?? t.accent, fontWeight: '700', fontSize: 15, paddingVertical: 4 }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, onPress, active }: { label: string; onPress: () => void; active?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: active ? t.accent : t.line,
        backgroundColor: active ? t.accent : t.surface,
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 14,
      }}
    >
      <Text style={{ color: active ? t.accentInk : t.ink, fontSize: 14, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

/* ---------- surfaces ---------- */
export function Card({ children, style, pad = true }: { children: React.ReactNode; style?: ViewStyle; pad?: boolean }) {
  const t = useTheme();
  return (
    <View
      style={[
        { backgroundColor: t.surface, borderColor: t.line, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: 14, overflow: 'hidden' },
        pad && { padding: 16, gap: 10 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Empty({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line, borderRadius: 12, padding: 24, alignItems: 'center', gap: 10 }}>
      <H3>{title}</H3>
      <Meta style={{ textAlign: 'center' }}>{text}</Meta>
      {action}
    </View>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.accentSoft, borderRadius: 10, padding: 14 }}>
      <Text style={{ color: t.ink, fontSize: 15, lineHeight: 21 }}>{children}</Text>
    </View>
  );
}

export function Screen({ children, header }: { children: React.ReactNode; header?: React.ReactNode }) {
  const t = useTheme();
  const ins = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ paddingTop: ins.top + 16, paddingBottom: 120, paddingHorizontal: 16, gap: 16, maxWidth: 680, width: '100%', alignSelf: 'center' }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {header}
      {children}
    </ScrollView>
  );
}

export function Header({ eyebrow, title, right }: { eyebrow: string; title: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <View style={{ flexShrink: 1 }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <H1>{title}</H1>
      </View>
      {right}
    </View>
  );
}

/* ---------- inputs ---------- */
export function Field(props: TextInputProps & { label?: string }) {
  const t = useTheme();
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 4, flex: 1 }}>
      {label ? <Meta style={{ fontWeight: '600' }}>{label}</Meta> : null}
      <TextInput
        placeholderTextColor={t.muted}
        {...rest}
        style={[{ borderWidth: 1, borderColor: t.line, borderRadius: 10, backgroundColor: t.bg, paddingHorizontal: 12, paddingVertical: 11, color: t.ink, fontSize: 16 }, style]}
      />
    </View>
  );
}

/* ---------- load control ---------- */
export function LoadCtl({ ex, onChange }: { ex: Exercise; onChange: (dir: 1 | -1) => void }) {
  const t = useTheme();
  const tap = (dir: 1 | -1) => {
    buzz('tick');
    onChange(dir);
  };
  const b = (dir: 1 | -1, label: string, a11y: string) => (
    <Pressable
      onPress={() => tap(dir)}
      accessibilityLabel={a11y}
      hitSlop={4}
      style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: pressed ? t.accent : t.surface, alignItems: 'center', justifyContent: 'center' })}
    >
      {({ pressed }) => <Text style={{ fontSize: 22, fontWeight: '700', color: pressed ? t.accentInk : t.ink, marginTop: -2 }}>{label}</Text>}
    </Pressable>
  );
  const lbl = loadLabel(ex);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.sunk, borderRadius: 999, padding: 3 }}>
      {b(-1, '−', `Baisser la charge de ${ex.name}`)}
      <View style={{ width: 76, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
        <Text style={{ color: t.ink, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{lbl}</Text>
        {lbl !== 'PdC' ? <Text style={{ color: t.muted, fontSize: 11, fontWeight: '700', marginLeft: 2, marginTop: 6 }}>kg</Text> : null}
      </View>
      {b(1, '+', `Monter la charge de ${ex.name}`)}
    </View>
  );
}

const PLATE_STYLE: Record<number, { key: keyof Theme; h: number }> = {
  25: { key: 'p25', h: 30 },
  20: { key: 'p20', h: 30 },
  15: { key: 'p15', h: 26 },
  10: { key: 'p10', h: 22 },
  5: { key: 'p5', h: 17 },
  2.5: { key: 'p2', h: 14 },
  1.25: { key: 'p1', h: 11 },
};
export function Plates({ ex }: { ex?: Exercise }) {
  const t = useTheme();
  if (!ex || ex.equip !== 'barre') return null;
  if (ex.load <= BAR) return <Meta>Barre seule ({BAR} kg)</Meta>;
  const { plates, missing } = platesPerSide(ex.load);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        <View style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: t.muted }} />
        {plates.map((p, i) => (
          <View key={i} style={{ width: 7, height: PLATE_STYLE[p].h, borderRadius: 2, backgroundColor: t[PLATE_STYLE[p].key], borderWidth: StyleSheet.hairlineWidth, borderColor: t.muted }} />
        ))}
      </View>
      <Meta>
        par côté : {plates.map(fmt).join(' + ')}
        {missing ? ` (+${fmt(missing)} manquant)` : ''}
      </Meta>
    </View>
  );
}

/* ---------- sheet ---------- */
export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const t = useTheme();
  const ins = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer">
          <View style={{ flex: 1, backgroundColor: 'rgba(8,10,12,0.5)' }} />
        </Pressable>
        <View style={{ backgroundColor: t.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '90%', width: '100%', maxWidth: 560, alignSelf: 'center' }}>
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: ins.bottom + 20, gap: 14 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }, style]}>{children}</View>;
}
