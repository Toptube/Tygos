/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LanguageCode } from './I18nContext.tsx';

/**
 * Currency symbols mapping
 */
const CURRENCY_SYMBOLS: Record<string, Record<LanguageCode, string>> = {
  USD: { ar: '$', en: '$', fr: '$', nl: '$', tr: '$' },
  EUR: { ar: '€', en: '€', fr: '€', nl: '€', tr: '€' },
  EGP: { ar: 'ج.م', en: 'EGP', fr: 'EGP', nl: 'EGP', tr: 'EGP' },
  SAR: { ar: 'ر.س', en: 'SAR', fr: 'SAR', nl: 'SAR', tr: 'SAR' },
  AED: { ar: 'د.إ', en: 'AED', fr: 'AED', nl: 'AED', tr: 'AED' },
  TRY: { ar: '₺', en: '₺', fr: '₺', nl: '₺', tr: '₺' },
  GBP: { ar: '£', en: '£', fr: '£', nl: '£', tr: '£' },
};

/**
 * Format currency with tabular numerals
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  lang: LanguageCode = 'ar'
): string {
  const symbol = CURRENCY_SYMBOLS[currency]?.[lang] || currency;
  const formattedNumber = amount.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (lang === 'ar') {
    return `${formattedNumber} ${symbol}`;
  }
  return `${symbol}${formattedNumber}`;
}

/**
 * Format numbers with optional decimals
 */
export function formatNumber(
  value: number,
  lang: LanguageCode = 'ar',
  decimals: number = 0
): string {
  return value.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format percentages
 */
export function formatPercent(value: number, lang: LanguageCode = 'ar'): string {
  const formatted = value.toFixed(1);
  return lang === 'ar' ? `٪${formatted}` : `${formatted}%`;
}

/**
 * Format standard dates
 */
export function formatDate(
  dateString: string,
  lang: LanguageCode = 'ar'
): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Format times
 */
export function formatTime(
  timeString: string,
  lang: LanguageCode = 'ar'
): string {
  return timeString;
}
