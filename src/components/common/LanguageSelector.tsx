/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { LanguageCode, useI18n } from '../../i18n/I18nContext.tsx';

interface LanguageSelectorProps {
  variant?: 'header' | 'login' | 'compact';
  className?: string;
}

interface LanguageOption {
  code: LanguageCode;
  nativeName: string;
  englishName: string;
  direction: 'RTL' | 'LTR';
}

const LANGUAGES: LanguageOption[] = [
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', direction: 'RTL' },
  { code: 'en', nativeName: 'English', englishName: 'English', direction: 'LTR' },
  { code: 'fr', nativeName: 'Français', englishName: 'French', direction: 'LTR' },
  { code: 'nl', nativeName: 'Nederlands', englishName: 'Dutch', direction: 'LTR' },
  { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish', direction: 'LTR' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { language, setLanguage } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentOption = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    setIsOpen(false);
  };

  if (variant === 'login') {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Select Language"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors cursor-pointer"
        >
          <Globe className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold">{currentOption.nativeName}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {isOpen && (
          <div className="absolute end-0 bottom-full mb-2 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 animate-fade-in text-xs">
            <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800/80 mb-1">
              Select Language / اختر اللغة
            </div>
            {LANGUAGES.map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => handleSelect(opt.code)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  language === opt.code
                    ? 'bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{opt.nativeName}</span>
                  <span className="text-[10px] text-slate-500">({opt.englishName})</span>
                </div>
                {language === opt.code && <Check className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Header / default variant
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change Language"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
      >
        <Globe className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
        <span className="font-bold">{currentOption.nativeName}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute end-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 z-50 animate-fade-in text-xs">
          {LANGUAGES.map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => handleSelect(opt.code)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                language === opt.code
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{opt.nativeName}</span>
                <span className={`text-[10px] ${language === opt.code ? 'text-slate-900 opacity-80' : 'text-slate-400'}`}>
                  {opt.direction}
                </span>
              </div>
              {language === opt.code && <Check className="w-3.5 h-3.5 text-slate-950" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
