/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MENU MANAGEMENT & MARKETING SUITE (Phase 5)
 * Dedicated workstation for Venue Managers and Marketing Officers.
 * Enriches cost-controlled products with marketing descriptions, multi-image manager,
 * appetizing prep methods, allergy tags, station routing, and live mobile preview.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button.tsx';
import {
  Sparkles,
  Image as ImageIcon,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Flame,
  Leaf,
  Clock,
  AlertCircle,
  Check,
  Search,
  ExternalLink,
  ChevronDown,
  Wand2,
  Smartphone,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { dataService, MenuItemProduct } from '../../services/dataService.ts';
import {
  MenuItemOverride,
  PrepStation,
  PREP_STATIONS,
  AllergenTag,
} from '../../domain/qrMenuTypes.ts';

// Copywriting templates for rapid marketing descriptions
const MARKETING_TEMPLATES = [
  {
    category: 'مشاوي ولحوم',
    titleAr: 'قالب اللحوم والمشاوي الفاخرة',
    descAr: 'قطعة لحم فاخرة منتقاة بعناية، متبلة بخلطة الأعشاب الطازجة ومطهوة على لهب الفحم الحقيقي لدرجة نضج مثالية تذوب في الفم، تُقدَّم مع صوص البوردرليز الغني.',
    descEn: 'Prime cut tender meat, flame-grilled to perfection over real charcoal, infused with fresh garden herbs and served with rich demi-glace.',
    prepAr: 'تتبيل على البارد لمدة ١٢ ساعة، طهي فوري على الشواية بدرجة حرارة عالية لحبس العصارة الطبيعية.',
    prepEn: 'Cold-marinated for 12 hours, then sear-grilled at high heat to seal in rich natural juices.',
    time: 20,
    badges: ['bestseller'] as ('spicy' | 'vegan' | 'new' | 'bestseller')[],
  },
  {
    category: 'بيتزا وباستا',
    titleAr: 'قالب البيتزا الإيطالية الأصيلة',
    descAr: 'عجينة نابوليتانية متخمرة ببطء ٤٨ ساعة ومخبوزة في فرن الحطب الحجري، مغطاة بصلصة الطماطم الإيطالية وجبنة الموزاريلا الطبيعية وأوراق الريحان الطازج.',
    descEn: '48-hour slow fermented Neapolitan dough baked in our stone wood-fired oven, topped with crushed San Marzano tomatoes, fior di latte mozzarella, and fresh basil.',
    prepAr: 'فرد العجينة يدوياً على طريقة نابولي، خَبز سريع في درجة حرارة ٤٥٠ مئوية لمدة ٩٠ ثانية فقط.',
    prepEn: 'Hand-stretched, stone-baked at 450°C for 90 seconds to create an airy leopard-spotted crust.',
    time: 12,
    badges: ['new'] as ('spicy' | 'vegan' | 'new' | 'bestseller')[],
  },
  {
    category: 'مشروبات وقهوة',
    titleAr: 'قالب القهوة المختصة والمشروبات',
    descAr: 'حبوب بن مختصة ١٠٠٪ أرابيكا محمصة بعناية ومستخلصة بضغط متوازن مع حليب طازج مبخر بقوام مخملي حريري ونكهات طبيعية متوازنة.',
    descEn: '100% single-origin Arabica beans, precision-extracted with velvety micro-foam steamed whole milk and notes of dark cocoa.',
    prepAr: 'طحن فوري بالوزن الدقيق، استخلاص إسبريسو في ٢٨ ثانية وتبخير الحليب بدرجة حرارة ٦٢ مئوية.',
    prepEn: 'Freshly ground by weight, pulled in 28 seconds, with milk micro-foamed to 62°C.',
    time: 5,
    badges: ['bestseller'] as ('spicy' | 'vegan' | 'new' | 'bestseller')[],
  },
];

export const MenuManagementModule: React.FC = () => {
  const { currentEstablishment } = useAuth();
  const { menuProducts: products, refreshMaterialsAndProducts } = useBusiness();
  const { language, t } = useI18n();
  const isAr = language === 'ar';
  const estId = currentEstablishment?.id || 'default';

  const [overrides, setOverrides] = useState<MenuItemOverride[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<MenuItemProduct | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [searchQuery, setSearchQuery] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State for Selected Product
  const [formDescAr, setFormDescAr] = useState('');
  const [formDescEn, setFormDescEn] = useState('');
  const [formIngredientsAr, setFormIngredientsAr] = useState('');
  const [formIngredientsEn, setFormIngredientsEn] = useState('');
  const [formPrepAr, setFormPrepAr] = useState('');
  const [formPrepEn, setFormPrepEn] = useState('');
  const [formTime, setFormTime] = useState<number>(15);
  const [formStation, setFormStation] = useState<PrepStation>('kitchen');
  const [formIsAvailable, setFormIsAvailable] = useState<boolean>(true);
  const [formBadges, setFormBadges] = useState<('spicy' | 'vegan' | 'new' | 'bestseller')[]>([]);
  const [formAllergens, setFormAllergens] = useState<AllergenTag[]>([]);
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formPrimaryImage, setFormPrimaryImage] = useState<string>('');

  // 1. Load Overrides
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const list = await dataService.getMenuItemOverrides(estId);
      if (mounted) {
        setOverrides(list);
        if (products.length > 0 && !selectedProduct) {
          selectProductForEdit(products[0], list);
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [estId, products.length]);

  const selectProductForEdit = (prod: MenuItemProduct, currentOverrides = overrides) => {
    setSelectedProduct(prod);
    const existing = currentOverrides.find((o) => o.productId === prod.id);

    setFormDescAr(existing?.descriptionAr || (prod as any).descriptionAr || '');
    setFormDescEn(existing?.descriptionEn || (prod as any).descriptionEn || '');
    setFormIngredientsAr((existing?.displayIngredientsAr || (prod as any).displayIngredientsAr || []).join('، '));
    setFormIngredientsEn((existing?.displayIngredientsEn || (prod as any).displayIngredientsEn || []).join(', '));
    setFormPrepAr(existing?.prepMethodAr || '');
    setFormPrepEn(existing?.prepMethodEn || '');
    setFormTime(existing?.prepTimeMinutes || 15);
    setFormStation(existing?.station || (prod as any).station || 'kitchen');
    setFormIsAvailable(existing?.isAvailable !== undefined ? existing.isAvailable : prod.isActive);
    setFormBadges(existing?.badges || []);
    setFormAllergens(existing?.allergens || []);
    const fallbackImg = (prod as any).imageUrl || '';
    setFormImages(existing?.images || (fallbackImg ? [fallbackImg] : []));
    setFormPrimaryImage(existing?.primaryImage || fallbackImg);
  };

  // Image Upload with Client-Side Canvas Compression
  // // INTEGRATION POINT: Replace canvas dataURL with direct upload to S3 / Google Cloud Storage
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

        setFormImages((prev) => {
          if (prev.length >= 5) return prev;
          const next = [...prev, compressedDataUrl];
          if (!formPrimaryImage) {
            setFormPrimaryImage(compressedDataUrl);
          }
          return next;
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (index: number) => {
    setFormImages((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      if (formPrimaryImage === prev[index]) {
        setFormPrimaryImage(filtered[0] || '');
      }
      return filtered;
    });
  };

  // Apply Copywriting Template
  const applyTemplate = (tpl: typeof MARKETING_TEMPLATES[0]) => {
    setFormDescAr(tpl.descAr);
    setFormDescEn(tpl.descEn);
    setFormPrepAr(tpl.prepAr);
    setFormPrepEn(tpl.prepEn);
    setFormTime(tpl.time);
    setFormBadges(tpl.badges);
  };

  // Save Overrides
  const handleSave = async () => {
    if (!selectedProduct) return;

    const overrideObj: MenuItemOverride = {
      productId: selectedProduct.id,
      descriptionAr: formDescAr.trim(),
      descriptionEn: formDescEn.trim(),
      displayIngredientsAr: formIngredientsAr
        .split(/[،,]/)
        .map((s) => s.trim())
        .filter(Boolean),
      displayIngredientsEn: formIngredientsEn
        .split(/[،,]/)
        .map((s) => s.trim())
        .filter(Boolean),
      prepMethodAr: formPrepAr.trim(),
      prepMethodEn: formPrepEn.trim(),
      prepTimeMinutes: Number(formTime) || 15,
      station: formStation,
      isAvailable: formIsAvailable,
      badges: formBadges,
      allergens: formAllergens,
      images: formImages,
      primaryImage: formPrimaryImage || formImages[0] || '',
    };

    await dataService.saveMenuItemOverride(estId, overrideObj);
    const updated = await dataService.getMenuItemOverrides(estId);
    setOverrides(updated);

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Check completeness of an item
  const getItemCompleteness = (prodId: string) => {
    const o = overrides.find((it) => it.productId === prodId);
    const hasImage = o?.images && o.images.length > 0;
    const hasDesc = Boolean(o?.descriptionAr && o.descriptionAr.length > 10);
    if (hasImage && hasDesc) return { status: 'complete', textAr: 'مكتمل', textEn: 'Complete' };
    if (!hasImage && !hasDesc) return { status: 'empty', textAr: 'ينقصه صورة ووصف', textEn: 'Missing Photo & Copy' };
    if (!hasImage) return { status: 'no_img', textAr: 'ينقصه صورة', textEn: 'Missing Photo' };
    return { status: 'no_desc', textAr: 'ينقصه وصف', textEn: 'Missing Copy' };
  };

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      p.nameAr.toLowerCase().includes(q) ||
      (p.nameEn && p.nameEn.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              {isAr ? 'إدارة المنيو الإلكتروني والصور' : 'QR Menu Management & Visuals'}
            </h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
              {isAr ? 'مسؤول التسويق والمدير' : 'Marketing & Manager'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'تجهيز صور الأطباق، الأوصاف التسويقية الشهية، وتوجيه المحطات للطلب بالـ QR'
              : 'Enrich items with appetizing marketing copy, high-res photos, and kitchen station routing'}
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 self-start">
          <Button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'editor' ? 'bg-cyan-500 text-slate-950 shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {isAr ? 'محرر المنيو' : 'Menu Editor'}
          </Button>
          <Button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === 'preview' ? 'bg-cyan-500 text-slate-950 shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{isAr ? 'معاينة الموبايل' : 'Mobile Preview'}</span>
          </Button>
        </div>
      </div>

      {activeTab === 'preview' ? (
        /* LIVE MOBILE PREVIEW CONTAINER */
        <div className="flex flex-col items-center justify-center p-6 bg-slate-100 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="text-center mb-4 space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isAr ? 'المعاينة الحية كما يراها العميل على شاشة الهاتف' : 'Live Client Mobile Simulation'}
            </h3>
            <p className="text-xs text-slate-500">
              {isAr ? 'يتم تحديث المنيو فورياً دون إعادة تحميل' : 'Instant live rendering without page refresh'}
            </p>
          </div>

          {/* Smartphone Simulator Bezel */}
          <div className="w-[360px] h-[700px] bg-slate-950 rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 relative overflow-hidden flex flex-col">
            {/* Speaker & Camera notch */}
            <div className="w-24 h-4 bg-slate-900 rounded-full mx-auto mb-2 shrink-0" />
            <div className="flex-1 rounded-[32px] overflow-hidden bg-slate-950 border border-slate-800 flex flex-col">
              <iframe
                src={`#/m/${currentEstablishment?.code || 'R.0001'}`}
                className="w-full h-full border-0"
                title="Mobile QR Menu Preview"
              />
            </div>
          </div>
        </div>
      ) : (
        /* WORKSTATION GRID: PRODUCTS LIST (LEFT) + RICH EDITOR (RIGHT) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1: Products Selector (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث في أصناف المنيو...' : 'Filter items...'}
                className="w-full ps-9 pe-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5 max-h-[620px] overflow-y-auto pe-1">
              {filteredProducts.map((p) => {
                const comp = getItemCompleteness(p.id);
                const isSelected = selectedProduct?.id === p.id;
                return (
                  <Button
                    key={p.id}
                    type="button"
                    onClick={() => selectProductForEdit(p)}
                    className={`w-full p-3 rounded-xl text-start transition-all cursor-pointer flex items-center justify-between border ${
                      isSelected
                        ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-900 dark:text-cyan-200 font-bold'
                        : 'bg-white dark:bg-slate-950/80 border-slate-200 dark:border-slate-800/80 hover:border-slate-400 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="min-w-0 pe-2">
                      <div className="text-xs truncate">{isAr ? p.nameAr : p.nameEn || p.nameAr}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>{p.category}</span>
                        <span>·</span>
                        <span className="font-mono">${p.sellingPrice.toFixed(2)}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        comp.status === 'complete'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : comp.status === 'empty'
                          ? 'bg-rose-500/15 text-rose-500'
                          : 'bg-amber-500/15 text-amber-500'
                      }`}
                    >
                      {isAr ? comp.textAr : comp.textEn}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Column 2: Rich Item Marketing Form (8 cols) */}
          {selectedProduct ? (
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
              {/* Top Banner: Product Master Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{isAr ? selectedProduct.nameAr : selectedProduct.nameEn || selectedProduct.nameAr}</span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 text-xs">${selectedProduct.sellingPrice.toFixed(2)}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isAr ? 'مصدر السعر والتكلفة: شاشة المنتجات المركزية' : 'Sourced from master products ledger'}
                  </p>
                </div>

                {/* Quick Copywriting Templates Dropdown */}
                <div className="relative group">
                  <Button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 text-xs font-bold cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'قوالب وصف تسويقي جاهزة' : 'Copywriting Templates'}</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  <div className="absolute end-0 mt-1 w-64 p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-20 hidden group-hover:block space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 px-2 block uppercase">{isAr ? 'اختر قالباً للتطبيق الفوري:' : 'Select a template:'}</span>
                    {MARKETING_TEMPLATES.map((tpl, i) => (
                      <Button
                        key={i}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className="w-full text-start p-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200"
                      >
                        <div className="font-bold">{isAr ? tpl.titleAr : tpl.category}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{tpl.descAr}</div>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 1. Photos Manager (Up to 5 images) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-cyan-500" />
                    <span>{isAr ? 'صور الطبق المعروضة للزبائن (حتى 5 صور عالية الدقة):' : 'Item Photos (Up to 5):'}</span>
                  </label>
                  <span className="text-[11px] text-slate-400">{formImages.length} / 5</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {formImages.map((imgUrl, idx) => {
                    const isPrimary = formPrimaryImage === imgUrl;
                    return (
                      <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-800 group">
                        <img src={imgUrl} alt="Dish" className="w-full h-full object-cover" />
                        <Button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 end-1 p-1 rounded-md bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title={isAr ? 'حذف الصورة' : 'Remove image'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setFormPrimaryImage(imgUrl)}
                          className={`absolute bottom-1 inset-x-1 py-0.5 text-[9px] font-bold rounded text-center ${
                            isPrimary ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950/80 text-slate-300 opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          {isPrimary ? (isAr ? 'الرئيسية ✓' : 'Primary ✓') : (isAr ? 'اجعلها رئيسية' : 'Make Primary')}
                        </Button>
                      </div>
                    );
                  })}

                  {formImages.length < 5 && (
                    <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500 flex flex-col items-center justify-center text-slate-400 hover:text-cyan-500 cursor-pointer transition-colors">
                      <Upload className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold">{isAr ? 'رفع صورة' : 'Upload'}</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {/* 2. Marketing Descriptions (AR / EN) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'الوصف التسويقي بالعربية (شهي ومقنع):' : 'Marketing Description (Arabic):'}
                  </label>
                  <textarea
                    rows={3}
                    value={formDescAr}
                    onChange={(e) => setFormDescAr(e.target.value)}
                    placeholder={isAr ? 'اكتب وصفاً جذاباً يصف طعم الصنف وجودة مكوناته...' : 'Appetizing description...'}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'الوصف التسويقي بالإنجليزية:' : 'Marketing Description (English):'}
                  </label>
                  <textarea
                    rows={3}
                    value={formDescEn}
                    onChange={(e) => setFormDescEn(e.target.value)}
                    placeholder="Appetizing English copy..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* 3. Display Ingredients (Separated from Accounting Recipe BOM) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'المكونات المعروضة للزبون (عربي - مفصولة بفواصل):' : 'Display Ingredients (Arabic):'}
                  </label>
                  <input
                    type="text"
                    value={formIngredientsAr}
                    onChange={(e) => setFormIngredientsAr(e.target.value)}
                    placeholder="طماطم، جبن موزاريلا، ريحان..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {isAr ? 'ملاحظة: هذه المكونات لا ترتبط بتكلفة المحاسبة بل تُعرض في المنيو فقط.' : 'Public display only; does not affect BOM costing.'}
                  </span>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'المكونات المعروضة (إنجليزي):' : 'Display Ingredients (English):'}
                  </label>
                  <input
                    type="text"
                    value={formIngredientsEn}
                    onChange={(e) => setFormIngredientsEn(e.target.value)}
                    placeholder="Tomatoes, Mozzarella, Basil..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* 4. Prep Method & Preparation Station */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'محطة التحضير (KDS):' : 'Kitchen Station (KDS):'}
                  </label>
                  <select
                    value={formStation}
                    onChange={(e) => setFormStation(e.target.value as PrepStation)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500"
                  >
                    {PREP_STATIONS.map((st) => (
                      <option key={st.id} value={st.id}>
                        {isAr ? st.labelAr : st.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'مدة التحضير التقريبية (بالدقائق):' : 'Prep Time (Mins):'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={formTime}
                    onChange={(e) => setFormTime(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'الإتاحة في منيو الـ QR:' : 'Available on QR Menu:'}
                  </label>
                  <Button
                    type="button"
                    onClick={() => setFormIsAvailable(!formIsAvailable)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border ${
                      formIsAvailable
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {formIsAvailable ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <span>{formIsAvailable ? (isAr ? 'متاح للطلب الآن' : 'Available') : (isAr ? 'معلق / غير متاح' : 'Unavailable')}</span>
                  </Button>
                </div>
              </div>

              {/* 5. Badges & Allergens */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    {isAr ? 'أوسمة التمييز التسويقي:' : 'Highlight Badges:'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'bestseller', labelAr: '🔥 الأكثر طلباً', labelEn: '🔥 Bestseller' },
                      { id: 'new', labelAr: '★ جديد', labelEn: '★ New' },
                      { id: 'spicy', labelAr: '🌶️ حار', labelEn: '🌶️ Spicy' },
                      { id: 'vegan', labelAr: '🌱 نباتي', labelEn: '🌱 Vegan' },
                    ].map((b) => {
                      const isChecked = formBadges.includes(b.id as any);
                      return (
                        <Button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setFormBadges((prev) =>
                              isChecked ? prev.filter((x) => x !== b.id) : [...prev, b.id as any]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            isChecked
                              ? 'bg-cyan-500 text-slate-950 border-cyan-500 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {isAr ? b.labelAr : b.labelEn}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    {isAr ? 'وسوم الحساسية:' : 'Allergen Tags:'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['gluten', 'dairy', 'nuts', 'eggs', 'soy', 'fish'].map((alg) => {
                      const isChecked = formAllergens.includes(alg as AllergenTag);
                      return (
                        <Button
                          key={alg}
                          type="button"
                          onClick={() => {
                            setFormAllergens((prev) =>
                              isChecked ? prev.filter((x) => x !== alg) : [...prev, alg as AllergenTag]
                            );
                          }}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            isChecked
                              ? 'bg-amber-500 text-slate-950 border-amber-500'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
                          }`}
                        >
                          {alg}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  {saveSuccess && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-fade-in">
                      <Check className="w-4 h-4" />
                      <span>{isAr ? 'تم حفظ التعديلات بنجاح وظهورها في المنيو فوراً!' : 'Saved successfully!'}</span>
                    </span>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={handleSave}
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isAr ? 'حفظ إعدادات هذا الصنف' : 'Save Item Settings'}</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-8 p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              {isAr ? 'اختر صنفاً من القائمة الجانبية لتعديل بياناته وصوره' : 'Select an item from the list to edit'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
