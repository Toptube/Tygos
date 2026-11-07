/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FLOATING ASSISTANT LAUNCHER (Phase 7 - Section 10)
 * Fixed physical coordinates (dir="ltr", left/top px) so horizontal + vertical
 * dragging works identically in Arabic (RTL) and English (LTR).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TYGOS_LOGO_SRC } from '../brand/TygosLogo.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { uiPreferencesRepository } from '../../repositories/repositories.ts';

interface DraggableAssistantLauncherProps {
  onClick: () => void;
  isOpen: boolean;
  activeView?: string;
}

const BUTTON_SIZE = 44;
const MIN_TOP = 64;
const MIN_BOTTOM = 76;
const MIN_SIDE = 4;

export const DraggableAssistantLauncher: React.FC<DraggableAssistantLauncherProps> = ({
  onClick,
  isOpen,
  activeView,
}) => {
  const { language, dir } = useI18n();
  const isAr = language === 'ar';

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const launcherRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    moved: boolean;
  }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    moved: false,
  });

  const lastTapRef = useRef<number>(0);

  const clampCoordinates = useCallback(
    (rawX: number, rawY: number) => {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
      const rect = launcherRef.current?.getBoundingClientRect();
      const width = rect && rect.width > 0 ? rect.width : BUTTON_SIZE;
      const height = rect && rect.height > 0 ? rect.height : BUTTON_SIZE;

      const maxX = Math.max(MIN_SIDE, vw - width - MIN_SIDE);
      const maxY = Math.max(MIN_TOP, vh - height - MIN_BOTTOM);

      return {
        x: Math.max(MIN_SIDE, Math.min(rawX, maxX)),
        y: Math.max(MIN_TOP, Math.min(rawY, maxY)),
      };
    },
    []
  );

  const getDefaultPosition = useCallback(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
    const isRtl = dir === 'rtl';
    const rawX = isRtl ? MIN_SIDE : vw - BUTTON_SIZE - MIN_SIDE;
    const rawY = vh - BUTTON_SIZE - MIN_BOTTOM - (activeView === 'pos' ? 56 : 0);
    return clampCoordinates(rawX, rawY);
  }, [dir, activeView, clampCoordinates]);

  const savePositionAsPercentage = useCallback((x: number, y: number) => {
    const vw = typeof window !== 'undefined' ? Math.max(1, window.innerWidth) : 1024;
    const vh = typeof window !== 'undefined' ? Math.max(1, window.innerHeight) : 768;
    uiPreferencesRepository.setLauncherPosition({
      pctX: x / vw,
      pctY: y / vh,
    });
  }, []);

  const restoreOrSetDefault = useCallback(() => {
    const saved = uiPreferencesRepository.getLauncherPosition();
    if (saved && typeof saved.pctX === 'number' && typeof saved.pctY === 'number') {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
      const midX = vw / 2;
      const rawX = saved.pctX * vw < midX ? MIN_SIDE : vw - BUTTON_SIZE - MIN_SIDE;
      let rawY = saved.pctY * vh;
      if (activeView === 'pos' && rawY > vh - 140) {
        rawY = vh - 150;
      }
      setPosition(clampCoordinates(rawX, rawY));
      return;
    }
    setPosition(getDefaultPosition());
  }, [activeView, clampCoordinates, getDefaultPosition]);

  useEffect(() => {
    restoreOrSetDefault();
    const handleResizeOrRotate = () => restoreOrSetDefault();
    window.addEventListener('resize', handleResizeOrRotate);
    window.addEventListener('orientationchange', handleResizeOrRotate);
    return () => {
      window.removeEventListener('resize', handleResizeOrRotate);
      window.removeEventListener('orientationchange', handleResizeOrRotate);
    };
  }, [restoreOrSetDefault]);

  const snapToNearestEdge = useCallback(
    (currentX: number, currentY: number) => {
      setIsTransitioning(true);
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
      const midX = vw / 2;
      const targetX = currentX + BUTTON_SIZE / 2 < midX ? MIN_SIDE : vw - BUTTON_SIZE - MIN_SIDE;
      let targetY = currentY;
      if (activeView === 'pos' && targetY > vh - 130) {
        targetY = vh - 140;
      }
      const clamped = clampCoordinates(targetX, targetY);
      setPosition(clamped);
      savePositionAsPercentage(clamped.x, clamped.y);
      setTimeout(() => setIsTransitioning(false), 250);
    },
    [activeView, clampCoordinates, savePositionAsPercentage]
  );

  const handleResetToDefault = useCallback(() => {
    setIsTransitioning(true);
    const def = getDefaultPosition();
    setPosition(def);
    savePositionAsPercentage(def.x, def.y);
    setTimeout(() => setIsTransitioning(false), 250);
  }, [getDefaultPosition, savePositionAsPercentage]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      handleResetToDefault();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    const currentX = position?.x ?? MIN_SIDE;
    const currentY = position?.y ?? MIN_TOP;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY,
      moved: false,
    };

    setIsDragging(true);
    setIsTransitioning(false);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore in jsdom
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    if (Math.hypot(deltaX, deltaY) > 6) {
      dragStartRef.current.moved = true;
    }

    const clamped = clampCoordinates(
      dragStartRef.current.initialX + deltaX,
      dragStartRef.current.initialY + deltaY
    );
    setPosition(clamped);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    if (!dragStartRef.current.moved) {
      onClick();
    } else if (position) {
      snapToNearestEdge(position.x, position.y);
    }
  };

  const isHidden = uiPreferencesRepository.getHideAssistant();

  if (isOpen || !position || isHidden) return null;

  return (
    <div
      ref={launcherRef}
      dir="ltr"
      data-testid="floating-assistant-launcher"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleResetToDefault}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none',
      }}
      className={`z-40 select-none cursor-grab active:cursor-grabbing ${
        isTransitioning ? 'transition-all duration-200 ease-out' : ''
      } ${isDragging ? 'scale-110 shadow-2xl z-50' : ''}`}
      title={
        isAr
          ? 'اسحب بحرية في أي اتجاه · يلتصق بالحافة تلقائياً · نقر مزدوج لإعادته للزاوية'
          : 'Drag anywhere · Snaps to edge · Double click to reset position'
      }
      aria-label={isAr ? 'مساعد تايجوس' : 'Tygos Assistant'}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="relative group">
        <div className="relative w-11 h-11 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-300 dark:border-slate-700 p-1.5 flex items-center justify-center shadow-lg opacity-50 hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <img
            src={TYGOS_LOGO_SRC}
            alt="TYGOS"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
};
