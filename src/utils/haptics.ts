/**
 * Safe haptic feedback utility for mobile touch micro-interactions.
 * Supports pattern arrays or single vibration durations with defensive feature detection.
 */
export function triggerHaptic(pattern: number | number[] = 15): void {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors on unsupported or restricted environments
    }
  }
}
