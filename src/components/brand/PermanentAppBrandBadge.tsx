/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Permanent App Brand Badge & App URL Component (Phase 5)
 * Displays the official approved TYGOS emblem alongside the configurable application link
 * with 1-click copy, offline local QR code generator, and standalone open capabilities.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button.tsx';
import {
  Copy,
  Check,
  ExternalLink,
  Share2,
  QrCode,
  X,
  Globe2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { TYGOS_LOGO_SRC, TYGOS_DARK_LOGO_SRC } from './TygosLogo.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { settingsRepository } from '../../repositories/repositories.ts';

/**
 * Dynamically resolves the application URL from localStorage settings or window.location.origin.
 * Never hardcodes any fixed cloud or preview domain!
 */
export function getResolvedAppUrl(): string {
  try {
    const stored = settingsRepository.getPublicAppUrl();
    if (stored && stored.trim()) {
      return stored.trim();
    }
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      return window.location.origin;
    }
  } catch {
    // fallback
  }
  return 'http://localhost:3000';
}

export type BrandBadgeVariant = 'header-pill' | 'banner' | 'card' | 'footer' | 'compact';

interface PermanentAppBrandBadgeProps {
  variant?: BrandBadgeVariant;
  className?: string;
  showShareModal?: boolean;
}

export const PermanentAppBrandBadge: React.FC<PermanentAppBrandBadgeProps> = ({
  variant = 'header-pill',
  className = '',
}) => {
  const { language } = useI18n();
  const isAr = language === 'ar';
  const appUrl = getResolvedAppUrl();

  const [copied, setCopied] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(appUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = appUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(appUrl, '_blank', 'noopener,noreferrer');
  };

  // 1. Compact Header Pill variant (fits right inside top navigation bars)
  if (variant === 'header-pill') {
    return (
      <>
        <div
          className={`inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-cyan-500/30 shadow-xs backdrop-blur-xs select-none transition-all hover:border-cyan-500/60 ${className}`}
        >
          {/* Approved Logo */}
          <div className="relative shrink-0 flex items-center justify-center">
            <img
              src={TYGOS_LOGO_SRC}
              alt="TYGOS Logo"
              referrerPolicy="no-referrer"
              className="w-5 h-5 sm:w-5.5 sm:h-5.5 object-contain select-none"
            />
          </div>

          {/* App URL text & Copy Button */}
          <div className="flex items-center gap-1.5">
            <span className="hidden xl:inline text-[10px] font-bold text-slate-500 dark:text-slate-400">
              {isAr ? 'رابط التطبيق:' : 'App Link:'}
            </span>
            <Button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] font-mono font-semibold text-cyan-700 dark:text-cyan-300 hover:text-cyan-600 dark:hover:text-cyan-200 transition-colors cursor-pointer group"
              title={isAr ? 'انقر لنسخ رابط التطبيق' : 'Click to copy app link'}
            >
              <span className="truncate max-w-[120px] sm:max-w-[160px] md:max-w-[200px] text-start" dir="ltr">
                {appUrl.replace(/^https?:\/\//, '')}
              </span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 animate-scale-in" />
              ) : (
                <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100 shrink-0" />
              )}
            </Button>
          </div>

          {/* QR & Share modal trigger */}
          <Button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isAr ? 'عرض رمز QR' : 'Display QR code'}
          >
            <QrCode className="w-3.5 h-3.5" />
          </Button>
        </div>

        <AppShareModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          appUrl={appUrl}
          isAr={isAr}
          copied={copied}
          onCopy={handleCopy}
          onOpenExternal={handleOpenExternal}
        />
      </>
    );
  }

  // 2. Banner variant (top of landing page)
  if (variant === 'banner') {
    return (
      <>
        <div
          className={`w-full bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 border-b border-cyan-500/30 text-white px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2.5 shadow-md relative z-40 select-none ${className}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 p-1 flex items-center justify-center shrink-0">
              <img
                src={TYGOS_LOGO_SRC}
                alt="TYGOS"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-center gap-2 truncate text-xs">
              <span className="font-black text-cyan-300 tracking-wide">TYGOS</span>
              <span className="hidden sm:inline text-slate-400">·</span>
              <span className="text-slate-300 text-[11px] truncate">
                {isAr ? 'رابط التطبيق:' : 'App Link:'}
              </span>
              <span className="font-mono text-[11px] text-cyan-200 font-bold bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-500/30 truncate" dir="ltr">
                {appUrl}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ms-auto">
            <Button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الرابط' : 'Copy Link')}</span>
            </Button>

            <Button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">{isAr ? 'رمز QR' : 'QR Code'}</span>
            </Button>

            <Button
              type="button"
              onClick={handleOpenExternal}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isAr ? 'فتح في نافذة مستقلة' : 'Open in new tab'}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <AppShareModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          appUrl={appUrl}
          isAr={isAr}
          copied={copied}
          onCopy={handleCopy}
          onOpenExternal={handleOpenExternal}
        />
      </>
    );
  }

  // 3. Card variant (for inside drawers, login page)
  if (variant === 'card') {
    return (
      <>
        <div
          className={`p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 dark:border-cyan-500/30 shadow-lg text-white space-y-2.5 select-none ${className}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={TYGOS_LOGO_SRC}
                alt="TYGOS Emblem"
                className="w-8 h-8 object-contain shrink-0 drop-shadow-md"
              />
              <div>
                <div className="text-xs font-black tracking-tight">
                  TYGOS
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {isAr ? 'رابط التطبيق' : 'App Link'}
                </div>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors cursor-pointer"
              title={isAr ? 'رمز QR للمشاركة' : 'Share QR Code'}
            >
              <QrCode className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2">
            <div className="font-mono text-[11px] text-cyan-300 truncate" dir="ltr">
              {appUrl}
            </div>
            <Button
              type="button"
              onClick={handleCopy}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title={isAr ? 'نسخ الرابط' : 'Copy URL'}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>

          <div className="flex items-center justify-end text-[10px] text-slate-400 pt-0.5">
            <Button
              type="button"
              onClick={handleOpenExternal}
              className="hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{isAr ? 'فتح الرابط' : 'Open'}</span>
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <AppShareModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          appUrl={appUrl}
          isAr={isAr}
          copied={copied}
          onCopy={handleCopy}
          onOpenExternal={handleOpenExternal}
        />
      </>
    );
  }

  // 4. Footer variant
  return (
    <>
      <div className={`inline-flex flex-wrap items-center gap-2 select-none ${className}`}>
        <div className="flex items-center gap-1.5">
          <img
            src={TYGOS_LOGO_SRC}
            alt="TYGOS Logo"
            className="w-4 h-4 object-contain shrink-0"
          />
          <span className="font-black text-slate-800 dark:text-slate-200 text-xs">TYGOS</span>
        </div>
        <span className="text-slate-400">·</span>
        <span className="text-[11px] text-slate-500">{isAr ? 'رابط التطبيق:' : 'App Link:'}</span>
        <Button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer group"
          title={isAr ? 'انقر لنسخ رابط التطبيق' : 'Click to copy app link'}
        >
          <span dir="ltr" className="truncate max-w-[240px]">
            {appUrl}
          </span>
          {copied ? (
            <Check className="w-3 h-3 text-emerald-500 shrink-0" />
          ) : (
            <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100 shrink-0" />
          )}
        </Button>
        <Button
          type="button"
          onClick={() => setIsQrModalOpen(true)}
          className="p-1 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
          title={isAr ? 'رمز QR' : 'QR code'}
        >
          <QrCode className="w-3 h-3" />
        </Button>
      </div>

      <AppShareModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        appUrl={appUrl}
        isAr={isAr}
        copied={copied}
        onCopy={handleCopy}
        onOpenExternal={handleOpenExternal}
      />
    </>
  );
};

