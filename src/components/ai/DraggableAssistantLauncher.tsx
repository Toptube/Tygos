/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TYGOS_LOGO_SRC } from '../brand/TygosLogo.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

interface DraggableAssistantLauncherProps {
  onClick: () => void;
  isOpen: boolean;
  activeView?: string;
}

const STORAGE_KEY_PCT = 'tygos_assistant_launcher_pos_pct';
const BUTTON_SIZE = 58;
const MIN_TOP = 68; // Safe area below header
const MIN_BOTTOM = 24;
const MIN_SIDE = 14;

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

  // Calculate default position (bottom-end corner)
  const getDefaultPosition = useCallback(() => {
    const isRtl = dir === 'rtl';
    const x = isRtl ? MIN_SIDE : window.innerWidth - BUTTON_SIZE - MIN_SIDE;
    const y = window.innerHeight - BUTTON_SIZE - MIN_BOTTOM - (activeView === 'pos' ? 50 : 0);
    return {
      x: Math.max(MIN_SIDE, Math.min(x, window.innerWidth - BUTTON_SIZE - MIN_SIDE)),
      y: Math.max(MIN_TOP, Math.min(y, window.innerHeight - BUTTON_SIZE - MIN_BOTTOM)),
    };
  }, [dir, activeView]);

  // Convert pixel position to window percentage and save
  const savePositionAsPercentage = useCallback((x: number, y: number) => {
    try {
      const pctX = x / Math.max(1, window.innerWidth);
      const pctY = y / Math.max(1, window.innerHeight);
      localStorage.setItem(STORAGE_KEY_PCT, JSON.stringify({ pctX, pctY }));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Restore position from percentage or default
  const restoreOrSetDefault = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PCT);
      if (saved) {
        const { pctX, pctY } = JSON.parse(saved);
        if (typeof pctX === 'number' && typeof pctY === 'number') {
          let targetX = pctX * window.innerWidth;
          let targetY = pctY * window.innerHeight;

          // Snap to horizontal edge
          const midX = window.innerWidth / 2;
          targetX = targetX < midX ? MIN_SIDE : window.innerWidth - BUTTON_SIZE - MIN_SIDE;
          targetY = Math.max(MIN_TOP, Math.min(targetY, window.innerHeight - BUTTON_SIZE - MIN_BOTTOM));

          // Auto-dodge in POS to avoid blocking checkout buttons
          if (activeView === 'pos' && targetY > window.innerHeight - 140) {
            targetY = window.innerHeight - 150;
          }

          setPosition({ x: targetX, y: targetY });
          return;
        }
      }
    } catch {
      // Fallback
    }

    setPosition(getDefaultPosition());
  }, [activeView, getDefaultPosition]);

  // Initialize and attach resize / orientation change listeners
  useEffect(() => {
    restoreOrSetDefault();

    const handleResizeOrRotate = () => {
      restoreOrSetDefault();
    };

    window.addEventListener('resize', handleResizeOrRotate);
    window.addEventListener('orientationchange', handleResizeOrRotate);

    return () => {
      window.removeEventListener('resize', handleResizeOrRotate);
      window.removeEventListener('orientationchange', handleResizeOrRotate);
    };
  }, [restoreOrSetDefault]);

  // Snap to horizontal edge with smooth animation
  const snapToNearestEdge = useCallback(
    (currentX: number, currentY: number) => {
      setIsTransitioning(true);

      const midX = window.innerWidth / 2;
      const snappedX = currentX < midX ? MIN_SIDE : window.innerWidth - BUTTON_SIZE - MIN_SIDE;

      let clampedY = Math.max(MIN_TOP, Math.min(currentY, window.innerHeight - BUTTON_SIZE - MIN_BOTTOM));

      // Avoid blocking POS bottom bar
      if (activeView === 'pos' && clampedY > window.innerHeight - 130) {
        clampedY = window.innerHeight - 140;
      }

      setPosition({ x: snappedX, y: clampedY });
      savePositionAsPercentage(snappedX, clampedY);

      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    },
    [activeView, savePositionAsPercentage]
  );

  // Reset to default on double-click or double-tap
  const handleResetToDefault = useCallback(() => {
    setIsTransitioning(true);
    const def = getDefaultPosition();
    setPosition(def);
    savePositionAsPercentage(def.x, def.y);
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, [getDefaultPosition, savePositionAsPercentage]);

  // Pointer down (Mouse or Touch)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    // Detect double tap / click
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      handleResetToDefault();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    const currentX = position?.x ?? (window.innerWidth - BUTTON_SIZE - MIN_SIDE);
    const currentY = position?.y ?? (window.innerHeight - BUTTON_SIZE - MIN_BOTTOM);

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
      // Ignore
    }
  };

  // Pointer move (Free 2D drag in all directions)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    // 6px threshold to differentiate between tap and drag
    if (Math.hypot(deltaX, deltaY) > 6) {
      dragStartRef.current.moved = true;
    }

    // Clamp within viewport during drag
    const newX = Math.max(MIN_SIDE, Math.min(dragStartRef.current.initialX + deltaX, window.innerWidth - BUTTON_SIZE - MIN_SIDE));
    const newY = Math.max(MIN_TOP, Math.min(dragStartRef.current.initialY + deltaY, window.innerHeight - BUTTON_SIZE - MIN_BOTTOM));

    setPosition({ x: newX, y: newY });
  };

  // Pointer up / release
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    if (!dragStartRef.current.moved) {
      // Tap / click detected!
      onClick();
    } else if (position) {
      // Snap to edge
      snapToNearestEdge(position.x, position.y);
    }
  };

  if (isOpen || !position) return null;

  const isDodgeActive = activeView === 'pos';

  return (
    <div
      ref={launcherRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleResetToDefault}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        touchAction: 'none',
      }}
      className={`fixed top-0 start-0 z-40 select-none cursor-grab active:cursor-grabbing ${
        isTransitioning ? 'transition-transform duration-300 ease-out' : ''
      } ${isDragging ? 'scale-110 shadow-2xl z-50' : ''}`}
      title={
        isAr
          ? 'اسحب بحرية في أي اتجاه · يلتصق بالحافة تلقائياً · نقر مزدوج لإعادته للزاوية'
          : 'Drag anywhere · Snaps to edge · Double click to reset position'
      }
      aria-label={isAr ? 'مساعد تايجوس الذكي' : 'Tygos AI Assistant'}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className={`relative group ${isDodgeActive ? 'opacity-90 scale-95' : ''}`}>
        {/* Glow halo */}
        <div className="absolute inset-0 bg-cyan-500/25 dark:bg-cyan-500/35 rounded-2xl blur-md pointer-events-none group-hover:bg-cyan-400/50 transition-colors" />

        {/* Button body */}
        <div className="relative w-14 h-14 sm:w-15 sm:h-15 rounded-2xl bg-gradient-to-tr from-slate-950 via-slate-900 to-cyan-950 border-2 border-cyan-400/60 dark:border-cyan-400/70 p-2 flex items-center justify-center shadow-xl shadow-cyan-950/60 hover:border-cyan-300 transition-all">
          <img
            src={TYGOS_LOGO_SRC}
            alt="TYGOS AI"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain pointer-events-none drop-shadow-md"
            draggable={false}
          />

          {/* Pulse status indicator */}
          <span className="absolute -top-1 -end-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500 border-2 border-slate-950" />
          </span>
        </div>

        {/* Tooltip on hover */}
        <div className="hidden sm:group-hover:flex absolute -top-8 start-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-cyan-300 whitespace-nowrap shadow-xl pointer-events-none">
          {isAr ? 'مساعد TYGOS الذكي' : 'TYGOS Assistant'}
        </div>
      </div>
    </div>
  );
};
