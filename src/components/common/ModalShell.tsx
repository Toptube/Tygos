/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RESPONSIVE FULL-SCREEN MOBILE MODAL SHELL (Phase 8 - Section 1)
 * - Mobile (<sm): Full-screen / >=85% bottom sheet with fixed top bar & large visible Close (X) button
 * - Desktop (sm+): Centered modal with max-w
 * - Supports Escape key, device back button (popstate), internal scrolling, and safe-area-inset-bottom
 */

import React, { useEffect } from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from './Button.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  maxWidthClass?: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  maxWidthClass = 'sm:max-w-4xl',
  headerExtra,
  children,
}) => {
  const { language, dir } = useI18n();
  const isAr = language === 'ar';

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Push a lightweight history state so device back button closes modal
    try {
      window.history.pushState({ modalOpen: true }, '');
    } catch {
      // Ignore in restricted environments
    }

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in"
      dir={dir}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`w-full ${maxWidthClass} h-[92vh] sm:h-auto sm:max-h-[90vh] bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 pb-[env(safe-area-inset-bottom)]`}
      >
        {/* Fixed Top Bar with Large Always-Visible Close (X) Button */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {icon && <div className="shrink-0">{icon}</div>}
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="touch"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            data-testid="modal-close-button"
            className="min-w-[44px] min-h-[44px] p-2 rounded-xl shrink-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Optional Sub-Header (e.g. Scrollable Tabs) */}
        {headerExtra && (
          <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 overflow-x-auto max-w-full">
            {headerExtra}
          </div>
        )}

        {/* Scrollable Internal Content + Mobile Back Button */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-4 min-w-0">
          <div className="sm:hidden">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-400"
            >
              {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              <span>{isAr ? 'رجوع' : 'Back'}</span>
            </Button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};
