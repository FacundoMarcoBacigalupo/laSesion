export function describeDevice(
  userAgent: string,
  platformHint?: string,
  modelHint?: string,
  mobileHint?: boolean,
  touchHint = false,
) {
  const ua = userAgent.toLowerCase();
  const hintedPlatform = platformHint?.toLowerCase() ?? '';
  const platform =
    /iphone|ipad|ipod/.test(ua) ? 'iOS'
      : /android/.test(ua) ? 'Android'
        : /cros/.test(ua) ? 'ChromeOS'
          : /windows/.test(ua) ? 'Windows'
            : /macintosh|mac os x/.test(ua) ? (touchHint ? 'iOS' : 'macOS')
              : /linux/.test(ua) ? 'Linux'
                : /android/.test(hintedPlatform) ? 'Android'
                  : /ios/.test(hintedPlatform) ? 'iOS'
                    : /chrome.?os/.test(hintedPlatform) ? 'ChromeOS'
                      : /windows/.test(hintedPlatform) ? 'Windows'
                        : /mac/.test(hintedPlatform) ? 'macOS'
                          : /linux/.test(hintedPlatform) ? 'Linux'
                            : platformHint || 'Desconocido';
  const isMobile = mobileHint ?? /mobile|iphone|ipod|android.*mobile/.test(ua);
  let model = modelHint?.trim() || undefined;

  if (!model) {
    if (/ipad/.test(ua) || (platform === 'iOS' && touchHint && /macintosh/.test(ua))) model = 'iPad';
    else if (/iphone/.test(ua)) model = 'iPhone';
    else if (/ipod/.test(ua)) model = 'iPod';
    else if (platform === 'Android') model = isMobile ? 'Android (móvil)' : 'Android (tablet)';
    else if (platform === 'Windows') model = 'PC Windows';
    else if (platform === 'macOS') model = 'Mac';
    else if (platform === 'ChromeOS') model = 'Chromebook';
    else if (platform === 'Linux') model = 'PC Linux';
    else model = touchHint ? 'Dispositivo táctil' : 'Dispositivo';
  }

  return { model, platform };
}

export async function readDevice() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang = navigator.language;
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const screenStr = `${window.screen.width}x${window.screen.height}`;
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  let platformHint = (navigator as any).userAgentData?.platform as string | undefined;
  let modelHint: string | undefined;
  let mobileHint: boolean | undefined;
  try {
    const uaData: any = (navigator as any).userAgentData;
    if (uaData?.getHighEntropyValues) {
      const v = await uaData.getHighEntropyValues(['model', 'platform', 'mobile']);
      modelHint = v?.model || undefined;
      platformHint = v?.platform || platformHint;
      mobileHint = v?.mobile;
    }
  } catch {}
  let battery: number | null = null;
  let charging: boolean | undefined;
  try {
    const b: any = await (navigator as any).getBattery?.();
    if (b) { battery = Math.round(b.level * 100); charging = b.charging; }
  } catch {}
  const memory = (navigator as any).deviceMemory;
  const { model, platform } = describeDevice(navigator.userAgent, platformHint, modelHint, mobileHint, touch);
  return { model, platform, lang, tz, battery, charging, dark, screen: screenStr, memory, touch };
}