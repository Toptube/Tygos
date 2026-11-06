/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ESTABLISHMENT SETTINGS & LOCAL BACKUP/RESTORE MODULE
 * Currency, Multi-rate Tax, Inventory Valuation, Target Margins, and Sovereign JSON Backup.
 */

import React, { useState } from 'react';
import { Button } from '../common/Button.tsx';
import {
  Settings,
  DollarSign,
  Receipt,
  Scale,
  Percent,
  Download,
  Upload,
  RotateCcw,
  Check,
  AlertTriangle,
  Globe2,
  Moon,
  Sun,
  Shield,
  QrCode,
  Smartphone,
  Info,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { dataService, VenueSettings, DeliveryZone } from '../../services/dataService.ts';
import { uiPreferencesRepository } from '../../repositories/repositories.ts';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { useSync } from '../../sync/SyncContext.tsx';
import { DeploymentMode, DeviceRole } from '../../sync/syncTypes.ts';

export const SettingsModule: React.FC = () => {
  const { language, setLanguage, t } = useI18n();
  const isAr = language === 'ar';
  const { currentEstablishment, currentUser, setActiveView } = useAuth();
  const isOwnerOrManager =
    currentUser?.role === 'tenant_admin' ||
    currentUser?.role === 'general_manager' ||
    currentUser?.role === 'super_admin';
  const { refreshMaterialsAndProducts } = useBusiness();
  const estId = currentEstablishment?.id || 'default';

  // State
  const [currency, setCurrency] = useState('EGP');
  const [clickSound, setClickSound] = useState(() => uiPreferencesRepository.getClickSoundEnabled());
  const [taxStandard, setTaxStandard] = useState('14.0');
  const [taxReduced, setTaxReduced] = useState('5.0');
  const [serviceCharge, setServiceCharge] = useState('12.0');
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);
  const [valuationMethod, setValuationMethod] = useState<'weighted_average' | 'fifo'>('weighted_average');
  const [targetMargin, setTargetMargin] = useState('70');
  const [numberFormat, setNumberFormat] = useState<'standard' | 'european'>('standard');

  // Phase 5 QR Menu & Public App URL settings
  const [publicAppUrl, setPublicAppUrl] = useState(() =>
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  );
  const [autoAcceptOrders, setAutoAcceptOrders] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('5.0');

  const {
    deploymentMode,
    serverBaseUrl,
    registeredDevices,
    setDeploymentConfig,
    registerDevice,
    removeDevice,
  } = useSync();

  const [menuThemeColor, setMenuThemeColor] = useState('#06b6d4');
  const [hideUnavailable, setHideUnavailable] = useState(false);
  const [orderHoursStart, setOrderHoursStart] = useState('09:00');
  const [orderHoursEnd, setOrderHoursEnd] = useState('23:30');
  const [minDeliveryOrder, setMinDeliveryOrder] = useState('15');
  const [welcomeMessageAr, setWelcomeMessageAr] = useState('أهلاً بكم في منيو TYGOS الإلكتروني');
  const [welcomeMessageEn, setWelcomeMessageEn] = useState('Welcome to TYGOS Digital Menu');
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);
  const [loyaltyPointsPerUnit, setLoyaltyPointsPerUnit] = useState('1');
  const [loyaltyRedeemValue, setLoyaltyRedeemValue] = useState('0.05');
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([
    { id: 'z-1', nameAr: 'المنطقة المركزية', nameEn: 'Central Zone', fee: 5 },
    { id: 'z-2', nameAr: 'الأحياء المجاورة', nameEn: 'Nearby Districts', fee: 8 },
  ]);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneFee, setNewZoneFee] = useState('6');

  const [modeInput, setModeInput] = useState<DeploymentMode>(deploymentMode);
  const [serverUrlInput, setServerUrlInput] = useState(serverBaseUrl);
  const [newDevName, setNewDevName] = useState('');
  const [newDevRole, setNewDevRole] = useState<DeviceRole>('cashier');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  React.useEffect(() => {
    const loadSettings = async () => {
      const v = await dataService.getVenueSettings(estId);
      if (v.publicAppUrl) setPublicAppUrl(v.publicAppUrl);
      if (v.currency) setCurrency(v.currency);
      if (v.taxStandard !== undefined) setTaxStandard(String(v.taxStandard));
      if (v.autoAcceptOrders !== undefined) setAutoAcceptOrders(v.autoAcceptOrders);
      if (v.deliveryFee !== undefined) setDeliveryFee(String(v.deliveryFee));
      if (v.menuThemeColor) setMenuThemeColor(v.menuThemeColor);
      if (v.hideUnavailableMenuItems !== undefined) setHideUnavailable(v.hideUnavailableMenuItems);
      if (v.orderHoursStart) setOrderHoursStart(v.orderHoursStart);
      if (v.orderHoursEnd) setOrderHoursEnd(v.orderHoursEnd);
      if (v.minDeliveryOrder !== undefined) setMinDeliveryOrder(String(v.minDeliveryOrder));
      if (v.welcomeMessageAr) setWelcomeMessageAr(v.welcomeMessageAr);
      if (v.welcomeMessageEn) setWelcomeMessageEn(v.welcomeMessageEn);
      if (v.deliveryZones && v.deliveryZones.length > 0) setDeliveryZones(v.deliveryZones);
      if (v.loyaltyEnabled !== undefined) setLoyaltyEnabled(v.loyaltyEnabled);
      if (v.loyaltyPointsPerUnit !== undefined) setLoyaltyPointsPerUnit(String(v.loyaltyPointsPerUnit));
      if (v.loyaltyRedeemValue !== undefined) setLoyaltyRedeemValue(String(v.loyaltyRedeemValue));
    };
    loadSettings();
  }, [estId]);

  const handleSaveSettings = async () => {
    await dataService.saveVenueSettings(estId, {
      publicAppUrl,
      currency,
      taxStandard: parseFloat(taxStandard) || 14.0,
      autoAcceptOrders,
      deliveryFee: parseFloat(deliveryFee) || 5.0,
      targetMargin: parseFloat(targetMargin) || 70,
      menuThemeColor,
      hideUnavailableMenuItems: hideUnavailable,
      orderHoursStart,
      orderHoursEnd,
      minDeliveryOrder: parseFloat(minDeliveryOrder) || 0,
      deliveryZones,
      welcomeMessageAr,
      welcomeMessageEn,
      loyaltyEnabled,
      loyaltyPointsPerUnit: parseFloat(loyaltyPointsPerUnit) || 1,
      loyaltyRedeemValue: parseFloat(loyaltyRedeemValue) || 0.05,
    });
    setDeploymentConfig(modeInput, serverUrlInput.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Export JSON backup
  const handleExportBackup = async () => {
    const jsonStr = await dataService.exportPartitionBackupJSON(estId);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tygos_backup_${currentEstablishment?.code || 'R.0001'}_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setBackupMessage(isAr ? 'تم تصدير ملف النسخة الاحتياطية بنجاح!' : 'Backup exported successfully!');
    setTimeout(() => setBackupMessage(null), 3000);
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      const success = await dataService.restorePartitionBackupJSON(estId, content);
      if (success) {
        await refreshMaterialsAndProducts();
        setBackupMessage(isAr ? 'تمت استعادة البيانات بنجاح!' : 'Data restored successfully!');
      } else {
        setBackupMessage(isAr ? 'فشلت الاستعادة: تأكد من صحة ملف JSON' : 'Restore failed: Invalid JSON file');
      }
      setTimeout(() => setBackupMessage(null), 3500);
    };
    reader.readAsText(file);
  };

  // Reset to default templates
  const handleResetDemoData = async () => {
    if (confirm(isAr ? 'هل أنت متأكد من إعادة تعيين البيانات واستعادة القالب النموذجي؟' : 'Are you sure you want to reset data and reload model template?')) {
      await dataService.loadTemplate(estId, 'restaurant');
      await refreshMaterialsAndProducts();
      setBackupMessage(isAr ? 'تمت استعادة بيانات القالب النموذجي بنجاح!' : 'Template data reloaded successfully!');
      setTimeout(() => setBackupMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-500" />
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">
              {isAr ? 'إعدادات المنشأة وتخصيص المنظومة' : 'Establishment Settings'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isAr
              ? `تخصيص العملة، الضرائب، طريقة تقييم المخزون، والنسخ الاحتياطي لقسم [${currentEstablishment?.code || 'R.0001'}]`
              : `Customize currency, VAT rates, inventory valuation, and backup for partition [${currentEstablishment?.code || 'R.0001'}]`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {isOwnerOrManager && (
            <Button
              type="button"
              onClick={() => setActiveView('prelaunch_checklist')}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isAr ? 'قائمة الفحص قبل التشغيل' : 'Pre-Launch Checklist'}</span>
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSaveSettings}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-md shadow-cyan-900/30 transition-all cursor-pointer flex items-center gap-2"
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
            <span>{savedSuccess ? (isAr ? 'تم الحفظ بنجاح!' : 'Saved!') : (isAr ? 'حفظ الإعدادات' : 'Save Settings')}</span>
          </Button>
        </div>
      </div>

      {backupMessage && (
        <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 text-xs flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>{backupMessage}</span>
        </div>
      )}

      {/* 1. Currency & Financial Standards */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <DollarSign className="w-4 h-4 text-emerald-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {isAr ? 'العملة وتنسيق الأرقام' : 'Currency & Number Formatting'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'العملة الأساسية للحسابات' : 'Base Operating Currency'}
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none cursor-pointer font-mono"
            >
              <option value="USD">USD ($) - US Dollar</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="EGP">EGP (ج.م) - Egyptian Pound</option>
              <option value="SAR">SAR (ر.س) - Saudi Riyal</option>
              <option value="AED">AED (د.إ) - UAE Dirham</option>
              <option value="TRY">TRY (₺) - Turkish Lira</option>
              <option value="GBP">GBP (£) - British Pound</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'تنسيق الفواصل العشرية' : 'Decimal Format'}
            </label>
            <select
              value={numberFormat}
              onChange={(e) => setNumberFormat(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="standard">{isAr ? 'قياسي (1,234.50)' : 'Standard (1,234.50)'}</option>
              <option value="european">{isAr ? 'أوروبي (1.234,50)' : 'European (1.234,50)'}</option>
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {isAr ? 'صوت نقرة الأزرار الخفيف' : 'Subtle Button Click Sound'}
            </div>
            <div className="text-[11px] text-slate-500">
              {isAr ? 'تشغيل صوت لمسي خفيف عند الضغط على أزرار النظام' : 'Play subtle tactile audio feedback on button press'}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant={clickSound ? 'primary' : 'outline'}
            selected={clickSound}
            onClick={() => {
              const next = !clickSound;
              setClickSound(next);
              uiPreferencesRepository.setClickSoundEnabled(next);
            }}
          >
            {clickSound ? (isAr ? 'مفعّل' : 'Enabled') : (isAr ? 'معطّل' : 'Disabled')}
          </Button>
        </div>
      </div>

      {/* 2. Multi-Rate Tax & Invoicing */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <Receipt className="w-4 h-4 text-cyan-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {isAr ? 'الضرائب والفاتورة الإلكترونية' : 'Tax & Electronic Invoicing Rates'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'ضريبة القيمة المضافة الأساسية (%)' : 'Standard VAT Rate (%)'}
            </label>
            <input
              type="number"
              value={taxStandard}
              onChange={(e) => setTaxStandard(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'الضريبة المخفضة للسلع (%)' : 'Reduced VAT Rate (%)'}
            </label>
            <input
              type="number"
              value={taxReduced}
              onChange={(e) => setTaxReduced(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'رسم الخدمة السياحي (%)' : 'Service Charge (%)'}
            </label>
            <input
              type="number"
              value={serviceCharge}
              onChange={(e) => setServiceCharge(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={isTaxInclusive}
              onChange={(e) => setIsTaxInclusive(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>
              {isAr
                ? 'أسعار قائمة الطعام تشمل ضريبة القيمة المضافة بالفعل (Tax Inclusive)'
                : 'Menu prices are already inclusive of VAT (Tax Inclusive)'}
            </span>
          </label>
        </div>
      </div>

      {/* 3. Inventory Valuation & Target Margins */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <Scale className="w-4 h-4 text-purple-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {isAr ? 'تقييم المخزون وهوامش الربح' : 'Inventory Valuation & Margins'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'طريقة تقييم المخزون المعتمدة' : 'Inventory Valuation Method'}
            </label>
            <select
              value={valuationMethod}
              onChange={(e) => setValuationMethod(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="weighted_average">{isAr ? 'المتوسط المرجح المتحرك (WAC - الموصى به)' : 'Weighted Average Cost (WAC - Recommended)'}</option>
              <option value="fifo">{isAr ? 'الوارد أولاً يصرف أولاً (FIFO)' : 'First-In, First-Out (FIFO)'}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'هامش الربح الإجمالي المستهدف للتسعير (%)' : 'Target Gross Profit Margin (%)'}
            </label>
            <input
              type="number"
              min="40"
              max="90"
              value={targetMargin}
              onChange={(e) => setTargetMargin(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3. QR Menu & Public App URL (المرحلة الخامسة) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <QrCode className="w-4 h-4 text-cyan-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {isAr ? 'المنيو الإلكتروني ورابط التطبيق (QR Menu)' : 'Public App URL & QR Menu'}
          </h2>
        </div>

        {/* Prototype Environment Notice */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">
              {isAr ? 'ملاحظة تشغيلية للمرحلة الحالية:' : 'Prototype Simulation Notice:'}
            </span>
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
              {isAr
                ? '«التجربة الحالية تعمل داخل نفس المتصفح فقط». يتم التزامن اللحظي بين شاشة العميل والكاشير وشاشات المطبخ عبر قنوات البث المحلية (BroadcastChannel) دون أي خوادم خارجية.'
                : '“Current prototype sync operates locally inside the same browser only”. Real-time sync between customer QR, cashier, and KDS is powered by in-browser BroadcastChannels without external servers.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'رابط التطبيق المعتمد (Public App URL)' : 'Public App URL'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={publicAppUrl}
                onChange={(e) => setPublicAppUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none"
              />
              <Button
                type="button"
                onClick={() => setPublicAppUrl(window.location.origin)}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer"
              >
                {isAr ? 'الافتراضي' : 'Reset Origin'}
              </Button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {isAr
                ? 'يستخدم في توليد شارات وروابط ورموز QR للمنيو الإلكتروني وطاولات الصالة.'
                : 'Used when generating customer QR codes, table stickers, and copyable links.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'رسوم التوصيل الافتراضية (Delivery Fee)' : 'Default Delivery Fee'}
            </label>
            <input
              type="number"
              step="0.5"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                {isAr ? 'قبول طلبات QR تلقائياً' : 'Auto-Accept QR Orders'}
              </span>
              <span className="text-[10px] text-slate-500">
                {isAr ? 'تخطي موافقة الكاشير اليدوية' : 'Bypass manual cashier approval'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoAcceptOrders}
              onChange={(e) => setAutoAcceptOrders(e.target.checked)}
              className="w-4 h-4 accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Menu Theme, Hours, Min Order, Welcome Message & Delivery Zones */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'لون ثيم المنيو العام' : 'Public Menu Theme Color'}
            </label>
            <input
              type="color"
              value={menuThemeColor}
              onChange={(e) => setMenuThemeColor(e.target.value)}
              className="w-full h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                {isAr ? 'إخفاء الأصناف غير المتاحة' : 'Hide Unavailable Items'}
              </span>
              <span className="text-[10px] text-slate-500">
                {isAr ? 'عدم عرض الأصناف النافدة في المنيو العام' : 'Hide sold-out items from public menu'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={hideUnavailable}
              onChange={(e) => setHideUnavailable(e.target.checked)}
              className="w-4 h-4 accent-cyan-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'ساعات استقبال الطلبات (من - إلى)' : 'Order Reception Hours (Start - End)'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={orderHoursStart}
                onChange={(e) => setOrderHoursStart(e.target.value)}
                className="flex-1 px-2.5 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              />
              <input
                type="time"
                value={orderHoursEnd}
                onChange={(e) => setOrderHoursEnd(e.target.value)}
                className="flex-1 px-2.5 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'الحد الأدنى لطلب التوصيل' : 'Minimum Delivery Order'}
            </label>
            <input
              type="number"
              min="0"
              value={minDeliveryOrder}
              onChange={(e) => setMinDeliveryOrder(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'رسالة الترحيب في المنيو العام (عربي / إنجليزي)' : 'Public Menu Welcome Message (AR / EN)'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={welcomeMessageAr}
                onChange={(e) => setWelcomeMessageAr(e.target.value)}
                placeholder="رسالة الترحيب بالعربية"
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              />
              <input
                type="text"
                value={welcomeMessageEn}
                onChange={(e) => setWelcomeMessageEn(e.target.value)}
                placeholder="Welcome message in English"
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          {/* Delivery Zones */}
          <div className="sm:col-span-2 space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isAr ? 'مناطق التوصيل ورسوم كل منطقة' : 'Delivery Zones & Fees'}
            </div>
            <div className="flex flex-wrap gap-2">
              {deliveryZones.map((z) => (
                <div
                  key={z.id}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center gap-2"
                >
                  <span>{isAr ? z.nameAr : z.nameEn}</span>
                  <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                    {z.fee} {currency}
                  </span>
                  <Button
                    type="button"
                    onClick={() => setDeliveryZones(deliveryZones.filter((item) => item.id !== z.id))}
                    className="text-rose-500 text-xs cursor-pointer"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                placeholder={isAr ? 'اسم المنطقة...' : 'Zone name...'}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              />
              <input
                type="number"
                value={newZoneFee}
                onChange={(e) => setNewZoneFee(e.target.value)}
                placeholder={isAr ? 'الرسوم' : 'Fee'}
                className="w-24 px-3 py-1.5 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              />
              <Button
                type="button"
                onClick={() => {
                  if (!newZoneName.trim()) return;
                  setDeliveryZones([
                    ...deliveryZones,
                    {
                      id: `z-${Date.now()}`,
                      nameAr: newZoneName.trim(),
                      nameEn: newZoneName.trim(),
                      fee: parseFloat(newZoneFee) || 0,
                    },
                  ]);
                  setNewZoneName('');
                }}
                className="px-3 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-bold cursor-pointer"
              >
                {isAr ? 'إضافة منطقة' : 'Add Zone'}
              </Button>
            </div>
          </div>

          {/* Loyalty Program Settings */}
          <div className="sm:col-span-2 space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'برنامج نقاط الولاء للعملاء' : 'Customer Loyalty Points Program'}
              </span>
              <input
                type="checkbox"
                checked={loyaltyEnabled}
                onChange={(e) => setLoyaltyEnabled(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 cursor-pointer"
              />
            </div>
            {loyaltyEnabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    {isAr ? 'نقاط مكتسبة لكل وحدة عملة' : 'Points Earned per Currency Unit'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={loyaltyPointsPerUnit}
                    onChange={(e) => setLoyaltyPointsPerUnit(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    {isAr ? 'قيمة الخصم لكل نقطة عند الاستبدال' : 'Discount Value per Redeemed Point'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={loyaltyRedeemValue}
                    onChange={(e) => setLoyaltyRedeemValue(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3.5 Deployment Mode & Registered Devices (Phase 6 Architecture Readiness) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <Globe2 className="w-4 h-4 text-cyan-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {isAr ? 'وضع التشغيل والمزامنة وتسجيل الأجهزة' : 'Deployment Mode & Registered Devices'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'وضع التشغيل (Deployment Mode)' : 'Deployment Mode'}
            </label>
            <select
              value={modeInput}
              onChange={(e) => setModeInput(e.target.value as DeploymentMode)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            >
              <option value="standalone">{isAr ? 'مستقل محلياً (Standalone)' : 'Standalone (Browser Local)'}</option>
              <option value="cloud">{isAr ? 'سحابي أونلاين (Cloud Server)' : 'Cloud Server (Online)'}</option>
              <option value="local">{isAr ? 'سيرفر محلي بالمنشأة (Local LAN)' : 'Local LAN Server'}</option>
              <option value="hybrid">{isAr ? 'هجين (Hybrid Offline-First)' : 'Hybrid (Offline-First + Sync)'}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'عنوان الخادم (Server Base URL)' : 'Server Base URL'}
            </label>
            <input
              type="url"
              value={serverUrlInput}
              onChange={(e) => setServerUrlInput(e.target.value)}
              placeholder="http://192.168.1.50:4000"
              className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            />
          </div>
        </div>

        {/* Registered Devices List */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {isAr ? 'الأجهزة المسجلة في المنشأة (لتوجيه التذاكر والطابعات)' : 'Registered Venue Devices'}
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {registeredDevices.map((dev) => (
              <div key={dev.id} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">{dev.name}</span>
                  <span className="mx-2 text-slate-400">·</span>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400">{dev.role}</span>
                </div>
                <Button
                  type="button"
                  onClick={() => removeDevice(dev.id)}
                  className="text-xs text-rose-500 cursor-pointer"
                >
                  {isAr ? 'حذف' : 'Remove'}
                </Button>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <input
              type="text"
              value={newDevName}
              onChange={(e) => setNewDevName(e.target.value)}
              placeholder={isAr ? 'اسم الجهاز (مثلاً: كاشير 2)...' : 'Device name...'}
              className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            />
            <select
              value={newDevRole}
              onChange={(e) => setNewDevRole(e.target.value as DeviceRole)}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            >
              <option value="cashier">{isAr ? 'كاشير' : 'Cashier'}</option>
              <option value="kitchen">{isAr ? 'مطبخ' : 'Kitchen'}</option>
              <option value="bar">{isAr ? 'بار' : 'Bar'}</option>
              <option value="kds_display">{isAr ? 'شاشة عرض' : 'KDS Display'}</option>
            </select>
            <Button
              type="button"
              onClick={() => {
                if (!newDevName.trim()) return;
                registerDevice({
                  name: newDevName.trim(),
                  role: newDevRole,
                  isActive: true,
                });
                setNewDevName('');
              }}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-bold cursor-pointer"
            >
              {isAr ? 'تسجيل جهاز' : 'Register Device'}
            </Button>
          </div>
        </div>
      </div>

      {/* 4. Local Backup, Restore & Reset */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <Shield className="w-4 h-4 text-cyan-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {isAr ? 'النسخ الاحتياطي والأمان المحلي' : 'Sovereign Backup & Partition Reset'}
          </h2>
        </div>

        <p className="text-xs text-slate-500">
          {isAr
            ? 'بيانات منشأتك ملك لك بالكامل. يمكنك تنزيل نسخة JSON مشفرة محلياً أو استعادتها في أي وقت.'
            : 'Your partition data is sovereign. Export or restore your local JSON backup anytime without internet.'}
        </p>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <Button
            type="button"
            onClick={handleExportBackup}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{isAr ? 'تصدير نسخة احتياطية (JSON)' : 'Export JSON Backup'}</span>
          </Button>

          <label className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-cyan-500" />
            <span>{isAr ? 'استعادة من ملف (JSON)' : 'Restore from JSON File'}</span>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>

          <Button
            type="button"
            onClick={handleResetDemoData}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors ms-auto"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isAr ? 'استعادة القالب النموذجي' : 'Reload Model Template'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
