/** Best-effort tactile feedback for the web and native WebView bridges. */
export function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern as VibratePattern);
      return true;
    }

    // Optional bridge used when this Vite app is wrapped by a native shell.
    const bridge = (window as any).webkit?.messageHandlers?.haptics;
    if (bridge?.postMessage) {
      bridge.postMessage({ pattern: Array.isArray(pattern) ? pattern : [pattern] });
      return true;
    }
  } catch {
    // Haptics are progressive enhancement; never block the ritual.
  }
  return false;
}
