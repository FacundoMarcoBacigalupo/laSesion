export const now = () => Date.now();
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));