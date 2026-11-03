/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export type LogoVariant = 'full' | 'symbol' | 'compact' | 'sidebar' | 'login' | 'splash' | 'responsive-header';

interface TygosLogoProps {
  variant?: LogoVariant;
  className?: string;
  showSubtitle?: boolean;
}

export const TYGOS_LOGO_SRC = '/assets/aistudio/1793697602757_a43f2155.png';
export const TYGOS_COVER_SRC = '/assets/aistudio/1793718672612_80f803af.jpg';

export const TygosLogo: React.FC<TygosLogoProps> = ({
  variant = 'compact',
  className = '',
  showSubtitle = false,
}) => {
  if (variant === 'symbol') {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <img
          src={TYGOS_LOGO_SRC}
          alt="Tygos Mark"
          referrerPolicy="no-referrer"
          className="w-9 h-9 object-contain select-none"
        />
      </div>
    );
  }

  if (variant === 'responsive-header') {
    return (
      <div className={`inline-flex items-center gap-2 select-none shrink-0 ${className}`}>
        <img
          src={TYGOS_LOGO_SRC}
          alt="Tygos"
          referrerPolicy="no-referrer"
          className="w-8 h-8 sm:w-9 sm:h-9 object-contain select-none shrink-0"
        />
        <div className="hidden sm:flex flex-col text-start">
          <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none">
            Tygos
          </span>
          {showSubtitle && (
            <span className="text-[9px] uppercase tracking-wider text-cyan-500 dark:text-cyan-400 font-semibold mt-0.5">
              Hospitality
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className={`flex items-center gap-3 select-none ${className}`}>
        <img
          src={TYGOS_LOGO_SRC}
          alt="Tygos"
          referrerPolicy="no-referrer"
          className="w-10 h-10 object-contain select-none shrink-0"
        />
        <div className="flex flex-col text-start">
          <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white group-hover:text-cyan-400 transition-colors">
            Tygos
          </span>
          {showSubtitle && (
            <span className="text-[10px] uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-bold">
              Hospitality
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
        <img
          src={TYGOS_LOGO_SRC}
          alt="Tygos"
          referrerPolicy="no-referrer"
          className="w-8 h-8 object-contain select-none shrink-0"
        />
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
            Tygos
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'login') {
    return (
      <div className={`flex flex-col items-center text-center select-none ${className}`}>
        <div className="relative mb-3">
          <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-2xl transform scale-125 pointer-events-none" />
          <img
            src={TYGOS_LOGO_SRC}
            alt="Tygos Hospitality Platform"
            referrerPolicy="no-referrer"
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain relative z-10 select-none drop-shadow-xl"
          />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Tygos
        </h1>
        <p className="text-xs uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-bold mt-1">
          Hospitality Intelligence & ERP
        </p>
      </div>
    );
  }

  if (variant === 'splash') {
    return (
      <div className={`flex flex-col items-center justify-center p-8 select-none ${className}`}>
        <img
          src={TYGOS_LOGO_SRC}
          alt="Tygos"
          referrerPolicy="no-referrer"
          className="w-36 h-36 object-contain select-none animate-pulse"
        />
        <h1 className="text-4xl font-black tracking-tight text-white mt-4">
          Tygos
        </h1>
        <p className="text-sm text-cyan-300 tracking-wider mt-1">
          Enterprise Hospitality System
        </p>
      </div>
    );
  }

  // Full default variant
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <img
        src={TYGOS_LOGO_SRC}
        alt="Tygos"
        referrerPolicy="no-referrer"
        className="w-11 h-11 object-contain select-none shrink-0"
      />
      <div className="flex flex-col text-start">
        <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
          Tygos
        </span>
        {showSubtitle && (
          <span className="text-[11px] font-semibold text-slate-500 dark:text-cyan-400 tracking-wide">
            Hospitality Management Ecosystem
          </span>
        )}
      </div>
    </div>
  );
};
