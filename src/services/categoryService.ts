/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CATEGORY TREE SERVICE & MODELS (Package 1 - Section 2)
 * Flexible 3-level hierarchy: Main Category -> Subcategory -> Classification
 * Two separate trees:
 * 1. Product Categories (المطبخ، المخبوزات، البار، الحلويات، الساندوتشات، الفطور، الأطفال)
 * 2. Raw Material Categories (لحوم، أسماك، خضروات، ألبان، بقالة، دقيق، بن، توابل، زيوت، مستهلكات، منظفات)
 */

import { getStorageAdapter } from '../repositories/storageAdapter.ts';

export interface CategoryNode {
  id: string;
  establishmentId: string;
  parentId?: string | null;
  nameAr: string;
  nameEn: string;
  type: 'product' | 'material';
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTreeItem extends CategoryNode {
  children?: CategoryTreeItem[];
  depth?: number;
}

/**
 * Normalizes Arabic letters and removes diacritics and multiple spaces
 * for robust duplicate detection and comparison.
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove tashkeel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ');
}

// Initial Seeds per Prompt 2
const SEED_PRODUCT_CATEGORIES: Array<{
  id: string;
  nameAr: string;
  nameEn: string;
  children?: Array<{ id: string; nameAr: string; nameEn: string }>;
}> = [
  {
    id: 'cat-kitchen',
    nameAr: 'المطبخ',
    nameEn: 'Kitchen',
    children: [
      { id: 'cat-k-grill', nameAr: 'مشويات', nameEn: 'Grill' },
      { id: 'cat-k-seafood', nameAr: 'مأكولات بحرية', nameEn: 'Seafood' },
      { id: 'cat-k-chicken', nameAr: 'دجاج', nameEn: 'Chicken' },
      { id: 'cat-k-meat', nameAr: 'لحوم', nameEn: 'Meat' },
      { id: 'cat-k-pasta-rice', nameAr: 'معكرونة وأرز', nameEn: 'Pasta & Rice' },
      { id: 'cat-k-soup', nameAr: 'شوربة', nameEn: 'Soup' },
      { id: 'cat-k-salads', nameAr: 'سلطات ومقبلات', nameEn: 'Salads & Appetizers' },
      { id: 'cat-k-sides', nameAr: 'أطباق جانبية', nameEn: 'Side Dishes' },
      { id: 'cat-k-mains', nameAr: 'أطباق رئيسية', nameEn: 'Main Courses' },
    ],
  },
  {
    id: 'cat-bakery',
    nameAr: 'المخبوزات',
    nameEn: 'Bakery',
    children: [
      { id: 'cat-b-pizza', nameAr: 'بيتزا', nameEn: 'Pizza' },
      { id: 'cat-b-pies', nameAr: 'فطائر', nameEn: 'Pies' },
      { id: 'cat-b-pastries', nameAr: 'معجنات وكرواسون', nameEn: 'Pastries & Croissants' },
      { id: 'cat-b-bread', nameAr: 'عيش وخبز', nameEn: 'Bread' },
    ],
  },
  {
    id: 'cat-bar',
    nameAr: 'البار',
    nameEn: 'Bar & Beverages',
    children: [
      { id: 'cat-bar-cold', nameAr: 'مشروبات باردة', nameEn: 'Cold Drinks' },
      { id: 'cat-bar-hot', nameAr: 'مشروبات ساخنة', nameEn: 'Hot Drinks' },
      { id: 'cat-bar-juices', nameAr: 'عصائر', nameEn: 'Fresh Juices' },
      { id: 'cat-bar-icecream', nameAr: 'آيس كريم', nameEn: 'Ice Cream' },
    ],
  },
  {
    id: 'cat-desserts',
    nameAr: 'الحلويات',
    nameEn: 'Desserts',
    children: [
      { id: 'cat-des-oriental', nameAr: 'حلويات شرقية', nameEn: 'Oriental Sweets' },
      { id: 'cat-des-western', nameAr: 'حلويات غربية وكيك', nameEn: 'Cakes & Western' },
    ],
  },
  {
    id: 'cat-sandwiches',
    nameAr: 'الساندوتشات',
    nameEn: 'Sandwiches',
    children: [
      { id: 'cat-snd-burger', nameAr: 'برجر', nameEn: 'Burgers' },
      { id: 'cat-snd-shawarma', nameAr: 'شاورما وتورتيلا', nameEn: 'Shawarma & Wraps' },
    ],
  },
  {
    id: 'cat-breakfast',
    nameAr: 'الفطور',
    nameEn: 'Breakfast',
    children: [
      { id: 'cat-brk-traditional', nameAr: 'فطور شرقي تقليدي', nameEn: 'Traditional Breakfast' },
      { id: 'cat-brk-continental', nameAr: 'فطور قاري وبيض', nameEn: 'Continental & Eggs' },
    ],
  },
  {
    id: 'cat-kids',
    nameAr: 'الأطفال',
    nameEn: 'Kids Menu',
    children: [
      { id: 'cat-kids-meals', nameAr: 'وجبات أطفال', nameEn: 'Kids Meals' },
    ],
  },
];

const SEED_MATERIAL_CATEGORIES: Array<{
  id: string;
  nameAr: string;
  nameEn: string;
  children?: Array<{ id: string; nameAr: string; nameEn: string }>;
}> = [
  { id: 'mat-meat-poultry', nameAr: 'لحوم ودواجن', nameEn: 'Meat & Poultry' },
  { id: 'mat-seafood', nameAr: 'أسماك ومأكولات بحرية', nameEn: 'Fish & Seafood' },
  { id: 'mat-veg-fruit', nameAr: 'خضروات وفواكه', nameEn: 'Vegetables & Fruits' },
  { id: 'mat-dairy', nameAr: 'ألبان وأجبان', nameEn: 'Dairy & Cheese' },
  { id: 'mat-grocery', nameAr: 'بقالة وجاف', nameEn: 'Dry Grocery' },
  { id: 'mat-flour-bakery', nameAr: 'دقيق ومخبوزات', nameEn: 'Flour & Bakery' },
  { id: 'mat-beverages', nameAr: 'بن وشاي ومشروبات', nameEn: 'Coffee, Tea & Beverages' },
  { id: 'mat-spices-sauces', nameAr: 'توابل وصوصات', nameEn: 'Spices & Sauces' },
  { id: 'mat-oils-fats', nameAr: 'زيوت ودهون', nameEn: 'Oils & Fats' },
  { id: 'mat-packaging', nameAr: 'مستهلكات وتغليف', nameEn: 'Packaging & Disposables' },
  { id: 'mat-cleaning', nameAr: 'منظفات', nameEn: 'Cleaning & Hygiene' },
];

export class CategoryService {
  private getKey(establishmentId: string, type: 'product' | 'material'): string {
    return `tygos_${establishmentId || 'default'}_categories_${type}`;
  }

  public getCategories(establishmentId: string, type: 'product' | 'material'): CategoryNode[] {
    const adapter = getStorageAdapter();
    const raw = adapter.getItemSync(this.getKey(establishmentId, type));
    if (raw) {
      try {
        const parsed: CategoryNode[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => a.order - b.order);
        }
      } catch {
        // Fall back to seed
      }
    }

    // Initialize with seeds
    const seeds = this.generateDefaultSeeds(establishmentId, type);
    this.saveCategories(establishmentId, type, seeds);
    return seeds;
  }

  public saveCategories(establishmentId: string, type: 'product' | 'material', list: CategoryNode[]): void {
    const adapter = getStorageAdapter();
    adapter.setItemSync(this.getKey(establishmentId, type), JSON.stringify(list));
  }

  public addCategory(
    establishmentId: string,
    params: {
      nameAr: string;
      nameEn?: string;
      type: 'product' | 'material';
      parentId?: string | null;
    }
  ): CategoryNode {
    const list = this.getCategories(establishmentId, params.type);

    // Validate duplicate in same parent
    const norm = normalizeArabicText(params.nameAr);
    const dup = list.find(
      (c) =>
        (c.parentId || null) === (params.parentId || null) &&
        normalizeArabicText(c.nameAr) === norm
    );
    if (dup) {
      throw new Error(`القسم «${params.nameAr}» موجود بالفعل في هذا المستوى.`);
    }

    const order = list.filter((c) => (c.parentId || null) === (params.parentId || null)).length + 1;
    const now = new Date().toISOString();
    const newNode: CategoryNode = {
      id: `cat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      establishmentId,
      parentId: params.parentId || null,
      nameAr: params.nameAr.trim(),
      nameEn: (params.nameEn || params.nameAr).trim(),
      type: params.type,
      order,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    list.push(newNode);
    this.saveCategories(establishmentId, params.type, list);
    return newNode;
  }

  public updateCategory(
    establishmentId: string,
    type: 'product' | 'material',
    id: string,
    updates: Partial<Pick<CategoryNode, 'nameAr' | 'nameEn' | 'order' | 'active' | 'parentId'>>
  ): CategoryNode {
    const list = this.getCategories(establishmentId, type);
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error('القسم غير موجود');
    }

    const existing = list[index];
    const updated: CategoryNode = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    list[index] = updated;
    this.saveCategories(establishmentId, type, list);
    return updated;
  }

  public deleteCategory(
    establishmentId: string,
    type: 'product' | 'material',
    id: string,
    transferToId?: string | null
  ): void {
    let list = this.getCategories(establishmentId, type);
    const target = list.find((c) => c.id === id);
    if (!target) return;

    // If transferring children or items
    if (transferToId) {
      list = list.map((c) => (c.parentId === id ? { ...c, parentId: transferToId } : c));
    } else {
      // Cascade delete or orphan children
      list = list.filter((c) => c.parentId !== id);
    }

    list = list.filter((c) => c.id !== id);
    this.saveCategories(establishmentId, type, list);
  }

  public reorderCategories(
    establishmentId: string,
    type: 'product' | 'material',
    orderedIds: string[]
  ): void {
    const list = this.getCategories(establishmentId, type);
    const updated = list.map((c) => {
      const idx = orderedIds.indexOf(c.id);
      return idx >= 0 ? { ...c, order: idx + 1 } : c;
    });
    this.saveCategories(establishmentId, type, updated);
  }

  public getCategoryTree(establishmentId: string, type: 'product' | 'material'): CategoryTreeItem[] {
    const list = this.getCategories(establishmentId, type).filter((c) => c.active);
    const map = new Map<string, CategoryTreeItem>();

    list.forEach((c) => {
      map.set(c.id, { ...c, children: [] });
    });

    const roots: CategoryTreeItem[] = [];

    list.forEach((c) => {
      const item = map.get(c.id)!;
      if (c.parentId && map.has(c.parentId)) {
        const parent = map.get(c.parentId)!;
        parent.children = parent.children || [];
        parent.children.push(item);
      } else {
        roots.push(item);
      }
    });

    const sortTree = (nodes: CategoryTreeItem[]): CategoryTreeItem[] => {
      return nodes
        .sort((a, b) => a.order - b.order)
        .map((n) => ({
          ...n,
          children: n.children ? sortTree(n.children) : [],
        }));
    };

    return sortTree(roots);
  }

  private generateDefaultSeeds(establishmentId: string, type: 'product' | 'material'): CategoryNode[] {
    const now = new Date().toISOString();
    const result: CategoryNode[] = [];

    if (type === 'product') {
      let mainOrder = 1;
      SEED_PRODUCT_CATEGORIES.forEach((main) => {
        result.push({
          id: main.id,
          establishmentId,
          parentId: null,
          nameAr: main.nameAr,
          nameEn: main.nameEn,
          type: 'product',
          order: mainOrder++,
          active: true,
          createdAt: now,
          updatedAt: now,
        });

        if (main.children) {
          let subOrder = 1;
          main.children.forEach((sub) => {
            result.push({
              id: sub.id,
              establishmentId,
              parentId: main.id,
              nameAr: sub.nameAr,
              nameEn: sub.nameEn,
              type: 'product',
              order: subOrder++,
              active: true,
              createdAt: now,
              updatedAt: now,
            });
          });
        }
      });
    } else {
      let order = 1;
      SEED_MATERIAL_CATEGORIES.forEach((mat) => {
        result.push({
          id: mat.id,
          establishmentId,
          parentId: null,
          nameAr: mat.nameAr,
          nameEn: mat.nameEn,
          type: 'material',
          order: order++,
          active: true,
          createdAt: now,
          updatedAt: now,
        });
      });
    }

    return result;
  }
}

export const categoryService = new CategoryService();
