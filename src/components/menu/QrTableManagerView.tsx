/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * QR CODE & TABLE STICKER MANAGER (Phase 5)
 * Generates offline SVG & PNG QR codes for venue and individual tables.
 * Print ready table tents / stickers with venue branding and batch print layout.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  Plus,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { getPublicMenuUrl } from '../../utils/urlRouter.ts';
import { dataService } from '../../services/dataService.ts';
import { TYGOS_LOGO_SRC } from '../brand/TygosLogo.tsx';

interface TableQrItem {
  tableNumber: string;
  url: string;
  qrDataUrl: string;
}

export const QrTableManagerView: React.FC = () => {
  const { currentEstablishment } = useAuth();
  const { language } = useI18n();
  const isAr = language === 'ar';

  const estId = currentEstablishment?.id || 'default';
  const estCode = currentEstablishment?.code || 'R.0001';
  const venueName = currentEstablishment?.name || 'TYGOS VENUE';

  const [tableCount, setTableCount] = useState<number>(12);
  const [tableItems, setTableItems] = useState<TableQrItem[]>([]);
  const [mainVenueQr, setMainVenueQr] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dataService.getVenueSettings(estId).then((s) => {
      if (s.tableCount && s.tableCount >= 1) {
        setTableCount(s.tableCount);
      }
    });
  }, [estId]);

  // Generate QR codes using offline npm qrcode library
  useEffect(() => {
    let mounted = true;
    const generate = async () => {
      setLoading(true);
      const venueUrl = getPublicMenuUrl(estCode);

      try {
        const venueQr = await QRCode.toDataURL(venueUrl, {
          width: 320,
          margin: 1,
          color: { dark: '#0891b2', light: '#ffffff' },
        });

        const list: TableQrItem[] = [];
        for (let i = 1; i <= tableCount; i++) {
          const tableStr = i.toString();
          const tableUrl = getPublicMenuUrl(estCode, tableStr);
          const tQr = await QRCode.toDataURL(tableUrl, {
            width: 280,
            margin: 1,
            color: { dark: '#0f172a', light: '#ffffff' },
          });
          list.push({
            tableNumber: tableStr,
            url: tableUrl,
            qrDataUrl: tQr,
          });
        }

        if (mounted) {
          setMainVenueQr(venueQr);
          setTableItems(list);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to generate offline QR codes:', err);
        if (mounted) setLoading(false);
      }
    };

    generate();
    return () => {
      mounted = false;
    };
  }, [estCode, tableCount]);

  const handleCopy = (url: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    }
  };

  const handleDownloadPng = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintBatch = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* 1. Header (Hidden on Print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-cyan-500" />
            <span>{isAr ? 'رموز الـ QR وملصقات الطاولات' : 'QR Codes & Table Stickers'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'توليد وطباعة ملصقات الطاولات الجاهزة بشعار المنشأة ليطلب الزبون مباشرة من طاولته'
              : 'Generate and print branded table tent stickers for direct, table-specific ordering'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintBatch}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? 'طباعة كافة الملصقات (A4 / حراري)' : 'Print All Stickers'}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Venue QR Card (Hidden on Print) */}
      <div className="print:hidden p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 max-w-lg">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              {isAr ? 'الرابط العام الرئيسي للمنشأة' : 'General Public Menu Link'}
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {isAr ? 'رمز QR العام (للدليفري، واجهة المحل، والإنستغرام)' : 'General QR Code (For Storefront, Delivery & Social Media)'}
          </h2>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 font-mono text-xs text-cyan-600 dark:text-cyan-300" dir="ltr">
            <span className="truncate">{getPublicMenuUrl(estCode)}</span>
            <button
              type="button"
              onClick={() => handleCopy(getPublicMenuUrl(estCode))}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {copiedUrl === getPublicMenuUrl(estCode) ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleDownloadPng(mainVenueQr, `tygos_menu_${estCode}`)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-cyan-500" />
              <span>{isAr ? 'تنزيل PNG عالي الدقة' : 'Download PNG'}</span>
            </button>
            <a
              href={getPublicMenuUrl(estCode)}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
              <span>{isAr ? 'معاينة في متصفح العميل' : 'Open in New Tab'}</span>
            </a>
          </div>
        </div>

        {/* Big Venue QR Preview */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-md shrink-0 text-center">
          {mainVenueQr && (
            <img src={mainVenueQr} alt="Venue QR" className="w-44 h-44 object-contain mx-auto" />
          )}
          <span className="text-[11px] font-bold text-slate-800 block mt-2 font-mono">
            {estCode}
          </span>
        </div>
      </div>

      {/* 3. Table Configuration Toolbar (Hidden on Print) */}
      <div className="print:hidden p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {isAr ? 'عدد الطاولات المطلوب توليدها:' : 'Number of tables to generate:'}
          </span>
          <input
            type="number"
            min={1}
            max={100}
            value={tableCount}
            onChange={(e) => {
              const val = Math.max(1, Math.min(100, Number(e.target.value) || 1));
              setTableCount(val);
              dataService.saveVenueSettings(estId, { tableCount: val });
            }}
            className="w-20 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-bold font-mono text-center text-slate-900 dark:text-white"
          />
        </div>
        <span className="text-xs text-slate-400">
          {isAr ? `تم تجهيز ${tableItems.length} ملصق طاولة للطباعة الفورية` : `Ready with ${tableItems.length} table tents`}
        </span>
      </div>

      {/* 4. TABLE STICKERS PRINTABLE GRID */}
      {/* On print, this outputs crisp 80mm table stickers / A4 sheets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-2 print:gap-6 print:m-0">
        {tableItems.map((item) => (
          <div
            key={item.tableNumber}
            className="p-5 rounded-3xl bg-white text-slate-950 border-2 border-slate-800 shadow-lg flex flex-col items-center text-center space-y-3 relative overflow-hidden print:shadow-none print:break-inside-avoid"
          >
            {/* Top Brand Tag */}
            <div className="flex items-center gap-2">
              <img src={TYGOS_LOGO_SRC} alt="Logo" className="w-6 h-6 object-contain" />
              <span className="font-black text-sm tracking-tight">{venueName}</span>
            </div>

            {/* Table Number Pill */}
            <div className="px-3 py-1 rounded-full bg-slate-950 text-white text-xs font-black tracking-wide">
              {isAr ? `طاولة رقم #${item.tableNumber}` : `Table #${item.tableNumber}`}
            </div>

            {/* QR Code */}
            <div className="w-36 h-36 bg-white p-1 rounded-xl border border-slate-300 flex items-center justify-center">
              {item.qrDataUrl && (
                <img src={item.qrDataUrl} alt={`Table ${item.tableNumber} QR`} className="w-full h-full object-contain" />
              )}
            </div>

            {/* Action Callout */}
            <div className="space-y-0.5">
              <span className="text-sm font-black text-slate-900 block">
                {isAr ? 'امسح الكود واطلب بموبايلك' : 'Scan & Order With Phone'}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {isAr ? 'بدون تحميل تطبيقات · الدفع عند الاستلام' : 'No App Needed · Pay on Delivery'}
              </span>
            </div>

            {/* Quick action buttons (Hidden on Print) */}
            <div className="print:hidden flex items-center gap-2 pt-2 border-t border-slate-200 w-full justify-center">
              <button
                type="button"
                onClick={() => handleCopy(item.url)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title={isAr ? 'نسخ الرابط' : 'Copy URL'}
              >
                {copiedUrl === item.url ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => handleDownloadPng(item.qrDataUrl, `table_${item.tableNumber}_qr`)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title={isAr ? 'تنزيل كصورة' : 'Download PNG'}
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title={isAr ? 'تجربة رابط الطاولة' : 'Test Table Link'}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
