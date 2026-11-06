/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Button } from '../common/Button.tsx';
import {
  X,
  BookOpen,
  Search,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  HelpCircle,
  Shield,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { HelpArticle } from '../../domain/types.ts';

export const HelpCenterModal: React.FC = () => {
  const {
    isHelpOpen,
    setIsHelpOpen,
    helpArticles,
    selectedHelpArticle,
    setSelectedHelpArticle,
    setIsAssistantOpen,
  } = useBusiness();
  const { language, dir } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isHelpOpen) return null;

  const isAr = language === 'ar';
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const filteredArticles = helpArticles.filter((art) => {
    const q = searchQuery.toLowerCase().trim();
    const title = (isAr ? art.titleAr : art.titleEn).toLowerCase();
    const summary = (isAr ? art.summaryAr : art.summaryEn).toLowerCase();
    const content = (isAr ? art.contentAr : art.contentEn).toLowerCase();
    const matchesQuery = !q || title.includes(q) || summary.includes(q) || content.includes(q) || art.module.includes(q);
    const matchesCat = selectedCategory === 'all' || art.module === selectedCategory || art.category === selectedCategory;
    return matchesQuery && matchesCat;
  });

  const activeArticle = selectedHelpArticle || filteredArticles[0] || helpArticles[0];

  const categories = [
    { id: 'all', label: isAr ? 'جميع الأدلة' : 'All SOP Manuals' },
    { id: 'qr_menu', label: isAr ? 'المنيو الإلكتروني وQR' : 'QR Menu & Tables' },
    { id: 'kds', label: isAr ? 'محطات التحضير (KDS)' : 'Kitchen Stations' },
    { id: 'menu', label: isAr ? 'الوصفات والـ BOM' : 'Recipes & BOM' },
    { id: 'cost_control', label: isAr ? 'التكاليف والانحراف' : 'Cost & Variance' },
    { id: 'inventory', label: isAr ? 'المستودعات' : 'Warehouses' },
    { id: 'pos', label: isAr ? 'نقطة البيع' : 'Point of Sale' },
    { id: 'finance', label: isAr ? 'المالية والضرائب' : 'Finance & Tax' },
    { id: 'security', label: isAr ? 'الأمان والتصاريح' : 'Security' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-fade-in" dir={dir}>
      <div className="w-full max-w-5xl h-[92vh] sm:h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {isAr ? 'مركز المعرفة ودليل التشغيل المعياري (SOP)' : 'Tygos Operational Knowledge & SOP Manual'}
                </h3>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  {isAr ? 'محدث آلياً' : 'Live Grounded'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                {isAr
                  ? 'دليل استرشادي تفاعلي يشرح كل شاشة وحقل بالمنظومة، متزامن مع محرك ذكاء TYGOS.'
                  : 'Comprehensive operational manual explaining screens, fields, and workflows, synchronized with TYGOS AI.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => {
                setIsHelpOpen(false);
                setIsAssistantOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? 'اسأل TYGOS' : 'Ask TYGOS AI'}</span>
            </Button>

            <Button
              type="button"
              onClick={() => setIsHelpOpen(false)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row items-center gap-2 shrink-0">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث في أدلة التشغيل، الشاشات، والحقول (عربي أو إنجليزي)...' : 'Search SOP guides, fields, or workflows...'}
              className="w-full ps-9 pe-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full py-1">
            {categories.map((c) => (
              <Button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === c.id
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {c.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Content Body: Sidebar list + Detail view */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden min-h-0">
          {/* Article List (Left on desktop) */}
          <div className="md:col-span-4 border-e border-slate-800 p-3 space-y-2 overflow-y-auto bg-slate-950/30">
            {filteredArticles.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                {isAr ? 'لم يتم العثور على مقالات مطابقة' : 'No matching SOP articles found'}
              </div>
            ) : (
              filteredArticles.map((art) => {
                const isSelected = activeArticle?.id === art.id;
                return (
                  <Button
                    key={art.id}
                    type="button"
                    onClick={() => setSelectedHelpArticle(art)}
                    className={`w-full text-start p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/60 shadow-md text-white'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                        {art.module}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {art.lastUpdated}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold leading-snug">
                      {isAr ? art.titleAr : art.titleEn}
                    </h4>

                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {isAr ? art.summaryAr : art.summaryEn}
                    </p>
                  </Button>
                );
              })
            )}
          </div>

          {/* Article Details View (Right on desktop) */}
          <div className="md:col-span-8 p-4 sm:p-6 overflow-y-auto space-y-5 bg-slate-900/40">
            {activeArticle ? (
              <>
                {/* Title Lockup */}
                <div className="pb-4 border-b border-slate-800 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold uppercase">
                      Module: {activeArticle.module}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Category: {activeArticle.category}
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    {isAr ? activeArticle.titleAr : activeArticle.titleEn}
                  </h2>

                  <p className="text-xs sm:text-sm text-cyan-300 font-medium leading-relaxed">
                    {isAr ? activeArticle.summaryAr : activeArticle.summaryEn}
                  </p>
                </div>

                {/* Section 1: Detailed Explanation */}
                <div className="space-y-2">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    {isAr ? '1. الشرح المعماري والتشغيلي للوظيفة' : '1. Operational & Architectural Foundation'}
                  </h4>
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                    {isAr ? activeArticle.contentAr : activeArticle.contentEn}
                  </div>
                </div>

                {/* Section 2: Step-by-Step SOP */}
                {activeArticle.stepsAr && activeArticle.stepsAr.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                      {isAr ? '2. إجراءات التشغيل المعيارية خطوة بخطوة (SOP)' : '2. Standard Operating Procedures (Step-by-Step)'}
                    </h4>
                    <div className="space-y-2">
                      {(isAr ? activeArticle.stepsAr : activeArticle.stepsEn || []).map((step, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-start gap-3 text-xs"
                        >
                          <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono font-bold flex items-center justify-center shrink-0 text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="text-slate-300 leading-relaxed">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 3: Common Mistakes & Prevention */}
                {activeArticle.commonMistakesAr && activeArticle.commonMistakesAr.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                      {isAr ? '3. الأخطاء التشغيلية الشائعة وطرق تجنبها' : '3. Common Operational Mistakes & Prevention'}
                    </h4>
                    <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2 text-xs">
                      {(isAr ? activeArticle.commonMistakesAr : activeArticle.commonMistakesEn || []).map((m, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <span className="text-amber-200/90 leading-relaxed">{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 4: Security & Permissions */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span>
                      {isAr ? 'بروتوكول الأمان: يتطلب صلاحيات دور معتمد دون كلمات مرور.' : 'Governed under strict zero-password sharing RBAC.'}
                    </span>
                  </div>

                  <Button
                    type="button"
                    onClick={() => {
                      setIsHelpOpen(false);
                      setIsAssistantOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                  >
                    <span>{isAr ? 'استفسر من المساعد حول هذا الدليل' : 'Ask TYGOS about this guide'}</span>
                    <ArrowIcon className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                {isAr ? 'اختر مقالاً من القائمة للاطلاع على الشرح' : 'Select an SOP article from the list'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
