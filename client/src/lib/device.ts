export async function readDevice() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang = navigator.language;
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const screenStr = `${window.screen.width}x${window.screen.height}`;
  const touch = 'ontouchstart' in window;
  let model: string | undefined;
  try {
    const uaData: any = (navigator as any).userAgentData;
    if (uaData?.getHighEntropyValues) {
      const v = await uaData.getHighEntropyValues(['model', 'platform']);
      model = v?.model || undefined;
      if (!model && /iPhone/i.test(navigator.userAgent)) model = 'iPhone';
    } else if (/iPhone/i.test(navigator.userAgent)) model = 'iPhone';
  } catch {}
  let battery: number | null = null;
  let charging: boolean | undefined;
  try {
    const b: any = await (navigator as any).getBattery?.();
    if (b) { battery = Math.round(b.level * 100); charging = b.charging; }
  } catch {}
  const memory = (navigator as any).deviceMemory;
  return { model, platform: (navigator as any).userAgentData?.platform, lang, tz, battery, charging, dark, screen: screenStr, memory, touch };
}