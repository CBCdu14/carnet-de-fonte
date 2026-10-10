/* Bips de fin de repos (Web Audio). iOS n'autorise le son qu'après un geste : unlockAudio() est appelé
   quand on valide une série. Sur iPhone, le mode silencieux coupe ces bips. */
let ctx: AudioContext | null = null;

export function unlockAudio() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx!.state === 'suspended') ctx!.resume();
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    g.gain.value = 0;
    o.connect(g).connect(ctx!.destination);
    o.start();
    o.stop(ctx!.currentTime + 0.02);
  } catch {}
}

function tone(freq: number, start: number, dur: number, vol = 0.25) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

export function beep(kind: 'tick' | 'end') {
  try {
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime + 0.01;
    if (kind === 'tick') tone(660, t, 0.12, 0.18);
    else {
      tone(880, t, 0.18);
      tone(880, t + 0.25, 0.18);
      tone(1175, t + 0.5, 0.35);
    }
  } catch {}
}
