import { useEffect } from 'react';

/* Garde l'écran allumé (Wake Lock) ; ignoré si le navigateur refuse. */
export function KeepAwake() {
  useEffect(() => {
    let lock: any = null;
    let alive = true;
    const req = async () => {
      try {
        const wl = (navigator as any).wakeLock;
        if (wl && document.visibilityState === 'visible' && !lock) {
          lock = await wl.request('screen');
          lock.addEventListener?.('release', () => (lock = null));
          if (!alive) lock.release();
        }
      } catch {
        lock = null;
      }
    };
    const onVis = () => document.visibilityState === 'visible' && req();
    req();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVis);
      lock?.release?.().catch?.(() => {});
    };
  }, []);
  return null;
}
