import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from './theme';
import { fDate, fmt, niceScale, type Point } from './logic';

function useWidth(): [number, (e: { nativeEvent: { layout: { width: number } } }) => void] {
  const [w, setW] = useState(0);
  return [w, (e) => setW(Math.round(e.nativeEvent.layout.width))];
}

export function LoadChart({ pts }: { pts: Point[] }) {
  const t = useTheme();
  const [W, onLayout] = useWidth();
  const H = 220, L = 40, R = 14, T = 16, B = 26;
  if (!pts.length) return null;
  const ys = pts.flatMap((p) => [p.kg, p.e1]);
  const sc = niceScale(Math.min(...ys), Math.max(...ys));
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  const x = (tt: number) => (pts.length === 1 ? (L + W - R) / 2 : L + ((tt - t0) / (t1 - t0 || 1)) * (W - L - R));
  const y = (v: number) => T + (1 - (v - sc.lo) / (sc.hi - sc.lo)) * (H - T - B);
  const path = (k: 'kg' | 'e1') => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p[k]).toFixed(1)}`).join('');
  const ticks: number[] = [];
  for (let v = sc.lo; v <= sc.hi + 1e-9; v += sc.st) ticks.push(v);
  const last = pts[pts.length - 1];
  const lx = x(last.t);
  const end = lx > W - 80;
  return (
    <View onLayout={onLayout} style={{ width: '100%' }}>
      {W > 0 ? (
        <Svg width={W} height={H}>
          {ticks.map((v) => (
            <React.Fragment key={v}>
              <Line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={t.line} strokeWidth={1} />
              <SvgText x={L - 6} y={y(v) + 4} fontSize={11} fill={t.muted} textAnchor="end">{fmt(v)}</SvgText>
            </React.Fragment>
          ))}
          {pts.length > 1 ? <Path d={`${path('kg')}L${x(t1)},${H - B}L${x(t0)},${H - B}Z`} fill={t.accent} fillOpacity={0.12} /> : null}
          <Path d={path('e1')} fill="none" stroke={t.muted} strokeWidth={2} strokeDasharray="5 4" />
          <Path d={path('kg')} fill="none" stroke={t.accent} strokeWidth={2.5} strokeLinejoin="round" />
          {pts.map((p, i) => <Circle key={'e' + i} cx={x(p.t)} cy={y(p.e1)} r={3} fill={t.surface} stroke={t.muted} strokeWidth={1.5} />)}
          {pts.map((p, i) => <Circle key={i} cx={x(p.t)} cy={y(p.kg)} r={3.5} fill={t.accent} />)}
          <Circle cx={lx} cy={y(last.kg)} r={6} fill={t.accent} stroke={t.surface} strokeWidth={2} />
          <SvgText x={end ? lx - 10 : lx + 10} y={y(last.kg) - 10} fontSize={14} fontWeight="700" fill={t.ink} textAnchor={end ? 'end' : 'start'}>
            {`${fmt(last.kg)} kg`}
          </SvgText>
          <SvgText x={L} y={H - 6} fontSize={11} fill={t.muted}>{fDate(t0)}</SvgText>
          {pts.length > 1 ? <SvgText x={W - R} y={H - 6} fontSize={11} fill={t.muted} textAnchor="end">{fDate(t1)}</SvgText> : null}
        </Svg>
      ) : null}
    </View>
  );
}

export function VolumeChart({ weeks }: { weeks: { t: number; v: number; n: number }[] }) {
  const t = useTheme();
  const [W, onLayout] = useWidth();
  const H = 170, L = 40, R = 6, T = 12, B = 24;
  const max = Math.max(...weeks.map((w) => w.v), 100);
  const sc = niceScale(0, max, 3);
  const hi = sc.hi || 1;
  const bw = (W - L - R) / weeks.length;
  const y = (v: number) => T + (1 - v / hi) * (H - T - B);
  const ticks: number[] = [];
  for (let v = 0; v <= hi + 1e-9; v += sc.st) ticks.push(v);
  return (
    <View onLayout={onLayout} style={{ width: '100%' }}>
      {W > 0 ? (
        <Svg width={W} height={H}>
          {ticks.map((v) => (
            <React.Fragment key={v}>
              <Line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={t.line} strokeWidth={1} />
              <SvgText x={L - 6} y={y(v) + 4} fontSize={11} fill={t.muted} textAnchor="end">{v >= 1000 ? fmt(v / 1000) + ' t' : fmt(v)}</SvgText>
            </React.Fragment>
          ))}
          {weeks.map((w, i) => {
            const bx = L + i * bw + bw * 0.18;
            const cur = i === weeks.length - 1;
            return (
              <React.Fragment key={w.t}>
                <Rect x={bx} y={y(w.v)} width={bw * 0.64} height={Math.max(0, H - B - y(w.v))} rx={3} fill={cur ? t.accent : t.muted} fillOpacity={cur ? 1 : 0.45} />
                {i % 3 === 0 || cur ? (
                  <SvgText x={bx + bw * 0.32} y={H - 6} fontSize={11} fill={t.muted} textAnchor="middle">{fDate(w.t)}</SvgText>
                ) : null}
              </React.Fragment>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}
