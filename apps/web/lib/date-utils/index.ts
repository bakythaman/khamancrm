import type { Language } from '@/lib/storage/types';

export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'all';

const dayMs = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const day = date.getDay() || 7;
  const start = startOfDay(date);
  start.setDate(start.getDate() - day + 1);
  return start;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function isInPeriod(value: string, period: AnalyticsPeriod, now = new Date()) {
  if (period === 'all') return true;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return false;
  if (period === 'day') return timestamp >= startOfDay(now).getTime();
  if (period === 'week') return timestamp >= startOfWeek(now).getTime();
  return timestamp >= startOfMonth(now).getTime();
}

export function isToday(value: string) {
  return isInPeriod(value, 'day');
}

export function isThisWeek(value: string) {
  return isInPeriod(value, 'week');
}

export function isThisMonth(value: string) {
  return isInPeriod(value, 'month');
}

export function addDays(days: number, from = new Date()) {
  return new Date(from.getTime() + days * dayMs);
}

export function addMonths(months: number, from = new Date()) {
  const date = new Date(from);
  date.setMonth(date.getMonth() + months);
  return date;
}

export function toDateTimeLocal(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function formatDate(value: string, language: Language = 'ru') {
  return new Intl.DateTimeFormat(language === 'kz' ? 'kk-KZ' : 'ru-KZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
