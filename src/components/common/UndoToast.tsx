/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 8-SECOND REVERSIBLE UNDO TOAST NOTIFICATION
 * Displays an active countdown progress bar and an immediate "Undo (تراجع)" button.
 */

import React, { useEffect, useState } from 'react';
import { RotateCcw, X, Check } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.tsx';

interface UndoToastProps {
  messageAr: string;
  messageEn: string;
  durationSeconds?: number;
  onUndo: () => void;
  onDismiss: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  messageAr,
  messageEn,
  durationSeconds = 8,
  onUndo,
  onDismiss,
}) => {
  const { language } = useI18n();
  const isAr = language === 'ar';
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onDismiss]);

  const progressPercent = ((durationSeconds - secondsLeft) / durationSeconds) * 100;

  return (
    <div className="fixed bottom-6 start-1/2 -translate-x-1/2 z-50 animate-bounce-in max-w-md w-full px-4">
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-4 text-slate-100 flex items-center justify-between gap-3">
        {/* Animated Countdown Bar */}
        <div
          className="absolute bottom-0 start-0 h-1 bg-cyan-400 transition-all duration-1000 ease-linear"
          style={{ width: `${100 - progressPercent}%` }}
        />

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 animate-ping" />
          <span className="text-xs font-semibold truncate">
            {isAr ? messageAr : messageEn}
          </span>
          <span className="text-[11px] font-mono opacity-60">({secondsLeft}s)</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onUndo}
            className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-md"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isAr ? 'تراجع' : 'Undo'}</span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
