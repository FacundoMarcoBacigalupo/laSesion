export async function requestMotionPermission(): Promise<boolean> {
  try {
    const DME: any = (window as any).DeviceMotionEvent;
    if (DME && typeof DME.requestPermission === 'function') {
      const r = await DME.requestPermission();
      return r === 'granted';
    }
    return true;
  } catch { return false; }
}