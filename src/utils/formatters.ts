/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SHARED CURRENCY & NUMBER FORMATTERS
 * Defaults to Egyptian Pound (EGP / ج.م) as primary currency.
 */

export function formatMoney(
  amount: number,
  currency: string = 'EGP',
  language: string = 'ar'
): string {
  const num = Number.isFinite(amount) ? amount : 0;
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (language === 'ar') {
    const arSymbols: Record<string, string> = {
      EGP: 'ج.م',
      SAR: 'ر.س',
      AED: 'د.إ',
      USD: '$',
      EUR: '€',
      GBP: '£',
      TRY: '₺',
    };
    const sym = arSymbols[currency] || currency;
    return `${formatted} ${sym}`;
  }

  const enSymbols: Record<string, string> = {
    EGP: 'EGP',
    SAR: 'SAR',
    AED: 'AED',
    USD: '$',
    EUR: '€',
    GBP: '£',
    TRY: '₺',
  };
  const sym = enSymbols[currency] || currency;
  return currency === 'USD' || currency === 'EUR' || currency === 'GBP'
    ? `${sym}${formatted}`
    : `${formatted} ${sym}`;
}
