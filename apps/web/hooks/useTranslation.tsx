'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storageKeys } from '@/lib/storage/keys';
import type { Language } from '@/lib/storage/types';
import { translate } from '@/lib/i18n/format';
import { readString, writeString } from '@/lib/storage/local-store';

interface TranslationContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ru');

  useEffect(() => {
    const stored = readString(storageKeys.language);
    if (stored === 'ru' || stored === 'kz') {
      setLanguageState(stored);
    }
  }, []);

  const value = useMemo<TranslationContextValue>(() => {
    const setLanguage = (nextLanguage: Language) => {
      setLanguageState(nextLanguage);
      writeString(storageKeys.language, nextLanguage);
    };

    return {
      language,
      setLanguage,
      t: (key, params) => translate(language, key, params),
    };
  }, [language]);

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) throw new Error('useTranslation must be used inside TranslationProvider');
  return context;
}
