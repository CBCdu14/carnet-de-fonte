import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect, G } from 'react-native-svg';
import { useTheme } from './theme';

/* Carte des muscles : silhouette stylisée de face et de dos, zones colorées selon l'exercice. */
export type Zone =
  | 'pecs' | 'pecsHaut' | 'epAv' | 'epLat' | 'epArr' | 'biceps' | 'triceps' | 'avantBras' | 'abdos' | 'obliques'
  | 'quads' | 'ischios' | 'fessiers' | 'mollets' | 'dorsaux' | 'trapezes' | 'lombaires' | 'adducteurs';

export const ZONE_LABEL: Record<Zone, string> = {
  pecs: 'Pectoraux', pecsHaut: 'Haut des pectoraux', epAv: 'Avant d\'épaule', epLat: 'Épaules', epArr: 'Arrière d\'épaule',
  biceps: 'Biceps', triceps: 'Triceps', avantBras: 'Avant-bras', abdos: 'Abdominaux', obliques: 'Obliques',
  quads: 'Quadriceps', ischios: 'Ischio-jambiers', fessiers: 'Fessiers', mollets: 'Mollets', dorsaux: 'Dorsaux',
  trapezes: 'Trapèzes', lombaires: 'Lombaires', adducteurs: 'Adducteurs',
};

export interface Muscles { p: Zone[]; s: Zone[] }

const M: [RegExp, Muscles][] = [
  [/leg ?press|presse|squat|fente|hack/i, { p: ['quads', 'fessiers'], s: ['ischios', 'adducteurs', 'mollets'] }],
  [/inclin/i, { p: ['pecsHaut', 'pecs'], s: ['epAv', 'triceps'] }],
  [/d[ée]clin/i, { p: ['pecs'], s: ['triceps', 'epAv'] }],
  [/couch|bench|pompe|push|[ée]cart|pec ?deck|butterfly/i, { p: ['pecs'], s: ['epAv', 'triceps'] }],
  [/tirage vertical|traction|pull ?up|lat ?pull/i, { p: ['dorsaux'], s: ['biceps', 'epArr', 'trapezes', 'avantBras'] }],
  [/tirage horizontal|rowing|row\b|poulie basse/i, { p: ['dorsaux', 'trapezes'], s: ['biceps', 'epArr', 'lombaires'] }],
  [/face ?pull|oiseau|rear|arri[èe]re/i, { p: ['epArr', 'trapezes'], s: ['dorsaux'] }],
  [/l[ée]vation|lateral/i, { p: ['epLat'], s: ['trapezes'] }],
  [/militaire|d[ée]velopp[ée] [ée]paule|overhead|shoulder|nuque/i, { p: ['epAv', 'epLat'], s: ['triceps', 'trapezes'] }],
  [/shrug|haussement/i, { p: ['trapezes'], s: [] }],
  [/leg ?curl|ischio/i, { p: ['ischios'], s: ['mollets', 'fessiers'] }],
  [/leg ?ext|extension (de )?jambe|quadri/i, { p: ['quads'], s: [] }],
  [/fessier|glute|hip ?thrust|kick ?back/i, { p: ['fessiers'], s: ['ischios', 'lombaires'] }],
  [/soulev[ée]|roumain|deadlift|good ?morning|lombaire|hyperext/i, { p: ['ischios', 'fessiers', 'lombaires'], s: ['dorsaux', 'trapezes', 'avantBras'] }],
  [/adduct/i, { p: ['adducteurs'], s: [] }],
  [/abduct/i, { p: ['fessiers'], s: [] }],
  [/mollet|calf/i, { p: ['mollets'], s: [] }],
  [/triceps|dips|barre au front|extension/i, { p: ['triceps'], s: ['epAv'] }],
  [/marteau|hammer/i, { p: ['biceps', 'avantBras'], s: [] }],
  [/curl|biceps/i, { p: ['biceps'], s: ['avantBras'] }],
  [/avant.bras|poignet|wrist/i, { p: ['avantBras'], s: [] }],
  [/oblique|rotation|russian|side/i, { p: ['obliques'], s: ['abdos'] }],
  [/crunch|abdo|gainage|planche|plank|relev[ée]/i, { p: ['abdos'], s: ['obliques'] }],
];
const BY_MUSCLE: [RegExp, Muscles][] = [
  [/pec/i, { p: ['pecs'], s: ['triceps', 'epAv'] }],
  [/dos/i, { p: ['dorsaux'], s: ['biceps', 'trapezes'] }],
  [/[ée]paule/i, { p: ['epLat', 'epAv'], s: ['trapezes'] }],
  [/jambe|cuisse/i, { p: ['quads', 'ischios'], s: ['fessiers'] }],
  [/fessier/i, { p: ['fessiers'], s: ['ischios'] }],
  [/bras/i, { p: ['biceps', 'triceps'], s: ['avantBras'] }],
  [/abdo|gainage/i, { p: ['abdos'], s: ['obliques'] }],
  [/mollet/i, { p: ['mollets'], s: [] }],
];

