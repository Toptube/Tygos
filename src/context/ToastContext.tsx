/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * GLOBAL TOAST & UNDO NOTIFICATION SYSTEM (Phase 5)
 * Supports:
 * - Types: success, error, warning, info
 * - Optional action button
 * - Optional Web Audio API chime
 * - Grouping / deduplication of repeated identical toasts
 * - Integrated UndoToast countdown bar
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
  Volume2,
} from 'lucide-react';
import { UndoToast } from '../components/common/UndoToast.tsx';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  type?: ToastType;
  title: string;
  message?: string;
  action?: ToastAction;
  sound?: boolean;
  duration?: number; // ms, default 5000
  groupKey?: string;
}

interface ActiveToast extends ToastOptions {
  id: string;
  type: ToastType;
  count: number;
  createdAt: number;
}

interface UndoState {
  isOpen: boolean;
  message: string;
  onUndo: () => void;
  durationSeconds: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
  dismissToast: (id: string) => void;
  showUndoToast: (message: string, onUndo: () => void, durationSeconds?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

function playToastSound(type: ToastType) {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'warning') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.setValueAtTime(220, ctx.currentTime + 0.12);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    }

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.34);
  } catch {
    // Ignore audio context restrictions
  }
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [undoState, setUndoState] = useState<UndoState>({
    isOpen: false,
    message: '',
    onUndo: () => {},
    durationSeconds: 8,
  });

  const dismissToast = useCallback((id: string) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      const type: ToastType = options.type || 'info';
      const duration = options.duration ?? 5000;
      const gKey = options.groupKey || `${type}::${options.title}`;

      if (options.sound) {
        playToastSound(type);
      }

      setToasts((prev) => {
        const existingIdx = prev.findIndex(
          (t) => (t.groupKey || `${t.type}::${t.title}`) === gKey
        );

        if (existingIdx !== -1) {
          const existing = prev[existingIdx];
          if (timersRef.current[existing.id]) {
            clearTimeout(timersRef.current[existing.id]);
          }
          timersRef.current[existing.id] = setTimeout(() => {
            dismissToast(existing.id);
          }, duration);

          const updated = [...prev];
          updated[existingIdx] = {
            ...existing,
            ...options,
            type,
            count: existing.count + 1,
            createdAt: Date.now(),
          };
          return updated;
        }

        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        timersRef.current[id] = setTimeout(() => {
          dismissToast(id);
        }, duration);

        return [
          ...prev.slice(-4),
          {
            ...options,
            id,
            type,
            count: 1,
            createdAt: Date.now(),
          },
        ];
      });
    },
    [dismissToast]
  );

  const showUndoToast = useCallback(
    (message: string, onUndo: () => void, durationSeconds: number = 8) => {
      setUndoState({
        isOpen: true,
        message,
        onUndo,
        durationSeconds,
      });
    },
    []
  );

  const styleMap: Record<
    ToastType,
    { border: string; bg: string; icon: React.ReactNode; badge: string }
  > = {
    success: {
      border: 'border-emerald-500/40',
      bg: 'bg-slate-900/95',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
      badge: 'bg-emerald-500 text-slate-950',
    },
    error: {
      border: 'border-rose-500/40',
      bg: 'bg-slate-900/95',
      icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
      badge: 'bg-rose-500 text-white',
    },
    warning: {
      border: 'border-amber-500/50',
      bg: 'bg-slate-900/95',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
      badge: 'bg-amber-500 text-slate-950',
    },
    info: {
      border: 'border-cyan-500/40',
      bg: 'bg-slate-900/95',
      icon: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
      badge: 'bg-cyan-500 text-slate-950',
    },
  };

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, showUndoToast }}>
      {children}

      {/* Global Toast Stack */}
      <div
        className="fixed top-20 end-4 z-[90] flex flex-col gap-2.5 w-[calc(100vw-2rem)] max-w-sm pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const st = styleMap[toast.type];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-3.5 rounded-2xl ${st.bg} border ${st.border} shadow-2xl backdrop-blur-md text-white flex items-start gap-3 animate-fade-in`}
            >
              {st.icon}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white truncate">{toast.title}</span>
                  {toast.count > 1 && (
                    <span
                      className={`text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full ${st.badge}`}
                      dir="ltr"
                    >
                      ×{toast.count}
                    </span>
                  )}
                  {toast.sound && <Volume2 className="w-3 h-3 text-slate-400 shrink-0" />}
                </div>
                {toast.message && (
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    {toast.message}
                  </p>
                )}
                {toast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick();
                      dismissToast(toast.id);
                    }}
                    className="mt-2 px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Integrated UndoToast */}
      {undoState.isOpen && (
        <UndoToast
          messageAr={undoState.message}
          messageEn={undoState.message}
          durationSeconds={undoState.durationSeconds}
          onUndo={undoState.onUndo}
          onDismiss={() => setUndoState((prev) => ({ ...prev, isOpen: false }))}
        />
      )}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
