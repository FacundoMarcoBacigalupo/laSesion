export function useFullscreen() {
  const enter = () => { document.documentElement.requestFullscreen?.().catch(() => {}); };
  return { enter };
}