/* ═══════════════════════════════════════════════════════════════
   BEAST TRACKER — Date Utilities
   ═══════════════════════════════════════════════════════════════ */

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function localDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isSameLocalDay(a: string | Date, b: string | Date): boolean {
  const da = typeof a === 'string' ? a.slice(0, 10) : localDateStr(a);
  const db = typeof b === 'string' ? b.slice(0, 10) : localDateStr(b);
  return da === db;
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateStr(d);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function getDayOfWeek(date?: Date): number {
  const d = date || new Date();
  return (d.getDay() + 6) % 7; // Mon=0, Sun=6
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
