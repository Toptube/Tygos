/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { TRANSLATIONS } from './translations.ts';
import { formatCurrency, formatNumber, formatPercent } from './formatters.ts';

export type LanguageCode = 'ar' | 'en' | 'fr' | 'nl' | 'tr';

export interface I18nContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  dir: 'ltr' | 'rtl';
  isRtl: boolean;
  t: (key: string, fallback?: string) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatNumber: (value: number, decimals?: number) => string;
  formatPercent: (value: number) => string;
}

const SUPPORTED_LANGUAGES: LanguageCode[] = ['ar', 'en', 'fr', 'nl', 'tr'];

/**
 * Priority order for language resolution:
 * 1. Previously saved user language preference in localStorage
 * 2. Supported device/browser language (e.g. navigator.language)
 * 3. Arabic fallback (Official primary language of Tygos)
 */
function resolveInitialLanguage(): LanguageCode {
  // 1. Saved preference
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tygos_lang') as LanguageCode | null;
    if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
      return saved;
    }

    // 2. Browser / Device language
    try {
      const browserLang = (navigator.language || (navigator as any).userLanguage || '').toLowerCase();
      if (browserLang.startsWith('ar')) return 'ar';
      if (browserLang.startsWith('en')) return 'en';
      if (browserLang.startsWith('fr')) return 'fr';
      if (browserLang.startsWith('nl')) return 'nl';
      if (browserLang.startsWith('tr')) return 'tr';
    } catch {
      // Ignore detection errors in headless / sandbox environments
    }
  }

  // 3. Official primary default: Arabic
  return 'ar';
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(resolveInitialLanguage);

  const dir: 'ltr' | 'rtl' = language === 'ar' ? 'rtl' : 'ltr';
  const isRtl = dir === 'rtl';

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', language);
    localStorage.setItem('tygos_lang', language);
  }, [language, dir]);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
  };

  const t = (key: string, fallback?: string): string => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en?.[key] || fallback || key;
  };

  const boundFormatCurrency = (amount: number, currency: string = 'USD'): string => {
    return formatCurrency(amount, currency, language);
  };

  const boundFormatNumber = (value: number, decimals: number = 0): string => {
    return formatNumber(value, language, decimals);
  };

  const boundFormatPercent = (value: number): string => {
    return formatPercent(value, language);
  };

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        dir,
        isRtl,
        t,
        formatCurrency: boundFormatCurrency,
        formatNumber: boundFormatNumber,
        formatPercent: boundFormatPercent,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
