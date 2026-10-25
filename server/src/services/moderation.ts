const INSULTS = ['puta', 'mierda', 'carajo', 'concha', 'boludo', 'pelotudo', 'forro', 'hdp', 'hijo de puta'];
const URL_RE = /https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,}/i;

export function moderateText(input: string): { ok: boolean; text: string; reason?: string } {
  let t = String(input ?? '').replace(/[\u0000-\u001f\u007f]/g, '');
  t = t.replace(/<[^>]*>/g, '');
  t = t.replace(/\s+/g, ' ').trim();
  if (t.length === 0) return { ok: false, text: '', reason: 'empty' };
  if (t.length > 80) t = t.slice(0, 80);
  if (URL_RE.test(t)) return { ok: false, text: '', reason: 'url' };
  const lower = t.toLowerCase();
  for (const w of INSULTS) {
    const re = new RegExp('\\b' + w + '\\b', 'i');
    if (re.test(lower)) t = t.replace(new RegExp(w, 'ig'), '***');
  }
  return { ok: true, text: t };
}