export function musclesFor(name: string, muscle?: string): Muscles | undefined {
  const byName = M.find(([re]) => re.test(name))?.[1];
  if (byName) return byName;
  return muscle ? BY_MUSCLE.find(([re]) => re.test(muscle))?.[1] : undefined;
}

function rgba(hex: string, a: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* Silhouette 120 × 250. Les zones sont des formes simples, symétriques (gauche/droite). */
function Figure({ back, fill, h }: { back: boolean; fill: (z: Zone) => string | undefined; h: number }) {
  const t = useTheme();
  const body = t.sunk;
  const L = (z: Zone) => fill(z) ?? body;
  // miroir gauche/droite autour de x=60
  const mirror = (el: (sx: number) => React.ReactNode) => (
    <>
      {el(1)}
      <G transform="translate(120 0) scale(-1 1)">{el(-1)}</G>
    </>
  );
  return (
    <Svg width={(h * 120) / 250} height={h} viewBox="0 0 120 250">
      {/* tête, cou, bassin */}
      <Circle cx={60} cy={20} r={14} fill={body} />
      <Rect x={53} y={33} width={14} height={12} rx={4} fill={body} />
      {/* tronc fond */}
      <Path d="M35 46 Q60 40 85 46 L90 110 Q60 120 30 110 Z" fill={body} />
      {back ? (
        <>
          <Path d="M44 46 Q60 42 76 46 L72 64 Q60 70 48 64 Z" fill={L('trapezes')} />
          <Path d="M36 60 L58 66 L58 100 Q46 104 34 96 Z" fill={L('dorsaux')} />
          <Path d="M84 60 L62 66 L62 100 Q74 104 86 96 Z" fill={L('dorsaux')} />
          <Path d="M46 100 Q60 104 74 100 L74 114 Q60 118 46 114 Z" fill={L('lombaires')} />
        </>
      ) : (
        <>
          <Path d="M40 47 Q60 44 80 47 L80 58 Q60 54 40 58 Z" fill={L('pecsHaut')} />
          <Path d="M40 58 Q60 54 80 58 L78 76 Q60 84 42 76 Z" fill={L('pecs')} />
          <Rect x={51} y={78} width={18} height={36} rx={5} fill={L('abdos')} />
          <Path d="M38 78 L49 80 L49 112 Q42 110 36 102 Z" fill={L('obliques')} />
          <Path d="M82 78 L71 80 L71 112 Q78 110 84 102 Z" fill={L('obliques')} />
        </>
      )}
      {mirror(() => (
        <>
          {/* épaule */}
          <Circle cx={30} cy={52} r={10} fill={back ? L('epArr') : L('epLat')} />
          {!back ? <Path d="M22 48 Q30 44 38 48 L36 56 Q30 52 24 56 Z" fill={L('epAv')} /> : null}
          {/* bras */}
          <Path d="M22 60 L36 60 L34 96 L22 96 Z" fill={back ? L('triceps') : L('biceps')} />
          <Path d="M22 98 L33 98 L30 132 L20 132 Z" fill={L('avantBras')} />
          {/* jambe */}
          {back ? (
            <>
              <Path d="M34 112 Q46 108 58 114 L58 130 Q46 134 32 128 Z" fill={L('fessiers')} />
              <Path d="M34 132 L56 132 L54 184 L38 184 Z" fill={L('ischios')} />
            </>
          ) : (
            <>
              <Path d="M34 116 L50 116 L48 184 L38 184 Z" fill={L('quads')} />
              <Path d="M52 116 L58 118 L56 160 L50 160 Z" fill={L('adducteurs')} />
            </>
          )}
          <Path d="M38 188 L54 188 L52 236 L40 236 Z" fill={back ? L('mollets') : body} />
          <Rect x={38} y={238} width={16} height={8} rx={3} fill={body} />
        </>
      ))}
    </Svg>
  );
}

export function BodyMap({ name, muscle, compact }: { name: string; muscle?: string; compact?: boolean }) {
  const t = useTheme();
  const m = musclesFor(name, muscle);
  if (!m) return null;
  const soft = rgba(t.accent, 0.35);
  const fill = (z: Zone) => (m.p.includes(z) ? t.accent : m.s.includes(z) ? soft : undefined);
  const h = compact ? 150 : 230;
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: compact ? 8 : 16 }}>
        <Figure back={false} fill={fill} h={h} />
        <Figure back fill={fill} h={h} />
      </View>
      <Text style={{ color: t.muted, fontSize: 13, textAlign: 'center' }}>
        <Text style={{ color: t.accent, fontWeight: '600' }}>{m.p.map((z) => ZONE_LABEL[z]).join(', ')}</Text>
        {m.s.length ? ` · ${m.s.map((z) => ZONE_LABEL[z]).join(', ')}` : ''}
      </Text>
    </View>
  );
}