// -------------------------------------------------------------
// App Share & Offline Local QR Code Modal (Pure NPM qrcode, NO external API)
// -------------------------------------------------------------
interface AppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl: string;
  isAr: boolean;
  copied: boolean;
  onCopy: (e: React.MouseEvent) => void;
  onOpenExternal: (e: React.MouseEvent) => void;
}

const AppShareModal: React.FC<AppShareModalProps> = ({
  isOpen,
  onClose,
  appUrl,
  isAr,
  copied,
  onCopy,
  onOpenExternal,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen && appUrl) {
      QRCode.toDataURL(appUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#0891b2',
          light: '#0b101e',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate offline QR code:', err));
    }
  }, [isOpen, appUrl]);

  if (!isOpen) return null;

  const handleShareWhatsApp = () => {
    const text = isAr
      ? `رابط تطبيق TYGOS لإدارة المطاعم والضيافة: ${appUrl}`
      : `TYGOS Hospitality Management Platform: ${appUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-cyan-500/30 rounded-3xl shadow-2xl p-6 text-slate-900 dark:text-white space-y-5 animate-scale-in">
        {/* Close Button */}
        <Button
          type="button"
          onClick={onClose}
          className="absolute top-4 end-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Modal Brand Header */}
        <div className="flex flex-col items-center text-center pt-2">
          <div className="relative mb-2">
            <img
              src={TYGOS_DARK_LOGO_SRC}
              alt="TYGOS Emblem"
              className="w-20 h-20 object-contain rounded-2xl relative z-10 drop-shadow-xl border border-cyan-500/30"
            />
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            TYGOS
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
            {isAr ? 'رابط التطبيق' : 'App Link'}
          </p>
        </div>

        {/* Offline Local QR Code Display Frame */}
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <div className="w-52 h-52 bg-[#0b101e] rounded-xl p-2.5 border border-cyan-500/30 shadow-inner flex items-center justify-center overflow-hidden">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="TYGOS Offline QR Code"
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <div className="text-xs text-slate-400 animate-pulse">
                {isAr ? 'جاري إنشاء رمز QR...' : 'Generating QR...'}
              </div>
            )}
          </div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2.5 flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5 text-cyan-500" />
            <span>{isAr ? 'امسح الرمز بكاميرا هاتفك للفتح المباشر' : 'Scan with mobile camera for instant access'}</span>
          </span>
        </div>

        {/* Direct Link & One-Click Copy Field */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block text-start">
            {isAr ? 'رابط التطبيق:' : 'App Link:'}
          </label>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <Globe2 className="w-4 h-4 text-cyan-500 shrink-0" />
            <input
              type="text"
              readOnly
              value={appUrl}
              className="bg-transparent border-0 text-xs font-mono text-cyan-700 dark:text-cyan-300 w-full focus:outline-hidden"
              dir="ltr"
            />
            <Button
              type="button"
              onClick={onCopy}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? (isAr ? 'تم!' : 'Done') : (isAr ? 'نسخ' : 'Copy')}</span>
            </Button>
          </div>
        </div>

        {/* Action Buttons: WhatsApp & Standalone */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            onClick={handleShareWhatsApp}
            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>{isAr ? 'إرسال عبر واتساب' : 'Share WhatsApp'}</span>
          </Button>

          <Button
            type="button"
            onClick={onOpenExternal}
            className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 text-cyan-400" />
            <span>{isAr ? 'فتح في تبويب جديد' : 'Open in New Tab'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
