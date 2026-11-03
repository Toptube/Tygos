/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ESTABLISHMENT SETTINGS & LOCAL BACKUP/RESTORE MODULE
 * Currency, Multi-rate Tax, Inventory Valuation, Target Margins, and Sovereign JSON Backup.
 */

import React, { useState } from 'react';
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
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { dataService } from '../../services/dataService.ts';
import { useBusiness } from '../../context/BusinessContext.tsx';

export const SettingsModule: React.FC = () => {
  const { language, setLanguage, t } = useI18n();
  const isAr = language === 'ar';
  const { currentEstablishment } = useAuth();
  const { refreshMaterialsAndProducts } = useBusiness();
  const estId = currentEstablishment?.id || 'default';

  // State
  const [currency, setCurrency] = useState('USD');
  const [taxStandard, setTaxStandard] = useState('14.0');
  const [taxReduced, setTaxReduced] = useState('5.0');
  const [serviceCharge, setServiceCharge] = useState('12.0');
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);
  const [valuationMethod, setValuationMethod] = useState<'weighted_average' | 'fifo'>('weighted_average');
  const [targetMargin, setTargetMargin] = useState('70');
  const [numberFormat, setNumberFormat] = useState<'standard' | 'european'>('standard');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const handleSaveSettings = () => {
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

        <button
          type="button"
          onClick={handleSaveSettings}
          className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-md shadow-cyan-900/30 transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto"
        >
          {savedSuccess ? <Check className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
          <span>{savedSuccess ? (isAr ? 'تم الحفظ بنجاح!' : 'Saved!') : (isAr ? 'حفظ الإعدادات' : 'Save Settings')}</span>
        </button>
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
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{isAr ? 'تصدير نسخة احتياطية (JSON)' : 'Export JSON Backup'}</span>
          </button>

          <label className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-cyan-500" />
            <span>{isAr ? 'استعادة من ملف (JSON)' : 'Restore from JSON File'}</span>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleResetDemoData}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors ms-auto"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isAr ? 'استعادة القالب النموذجي' : 'Reload Model Template'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
