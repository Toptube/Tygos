/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

interface ThemeSwitcherProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  className = '',
  showLabel = false,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={t('theme.switchTitle', 'Switch Theme')}
      title={isDark ? t('theme.lightMode', 'Light Mode') : t('theme.darkMode', 'Dark Mode')}
      className={`flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 shrink-0" />
      ) : (
        <Moon className="w-4 h-4 text-cyan-600 shrink-0" />
      )}
      {showLabel && (
        <span className="text-xs font-semibold">
          {isDark ? t('theme.lightMode', 'Light Mode') : t('theme.darkMode', 'Dark Mode')}
        </span>
      )}
    </button>
  );
};
