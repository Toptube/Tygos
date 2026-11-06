/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * UNIFIED INTERACTIVE BUTTON COMPONENT (Phase 7 - Section 1)
 * Enforces:
 * - Tactile press feedback (active:scale-[0.97] + color shift)
 * - Clear hover & focus-visible rings
 * - Automatic async double-click prevention + spinner (isLoading)
 * - Clear disabled state
 * - Optional mobile haptic feedback (navigator.vibrate) & Web Audio click sound
 * - Selection state (selected?: boolean) with border, highlight, and ✓ check mark
 */

import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { uiPreferencesRepository } from '../../repositories/repositories.ts';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'warning'
  | 'tile';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'touch';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  selected?: boolean;
  haptic?: boolean;
  sound?: boolean;
  leftIcon?: React.ReactNode;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

function playSubtleClickSound(): void {
  try {
    if (!uiPreferencesRepository.getClickSoundEnabled()) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(680, ctx.currentTime);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {
    // Ignore audio context restrictions
  }
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white shadow-sm border border-cyan-500/30',
  secondary:
    'bg-slate-800 hover:bg-slate-700 active:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-700',
  outline:
    'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700',
  ghost:
    'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/70 active:bg-slate-200 dark:active:bg-slate-800 text-slate-700 dark:text-slate-300 border border-transparent',
  danger:
    'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-sm border border-rose-500/30',
  success:
    'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-sm border border-emerald-500/30',
  warning:
    'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 shadow-sm border border-amber-400/40',
  tile:
    'bg-white dark:bg-slate-900 hover:bg-cyan-50/60 dark:hover:bg-slate-800/90 active:bg-cyan-100/70 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-xs',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'min-h-[30px] px-2.5 py-1 text-xs rounded-lg gap-1.5',
  sm: 'min-h-[36px] px-3 py-1.5 text-xs rounded-xl gap-1.5',
  md: 'min-h-[42px] px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'min-h-[48px] px-5 py-2.5 text-base rounded-xl gap-2',
  touch: 'min-h-[48px] px-4 py-3 text-sm sm:text-base rounded-xl gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      selected = false,
      haptic = true,
      sound = true,
      leftIcon,
      rightIcon,
      children,
      className = '',
      disabled,
      type = 'button',
      onClick,
      ...rest
    },
    ref
  ) => {
    const [asyncPending, setAsyncPending] = useState(false);
    const effectiveLoading = isLoading || asyncPending;
    const isDisabled = Boolean(disabled || effectiveLoading);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) return;

      if (haptic && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate(10);
        } catch {
          // Ignore vibrate errors
        }
      }

      if (sound) {
        playSubtleClickSound();
      }

      if (onClick) {
        const result = onClick(e) as unknown;
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          try {
            setAsyncPending(true);
            await (result as Promise<unknown>);
          } finally {
            setAsyncPending(false);
          }
        }
      }
    };

    const selectedClasses = selected
      ? 'ring-2 ring-cyan-500 border-cyan-500 bg-cyan-50/90 dark:bg-cyan-950/50 text-cyan-900 dark:text-cyan-100 font-bold'
      : '';

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-pressed={selected || undefined}
        onClick={handleClick}
        className={`inline-flex items-center justify-center font-semibold select-none transition-all duration-150 cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${selectedClasses} ${className}`}
        {...rest}
      >
        {effectiveLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon || (rest as { icon?: React.ReactNode }).icon
        )}
        {children}
        {selected && !effectiveLoading && (
          <Check
            className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0"
            data-testid="button-selected-check"
            aria-hidden="true"
          />
        )}
        {rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
