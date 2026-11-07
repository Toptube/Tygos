/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 7-STEP RAW-MATERIAL-TO-PRODUCT JOURNEY PROGRESS BAR
 * Live counters: X خامة, Y أطباق, Z أطباق بلا وصفة
 * Single, unambiguous Next-Step Button
 */

import React from 'react';
import { Button } from '../common/Button.tsx';
import {
  Boxes,
  UtensilsCrossed,
  ChefHat,
  TrendingUp,
  Eye,
  ShoppingCart,
  LineChart,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useBusiness } from '../../context/BusinessContext.tsx';

interface JourneyProgressBarProps {
  currentStep?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  onSelectDishMissingRecipe?: (dishId: string) => void;
  className?: string;
}

export const JourneyProgressBar: React.FC<JourneyProgressBarProps> = ({
  currentStep = 3,
  onSelectDishMissingRecipe,
  className = '',
}) => {
  const { isRtl, language } = useI18n();
  const isAr = language === 'ar';
  const { setActiveView } = useAuth();
  const {
    rawMaterials,
    menuProducts,
    setIsAddIngredientModalOpen,
    setIsAddProductModalOpen,
  } = useBusiness();

  const materialsCount = rawMaterials.length;
  const dishesCount = menuProducts.length;
  const dishesMissingRecipe = menuProducts.filter(
    (p) => !p.recipeIngredients || p.recipeIngredients.length === 0
  );
  const missingCount = dishesMissingRecipe.length;
  const readyDishesCount = menuProducts.filter((p) => p.isActive && p.recipeIngredients?.length > 0).length;

  const steps = [
    { num: 1, title: isAr ? 'الخامات' : 'Raw Materials', icon: Boxes, view: 'inventory' },
    { num: 2, title: isAr ? 'الأطباق' : 'Dishes', icon: UtensilsCrossed, view: 'menu' },
    { num: 3, title: isAr ? 'الوصفة' : 'Recipe', icon: ChefHat, view: 'menu' },
    { num: 4, title: isAr ? 'السعر والربح' : 'Price & Profit', icon: TrendingUp, view: 'menu' },
    { num: 5, title: isAr ? 'عرضه للبيع' : 'Ready for Sale', icon: Eye, view: 'menu_management' },
    { num: 6, title: isAr ? 'البيع' : 'Sale', icon: ShoppingCart, view: 'pos' },
    { num: 7, title: isAr ? 'المتابعة' : 'Track', icon: LineChart, view: 'finance' },
  ];

  // Determine smart single next-action
  let nextAction = {
    label: isAr ? 'الخطوة التالية' : 'Next Step',
    onClick: () => setActiveView('menu'),
    badgeType: 'primary' as const,
  };

  if (materialsCount === 0) {
    nextAction = {
      label: isAr ? '+ أضف أول خامة' : '+ Add First Ingredient',
      onClick: () => setIsAddIngredientModalOpen(true),
      badgeType: 'primary',
    };
  } else if (dishesCount === 0) {
    nextAction = {
      label: isAr ? '+ أضف أول طبق' : '+ Add First Dish',
      onClick: () => setIsAddProductModalOpen(true),
      badgeType: 'primary',
    };
  } else if (missingCount > 0) {
    const firstMissing = dishesMissingRecipe[0];
    nextAction = {
      label: isAr ? `أكمل وصفة [${firstMissing.nameAr}]` : `Complete recipe for [${firstMissing.nameEn}]`,
      onClick: () => {
        if (onSelectDishMissingRecipe) {
          onSelectDishMissingRecipe(firstMissing.id);
        } else {
          setActiveView('menu');
        }
      },
      badgeType: 'primary',
    };
  } else if (readyDishesCount === 0) {
    nextAction = {
      label: isAr ? 'اعرض الأطباق للبيع' : 'Publish Dishes to Menu',
      onClick: () => setActiveView('menu_management'),
      badgeType: 'primary',
    };
  } else {
    nextAction = {
      label: isAr ? 'ابدأ البيع في الكاشير' : 'Open Point of Sale',
      onClick: () => setActiveView('pos'),
      badgeType: 'primary',
    };
  }

  return (
    <div
      data-testid="journey-progress-bar"
      className={`p-4 rounded-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5 ${className}`}
    >
      {/* Top Bar: Title & Live Counters & Next Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {isAr ? 'رحلة الخامة من الشراء حتى الربح' : 'Raw Material to Profit Journey'}
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {isAr
              ? 'خريطة واحدة واضحة لربط المشتريات بالوصفات والكاشير وحساب الأرباح تلقائياً'
              : 'Clear unified path linking inventory, recipes, POS, and automatic profit calculations'}
          </p>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500">{isAr ? 'الخامات:' : 'Materials:'}</span>
            <strong className="font-mono text-slate-900 dark:text-white" data-testid="journey-materials-count">
              {materialsCount}
            </strong>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500">{isAr ? 'الأطباق:' : 'Dishes:'}</span>
            <strong className="font-mono text-slate-900 dark:text-white" data-testid="journey-dishes-count">
              {dishesCount}
            </strong>
          </div>

          {missingCount > 0 ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 text-amber-700 dark:text-amber-400 font-bold">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {missingCount} {isAr ? 'بلا وصفة' : 'missing recipe'}
              </span>
            </div>
          ) : dishesCount > 0 ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isAr ? 'كل الأطباق بوصفات' : 'All recipes complete'}</span>
            </div>
          ) : null}

          {/* Single Direct Next-Step Action Button */}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={nextAction.onClick}
            data-testid="journey-next-action-button"
            className="shrink-0 font-bold"
          >
            <span>{nextAction.label}</span>
            {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* 7-Step Track: Horizontal on desktop/tablet, clean scroll on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        {steps.map((st) => {
          const Icon = st.icon;
          const isPassed = currentStep > st.num;
          const isCurrent = currentStep === st.num;

          return (
            <button
              key={st.num}
              type="button"
              onClick={() => setActiveView(st.view as any)}
              className={`p-2 rounded-xl text-start transition-all cursor-pointer border ${
                isCurrent
                  ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500/80 text-cyan-900 dark:text-cyan-200 shadow-xs'
                  : isPassed
                  ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  : 'bg-white dark:bg-transparent border-slate-200/60 dark:border-slate-800/60 text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  {st.num}.
                </span>
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isCurrent ? 'text-cyan-500' : isPassed ? 'text-emerald-500' : 'text-slate-400'
                  }`}
                />
              </div>
              <div className="text-xs font-bold truncate">
                {st.title}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
