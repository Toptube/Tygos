/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BULK DATA IMPORT & EXCEL/CSV PASTE WORKSPACE
 * Direct paste from Excel / CSV, interactive validation preview, cell correction, and starter templates.
 */

import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { dataService, RawMaterialItem, TEMPLATES_DATA } from '../../services/dataService.ts';

interface BulkDataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  establishmentId: string;
  onImportComplete?: () => void;
}

interface ParsedImportRow {
  id: string;
  nameAr: string;
  nameEn: string;
  purchaseUnit: string;
  purchasePrice: number;
  purchasedQuantity: number;
  consumptionUnit: string;
  wastePercentage: number;
  isValid: boolean;
  errorMessage?: string;
}

export const BulkDataImportModal: React.FC<BulkDataImportModalProps> = ({
  isOpen,
  onClose,
  establishmentId,
  onImportComplete,
}) => {
  const { t, language } = useI18n();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'paste' | 'templates'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [templateLoading, setTemplateLoading] = useState<string | null>(null);

  // Sample CSV format
  const sampleCSV = `nameAr,nameEn,purchaseUnit,purchasePrice,purchasedQuantity,consumptionUnit,wastePercentage
طماطم بلدي,Fresh Tomatoes,كجم,15.00,10,جرام,15
بصل أحمر,Red Onions,كجم,8.50,20,جرام,12
لحم بقري مفروم,Minced Beef,كجم,28.00,15,جرام,10
زيت ذرة,Corn Oil,لتر,12.00,25,مل,2
جبنة شيدر مبشورة,Cheddar Cheese,كجم,18.00,8,جرام,4`;

  // Parse pasted TSV or CSV
  const handleParseData = () => {
    if (!pastedText.trim()) return;

    const lines = pastedText.trim().split(/\r?\n/);
    const rows: ParsedImportRow[] = [];

    // Check if line 0 is header
    let startIndex = 0;
    if (lines[0].toLowerCase().includes('name') || lines[0].includes('اسم')) {
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Split by tab (Excel paste) or comma (CSV)
      const cols = line.includes('\t') ? line.split('\t') : line.split(',');

      const nameAr = cols[0]?.trim() || '';
      const nameEn = cols[1]?.trim() || cols[0]?.trim() || '';
      const purchaseUnit = cols[2]?.trim() || 'كجم';
      const purchasePrice = parseFloat(cols[3]?.trim()) || 0;
      const purchasedQuantity = parseFloat(cols[4]?.trim()) || 1;
      const consumptionUnit = cols[5]?.trim() || 'جرام';
      const wastePercentage = parseFloat(cols[6]?.trim()) || 10;

      let isValid = true;
      let errorMessage = '';

      if (!nameAr && !nameEn) {
        isValid = false;
        errorMessage = isAr ? 'اسم الخامة مفقود' : 'Name is missing';
      } else if (purchasePrice <= 0) {
        isValid = false;
        errorMessage = isAr ? 'السعر يجب أن يكون أكبر من صفر' : 'Price must be > 0';
      }

      rows.push({
        id: `row-${i}-${Date.now()}`,
        nameAr,
        nameEn,
        purchaseUnit,
        purchasePrice,
        purchasedQuantity,
        consumptionUnit,
        wastePercentage,
        isValid,
        errorMessage,
      });
    }

    setParsedRows(rows);
  };

  // Download Sample CSV
  const handleDownloadSample = () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'tygos_raw_materials_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save parsed rows
  const handleCommitImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    for (const r of validRows) {
      await dataService.addRawMaterial(establishmentId, {
        nameAr: r.nameAr,
        nameEn: r.nameEn,
        category: isAr ? 'مستورد' : 'Imported',
        purchaseUnit: r.purchaseUnit,
        purchasePrice: r.purchasePrice,
        purchasedQuantity: r.purchasedQuantity,
        consumptionUnit: r.consumptionUnit,
        conversionFactor: 1000,
        wastePercentage: r.wastePercentage,
        currentStock: r.purchasedQuantity * 1000,
        reorderPoint: 2000,
      });
    }

    if (onImportComplete) onImportComplete();
    onClose();
  };

  // Load starter template
  const handleLoadStarterTemplate = async (templateKey: 'restaurant' | 'cafe' | 'tourist_venue') => {
    setTemplateLoading(templateKey);
    await dataService.loadTemplate(establishmentId, templateKey);
    setTemplateLoading(null);
    if (onImportComplete) onImportComplete();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-3xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {isAr ? 'الإدخال الجماعي واستيراد البيانات' : 'Bulk Data Import & Excel/CSV Paste'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isAr
                  ? 'الصق خاماتك مباشرة من إكسيل، أو حمّل قالباً نموذجياً مجهزاً لمنشأتك'
                  : 'Paste directly from Excel/CSV or load a pre-configured industry template'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-800 text-center text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`py-3 transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'paste'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isAr ? 'لصق أو رفع إكسيل / CSV' : 'Paste / Upload CSV'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`py-3 transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'templates'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{isAr ? 'قوالب سريعة جاهزة للنشاط' : 'Ready Industry Templates'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'paste' ? (
            <div className="space-y-4">
              {parsedRows.length === 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isAr
                        ? 'انسخ الأعمدة من إكسيل والصقها هنا مباشرة:'
                        : 'Copy table cells from Excel and paste here:'}
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadSample}
                      className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تحميل نموذج فارغ (CSV)' : 'Download Sample CSV'}</span>
                    </button>
                  </div>

                  <textarea
                    rows={7}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={
                      isAr
                        ? 'الصق هنا (الأعمدة: الاسم بالعربي، الاسم بالإنجليزي، وحدة الشراء، سعر الشراء، الكمية، وحدة الاستهلاك، نسبة الهالك)'
                        : 'Paste TSV or CSV here (Cols: NameAr, NameEn, PurchaseUnit, Price, Qty, ConsumptionUnit, WastePct)'
                    }
                    className="w-full p-3 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 focus:outline-none"
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleParseData}
                      disabled={!pastedText.trim()}
                      className="px-5 py-2 text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
                    >
                      {isAr ? 'معاينة وفحص البيانات' : 'Preview & Validate'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>
                      {isAr
                        ? `تم فحص ${parsedRows.length} صفاً (${parsedRows.filter((r) => r.isValid).length} سليم)`
                        : `Parsed ${parsedRows.length} rows (${parsedRows.filter((r) => r.isValid).length} valid)`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setParsedRows([])}
                      className="text-xs text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      {isAr ? 'إعادة اللصق' : 'Clear & Re-paste'}
                    </button>
                  </div>

                  {/* Interactive Editable Preview Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto max-h-64">
                    <table className="w-full text-xs text-start">
                      <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                        <tr>
                          <th className="p-2.5">{isAr ? 'الحالة' : 'Status'}</th>
                          <th className="p-2.5">{isAr ? 'الاسم' : 'Name'}</th>
                          <th className="p-2.5">{isAr ? 'الوحدة' : 'Unit'}</th>
                          <th className="p-2.5">{isAr ? 'السعر ($)' : 'Price'}</th>
                          <th className="p-2.5">{isAr ? 'الهالك %' : 'Waste %'}</th>
                          <th className="p-2.5 text-end">{isAr ? 'إجراء' : 'Action'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {parsedRows.map((row) => (
                          <tr
                            key={row.id}
                            className={row.isValid ? 'bg-emerald-500/5' : 'bg-rose-500/5'}
                          >
                            <td className="p-2.5">
                              {row.isValid ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <span className="text-[10px] text-rose-500 font-bold block" title={row.errorMessage}>
                                  {row.errorMessage}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={row.nameAr}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setParsedRows(
                                    parsedRows.map((r) =>
                                      r.id === row.id ? { ...r, nameAr: val, isValid: val.length > 0 } : r
                                    )
                                  );
                                }}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs"
                              />
                            </td>
                            <td className="p-2.5">{row.purchaseUnit}</td>
                            <td className="p-2.5 font-mono">
                              <input
                                type="number"
                                value={row.purchasePrice}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setParsedRows(
                                    parsedRows.map((r) =>
                                      r.id === row.id ? { ...r, purchasePrice: val, isValid: val > 0 } : r
                                    )
                                  );
                                }}
                                className="w-16 px-1 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs font-mono"
                              />
                            </td>
                            <td className="p-2.5 font-mono">{row.wastePercentage}%</td>
                            <td className="p-2.5 text-end">
                              <button
                                type="button"
                                onClick={() => setParsedRows(parsedRows.filter((r) => r.id !== row.id))}
                                className="p-1 rounded text-slate-400 hover:text-rose-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleCommitImport}
                      className="px-6 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-md cursor-pointer"
                    >
                      {isAr ? 'استيراد الصفوف السليمة للمخزن' : 'Import Valid Rows to Inventory'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* READY INDUSTRY TEMPLATES */
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'اختر قالباً يناسب نشاطك ليتم تجهيز الخامات والوصفات النموذجية فوراً. (ملاحظة: الأسعار هي أمثلة توضيحية قابلة للتعديل).'
                  : 'Select an industry template to seed materials and recipes. (Note: prices are illustrative examples and customizable).'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Restaurant */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block mb-1">
                      {TEMPLATES_DATA.restaurant.nameAr}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {isAr ? '٥ خامات أساسية + بيتزا وستيك ريب آي مع حسابات الـ BOM كاملة' : '5 ingredients + Pizza & Ribeye with full BOM'}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={templateLoading !== null}
                    onClick={() => handleLoadStarterTemplate('restaurant')}
                    className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
                  >
                    {templateLoading === 'restaurant' ? (isAr ? 'جارٍ التحميل...' : 'Loading...') : (isAr ? 'تطبيق قالب المطعم' : 'Apply Restaurant')}
                  </button>
                </div>

                {/* Cafe */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block mb-1">
                      {TEMPLATES_DATA.cafe.nameAr}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {isAr ? 'بن مختص، حليب، ماتشا، سيروبات، فلات وايت، وإسبانش لاتيه' : 'Specialty espresso, milk, matcha, syrups, and latte'}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={templateLoading !== null}
                    onClick={() => handleLoadStarterTemplate('cafe')}
                    className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
                  >
                    {templateLoading === 'cafe' ? (isAr ? 'جارٍ التحميل...' : 'Loading...') : (isAr ? 'تطبيق قالب الكافيه' : 'Apply Cafe')}
                  </button>
                </div>

                {/* Tourist Venue */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block mb-1">
                      {TEMPLATES_DATA.tourist_venue.nameAr}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {isAr ? 'بوفيه إفطار، أسماك سلمون، كلوب ساندوتش، ومشروبات فندقية' : 'Buffet pass, salmon, club sandwich, and resort items'}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={templateLoading !== null}
                    onClick={() => handleLoadStarterTemplate('tourist_venue')}
                    className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
                  >
                    {templateLoading === 'tourist_venue' ? (isAr ? 'جارٍ التحميل...' : 'Loading...') : (isAr ? 'تطبيق قالب المنشأة السياحية' : 'Apply Resort')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
