import { dictionaries } from './dictionaries';
import type { Language } from '@/lib/storage/types';

type Params = Record<string, string | number>;

function findValue(tree: Record<string, unknown>, parts: string[]): string | undefined {
  let cursor: unknown = tree;

  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object' || !(part in cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }

  return typeof cursor === 'string' ? cursor : undefined;
}

export function translate(language: Language, key: string, params?: Params) {
  const value = findValue(dictionaries[language], key.split('.')) ?? key;
  if (!params) return value;

  return Object.entries(params).reduce(
    (text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)),
    value,
  );
}

export function formatAmount(value: number) {
  return `${new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 }).format(value)} ₸`;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ru-KZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function isOverdue(dueDate: string) {
  return new Date(dueDate).getTime() < Date.now();
}
