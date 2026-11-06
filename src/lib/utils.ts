import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { TS } from '@/types';

export const cn = (...i: ClassValue[]) => twMerge(clsx(i));

export function toDate(v: TS): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'string') { const d = new Date(v); return isNaN(+d) ? null : d; }
  if (typeof (v as any).toDate === 'function') return (v as any).toDate();
  return null;
}
export function fmtDate(v: TS, withTime = false) {
  const d = toDate(v);
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) });
}
export function timeAgo(v: TS) {
  const d = toDate(v);
  if (!d) return '';
  const s = Math.floor((Date.now() - +d) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(d);
}
export const fmt = (n: number | null | undefined, d = 1) => (n == null || isNaN(n) ? '—' : String(Math.round(n * 10 ** d) / 10 ** d));
export function ordinal(n: number | null | undefined) {
  if (n == null) return '—';
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
export const fullName = (u: { firstName?: string; lastName?: string } | null | undefined) => (u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : '');
export const initials = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
export const byName = (a: { lastName?: string; firstName?: string }, b: { lastName?: string; firstName?: string }) =>
  `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomCode(len = 10) {
  const a = new Uint32Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (x) => CODE_CHARS[x % CODE_CHARS.length]).join('');
}
export const tempPassword = () => `${randomCode(4)}-${randomCode(4)}`.toLowerCase();

export function downloadFile(name: string, content: BlobPart, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
export function toCsv(rows: (string | number | null | undefined)[][]) {
  return rows.map((r) => r.map((c) => { const s = c == null ? '' : String(c); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n');
}
export const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
