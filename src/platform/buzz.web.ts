export type Buzz = 'tick' | 'tap' | 'success' | 'alert';
const PATTERNS: Record<Buzz, number | number[]> = { tick: 8, tap: 25, success: [30, 60, 30], alert: [200, 100, 200, 100, 200] };
/* Vibre sur Android (Chrome). Safari sur iPhone ne permet pas aux pages de vibrer : sans effet. */
export function buzz(kind: Buzz) {
  try {
    navigator.vibrate?.(PATTERNS[kind]);
  } catch {}
}
