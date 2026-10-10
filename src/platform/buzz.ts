import * as Haptics from 'expo-haptics';

export type Buzz = 'tick' | 'tap' | 'success' | 'alert';
export function buzz(kind: Buzz) {
  const p =
    kind === 'tick'
      ? Haptics.selectionAsync()
      : kind === 'tap'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        : Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
  p.catch(() => {});
}
