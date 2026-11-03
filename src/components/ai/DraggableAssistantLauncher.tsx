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
}

const STORAGE_KEY = 'tygos_assistant_launcher_pos';

export const DraggableAssistantLauncher: React.FC<DraggableAssistantLauncherProps> = ({
  onClick,
  isOpen,
}) => {
  const { language, dir } = useI18n();
  const isAr = language === 'ar';

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number; moved: boolean }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    moved: false,
  });
  const launcherRef = useRef<HTMLDivElement>(null);

  // Initialize position on mount
  useEffect(() => {
    const updateDefaultPos = () => {
      const margin = 20;
      const size = 60;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (
            typeof parsed.x === 'number' &&
            typeof parsed.y === 'number' &&
            parsed.x >= 0 &&
            parsed.x <= window.innerWidth - size &&
            parsed.y >= 0 &&
            parsed.y <= window.innerHeight - size
          ) {
            setPosition(parsed);
            return;
          }
        }
      } catch {
        // Fallback
      }

      // Default safe placement: bottom-end corner
      const defaultX = dir === 'rtl' ? margin : window.innerWidth - size - margin;
      const defaultY = window.innerHeight - size - margin;
      setPosition({ x: Math.max(margin, defaultX), y: Math.max(margin, defaultY) });
    };

    updateDefaultPos();
    window.addEventListener('resize', updateDefaultPos);
    return () => window.removeEventListener('resize', updateDefaultPos);
  }, [dir]);

  const snapToEdge = useCallback((x: number, y: number) => {
    const size = 60;
    const margin = 16;
    const clampedY = Math.min(Math.max(margin, y), window.innerHeight - size - margin);

    // Snap to nearest horizontal edge (left or right)
    const midX = window.innerWidth / 2;
    const snappedX = x < midX ? margin : window.innerWidth - size - margin;

    const newPos = { x: snappedX, y: clampedY };
    setPosition(newPos);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPos));
    } catch {
      // Ignore
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only primary button
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const currentX = position?.x ?? (window.innerWidth - 76);
    const currentY = position?.y ?? (window.innerHeight - 76);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY,
      moved: false,
    };

    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    if (Math.hypot(deltaX, deltaY) > 5) {
      dragStartRef.current.moved = true;
    }

    const size = 60;
    const newX = Math.min(Math.max(8, dragStartRef.current.initialX + deltaX), window.innerWidth - size - 8);
    const newY = Math.min(Math.max(8, dragStartRef.current.initialY + deltaY), window.innerHeight - size - 8);

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    if (!dragStartRef.current.moved) {
      // Was a tap/click!
      onClick();
    } else if (position) {
      snapToEdge(position.x, position.y);
    }
  };

  if (isOpen || !position) return null;

  return (
    <div
      ref={launcherRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        touchAction: 'none',
      }}
      className={`fixed top-0 start-0 z-40 select-none cursor-grab active:cursor-grabbing transition-shadow ${
        isDragging ? 'scale-105 shadow-2xl' : 'transition-transform duration-300 ease-out'
      }`}
      title={isAr ? 'اسحب لنقل المساعد في أي مكان · انقر لفتح المحادثة' : 'Drag to reposition anywhere · Click to chat'}
      aria-label={isAr ? 'مساعد TYGOS الذكي' : 'TYGOS Assistant'}
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
        {/* Glow halo */}
        <div className="absolute inset-0 bg-cyan-500/25 dark:bg-cyan-500/35 rounded-2xl blur-md pointer-events-none group-hover:bg-cyan-400/45 transition-colors" />

        {/* Button body */}
        <div className="relative w-14 h-14 sm:w-15 sm:h-15 rounded-2xl bg-gradient-to-tr from-slate-950 via-slate-900 to-cyan-950 border-2 border-cyan-400/60 dark:border-cyan-400/70 p-2 flex items-center justify-center shadow-xl shadow-cyan-950/60 hover:border-cyan-300 transition-all">
          <img
            src={TYGOS_LOGO_SRC}
            alt="TYGOS AI"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain pointer-events-none drop-shadow-md"
            draggable={false}
          />

          {/* Online badge */}
          <span className="absolute -top-1 -end-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500 border-2 border-slate-950" />
          </span>
        </div>

        {/* Hover / hint label */}
        <div className="hidden sm:group-hover:flex absolute -top-8 start-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-bold text-cyan-300 whitespace-nowrap shadow-lg pointer-events-none">
          {isAr ? 'مساعد TYGOS' : 'TYGOS AI'}
        </div>
      </div>
    </div>
  );
};
