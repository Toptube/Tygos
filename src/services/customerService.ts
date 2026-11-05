/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * UNIFIED CUSTOMER (CRM), LOYALTY & COUPONS SERVICE (Phase 6 - Section 1)
 * Backed by TenantRepository (zero direct localStorage calls).
 */

import {
  TenantRepository,
  defaultStorageAdapter,
} from '../repositories/repositories.ts';
import {
  SyncEntityMetadata,
  generateUuid,
} from '../sync/syncTypes.ts';
import { CustomerOrder } from '../domain/qrMenuTypes.ts';

export interface CustomerAddress {
  id: string;
  label: string; // e.g. 'المنزل' / 'العمل'
  description: string;
  deliveryNotes?: string;
  isDefault?: boolean;
}

export interface CustomerProfile extends Partial<SyncEntityMetadata> {
  id: string;
  name: string;
  phone: string; // Normalized primary identifier
  addresses: CustomerAddress[];
  notes: string;
  tags: string[]; // e.g. ['VIP', 'Regular']
  isBlacklisted: boolean;
  blacklistReason?: string;
  loyaltyPoints: number;
  visitsCount: number;
  totalSpent: number;
  lastOrderAt?: string;
  isAnonymized?: boolean;
  createdAt: string;
}

export interface LoyaltyConfig {
  enabled: boolean;
  pointsPerCurrencyUnit: number; // e.g., 1 point per $1 spent
  redeemRateCurrencyPerPoint: number; // e.g., $0.05 discount per point
  minRedeemPoints: number; // e.g., 20 points minimum
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  expiresAt: string; // ISO date YYYY-MM-DD
  maxUses: number;
  usedCount: number;
  isActive: boolean;
}

export interface DiscountCalculationResult {
  couponDiscount: number;
  loyaltyDiscount: number;
  totalDiscount: number;
  pointsEarned: number;
  errorAr?: string;
  errorEn?: string;
}

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  enabled: true,
  pointsPerCurrencyUnit: 1,
  redeemRateCurrencyPerPoint: 0.05,
  minRedeemPoints: 20,
};

/**
 * Normalizes phone numbers for reliable lookup & deduplication.
 */
export function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-().]/g, '').trim();
  if (cleaned.startsWith('00')) {
    return `+${cleaned.slice(2)}`;
  }
  return cleaned;
}

/**
 * Single canonical discount & loyalty calculation function
 * shared between Public Menu Cart and Cashier POS.
 */
export function calculateOrderDiscounts(params: {
  subtotal: number;
  coupon?: Coupon | null;
  loyaltyPointsToRedeem?: number;
  customerAvailablePoints?: number;
  loyaltyConfig?: LoyaltyConfig;
  nowDate?: Date;
}): DiscountCalculationResult {
  const {
    subtotal,
    coupon,
    loyaltyPointsToRedeem = 0,
    customerAvailablePoints = 0,
    loyaltyConfig = DEFAULT_LOYALTY_CONFIG,
    nowDate = new Date(),
  } = params;

  let couponDiscount = 0;
  let errorAr: string | undefined;
  let errorEn: string | undefined;

  if (coupon) {
    const todayStr = nowDate.toISOString().slice(0, 10);
    if (!coupon.isActive) {
      errorAr = 'الكوبون غير نشط حالياً';
      errorEn = 'Coupon is inactive';
    } else if (coupon.expiresAt && coupon.expiresAt < todayStr) {
      errorAr = 'انتهت صلاحية الكوبون';
      errorEn = 'Coupon has expired';
    } else if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      errorAr = 'تم استنفاد الحد الأقصى لاستخدام الكوبون';
      errorEn = 'Coupon usage limit reached';
    } else {
      if (coupon.discountType === 'percentage') {
        couponDiscount = Math.round(subtotal * (Math.min(100, Math.max(0, coupon.value)) / 100) * 100) / 100;
      } else {
        couponDiscount = Math.min(subtotal, Math.max(0, coupon.value));
      }
    }
  }

  let loyaltyDiscount = 0;
  if (loyaltyConfig.enabled && loyaltyPointsToRedeem > 0) {
    if (loyaltyPointsToRedeem < loyaltyConfig.minRedeemPoints) {
      errorAr = errorAr || `الحد الأدنى للاستبدال هو ${loyaltyConfig.minRedeemPoints} نقطة`;
      errorEn = errorEn || `Minimum redeem is ${loyaltyConfig.minRedeemPoints} points`;
    } else if (loyaltyPointsToRedeem > customerAvailablePoints) {
      errorAr = errorAr || 'رصيد النقاط غير كافٍ';
      errorEn = errorEn || 'Insufficient loyalty points';
    } else {
      const remainingAfterCoupon = Math.max(0, subtotal - couponDiscount);
      loyaltyDiscount = Math.min(
        remainingAfterCoupon,
        Math.round(loyaltyPointsToRedeem * loyaltyConfig.redeemRateCurrencyPerPoint * 100) / 100
      );
    }
  }

  const totalDiscount = Math.round((couponDiscount + loyaltyDiscount) * 100) / 100;
  const netForPoints = Math.max(0, subtotal - totalDiscount);
  const pointsEarned = loyaltyConfig.enabled
    ? Math.floor(netForPoints * loyaltyConfig.pointsPerCurrencyUnit)
    : 0;

  return {
    couponDiscount,
    loyaltyDiscount,
    totalDiscount,
    pointsEarned,
    errorAr,
    errorEn,
  };
}

class CustomerService {
  private repo = new TenantRepository<CustomerProfile>(
    defaultStorageAdapter,
    'customers',
    'customer'
  );
  private couponRepo = new TenantRepository<Coupon>(
    defaultStorageAdapter,
    'coupons',
    'coupon'
  );

  public async getCustomers(tenantId: string): Promise<CustomerProfile[]> {
    const list = await this.repo.getAll(tenantId);
    if (list.length === 0) {
      const seeded = this.getSeedCustomers();
      for (const c of seeded) {
        await this.repo.upsert(tenantId, c, `seed:customer:${c.id}`);
      }
      return this.repo.getAll(tenantId);
    }
    return list;
  }

  private getSeedCustomers(): CustomerProfile[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'cust-seed-1',
        name: 'كريم منصور',
        phone: '+201099998888',
        addresses: [
          {
            id: 'addr-1',
            label: 'المنزل',
            description: 'الزمالك - شارع 26 يوليو عمارة 14 الدور 4',
            deliveryNotes: 'الاتصال عند الوصول للبوابة',
            isDefault: true,
          },
        ],
        notes: 'يفضل الستيك Medium Rare بدون ملح إضافي',
        tags: ['VIP', 'دائم'],
        isBlacklisted: false,
        loyaltyPoints: 240,
        visitsCount: 12,
        totalSpent: 1480.5,
        lastOrderAt: now,
        createdAt: '2026-09-10T10:00:00.000Z',
      },
      {
        id: 'cust-seed-2',
        name: 'نادية حسن',
        phone: '+201012345678',
        addresses: [
          {
            id: 'addr-2',
            label: 'العمل',
            description: 'المعادي - شارع النيل برج 8',
            deliveryNotes: 'الاستقبال في الدور الأرضي',
            isDefault: true,
          },
        ],
        notes: 'حساسية من المكسرات',
        tags: ['VIP'],
        isBlacklisted: false,
        loyaltyPoints: 115,
        visitsCount: 6,
        totalSpent: 620.0,
        lastOrderAt: now,
        createdAt: '2026-10-02T14:30:00.000Z',
      },
    ];
  }

  public async saveCustomer(tenantId: string, customer: CustomerProfile): Promise<CustomerProfile> {
    const normalized: CustomerProfile = {
      ...customer,
      phone: customer.isAnonymized ? customer.phone : normalizePhone(customer.phone),
    };
    return this.repo.upsert(tenantId, normalized);
  }

  /**
   * Finds customer by normalized phone; if not found, creates a new profile.
   */
  public async findOrCreateByPhone(
    tenantId: string,
    input: {
      name: string;
      phone: string;
      addressDescription?: string;
      deliveryNotes?: string;
      orderTotal?: number;
      pointsEarned?: number;
    }
  ): Promise<CustomerProfile> {
    const normPhone = normalizePhone(input.phone);
    const all = await this.getCustomers(tenantId);
    const existing = all.find((c) => normalizePhone(c.phone) === normPhone && !c.isAnonymized);

    if (existing) {
      const addresses = [...existing.addresses];
      if (
        input.addressDescription &&
        !addresses.some((a) => a.description === input.addressDescription)
      ) {
        addresses.push({
          id: `addr-${generateUuid().slice(0, 6)}`,
          label: 'عنوان توصيل',
          description: input.addressDescription,
          deliveryNotes: input.deliveryNotes,
          isDefault: addresses.length === 0,
        });
      }

      const updated: CustomerProfile = {
        ...existing,
        name: existing.name || input.name,
        addresses,
        visitsCount: existing.visitsCount + 1,
        totalSpent: Math.round((existing.totalSpent + (input.orderTotal || 0)) * 100) / 100,
        loyaltyPoints: existing.loyaltyPoints + (input.pointsEarned || 0),
        lastOrderAt: new Date().toISOString(),
      };
      return this.repo.upsert(tenantId, updated);
    }

    const newCustomer: CustomerProfile = {
      id: generateUuid(),
      name: input.name || 'عميل جديد',
      phone: normPhone,
      addresses: input.addressDescription
        ? [
            {
              id: `addr-${generateUuid().slice(0, 6)}`,
              label: 'الأساسي',
              description: input.addressDescription,
              deliveryNotes: input.deliveryNotes,
              isDefault: true,
            },
          ]
        : [],
      notes: '',
      tags: ['جديد'],
      isBlacklisted: false,
      loyaltyPoints: input.pointsEarned || 0,
      visitsCount: 1,
      totalSpent: Math.round((input.orderTotal || 0) * 100) / 100,
      lastOrderAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    return this.repo.upsert(tenantId, newCustomer);
  }

  /**
   * Merges a duplicate customer profile into the primary profile and soft-deletes the duplicate.
   */
  public async mergeCustomers(
    tenantId: string,
    primaryId: string,
    duplicateId: string
  ): Promise<CustomerProfile | null> {
    if (primaryId === duplicateId) return null;
    const primary = await this.repo.getById(tenantId, primaryId);
    const duplicate = await this.repo.getById(tenantId, duplicateId);
    if (!primary || !duplicate) return null;

    const mergedAddresses = [...primary.addresses];
    for (const addr of duplicate.addresses) {
      if (!mergedAddresses.some((a) => a.description === addr.description)) {
        mergedAddresses.push(addr);
      }
    }

    const mergedTags = Array.from(new Set([...primary.tags, ...duplicate.tags]));
    const merged: CustomerProfile = {
      ...primary,
      addresses: mergedAddresses,
      tags: mergedTags,
      notes: [primary.notes, duplicate.notes].filter(Boolean).join(' | '),
      loyaltyPoints: primary.loyaltyPoints + duplicate.loyaltyPoints,
      visitsCount: primary.visitsCount + duplicate.visitsCount,
      totalSpent: Math.round((primary.totalSpent + duplicate.totalSpent) * 100) / 100,
    };

    await this.repo.upsert(tenantId, merged);
    await this.repo.softDelete(tenantId, duplicateId);
    return merged;
  }

  /**
   * Anonymizes customer PII upon privacy request while preserving accounting totals.
   */
  public async anonymizeCustomer(
    tenantId: string,
    customerId: string
  ): Promise<CustomerProfile | null> {
    const existing = await this.repo.getById(tenantId, customerId);
    if (!existing) return null;

    const anonymized: CustomerProfile = {
      ...existing,
      name: 'عميل مجهول الهوية (Anonymized)',
      phone: `ANON-${customerId.slice(0, 8)}`,
      addresses: [],
      notes: '',
      tags: ['Anonymized'],
      isAnonymized: true,
    };
    return this.repo.upsert(tenantId, anonymized);
  }

  /**
   * Computes customer order history, average check, favorite items, and rejections.
   */
  public getCustomerAnalytics(customer: CustomerProfile, allOrders: CustomerOrder[]) {
    const normPhone = normalizePhone(customer.phone);
    const customerOrders = allOrders.filter(
      (o) =>
        o.customerId === customer.id ||
        (o.customerPhone && normalizePhone(o.customerPhone) === normPhone)
    );

    const validOrders = customerOrders.filter((o) => o.status !== 'rejected');
    const rejectedOrders = customerOrders.filter((o) => o.status === 'rejected');

    const ordersTotal = validOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const visits = Math.max(customer.visitsCount, validOrders.length);
    const totalSpent = Math.max(customer.totalSpent, ordersTotal);
    const avgCheck = visits > 0 ? totalSpent / visits : 0;

    const itemCounts: Record<string, { nameAr: string; nameEn: string; count: number }> = {};
    validOrders.forEach((o) => {
      o.items.forEach((it) => {
        if (!itemCounts[it.productId]) {
          itemCounts[it.productId] = { nameAr: it.nameAr, nameEn: it.nameEn, count: 0 };
        }
        itemCounts[it.productId].count += it.quantity;
      });
    });

    const favoriteItems = Object.values(itemCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      orders: customerOrders,
      visitsCount: visits,
      totalSpent,
      avgCheck,
      rejectedCount: rejectedOrders.length,
      favoriteItems,
      lastOrder: customerOrders[0] || null,
    };
  }

  // --- COUPONS ---
  public async getCoupons(tenantId: string): Promise<Coupon[]> {
    const list = await this.couponRepo.getAll(tenantId);
    if (list.length === 0) {
      const seed: Coupon = {
        id: 'cpn-welcome-10',
        code: 'TYGOS10',
        discountType: 'percentage',
        value: 10,
        expiresAt: '2027-12-31',
        maxUses: 500,
        usedCount: 12,
        isActive: true,
      };
      await this.couponRepo.upsert(tenantId, seed, 'seed:coupon:TYGOS10');
      return this.couponRepo.getAll(tenantId);
    }
    return list;
  }

  public async saveCoupon(tenantId: string, coupon: Coupon): Promise<Coupon> {
    return this.couponRepo.upsert(tenantId, {
      ...coupon,
      code: coupon.code.trim().toUpperCase(),
    });
  }

  public async findCouponByCode(tenantId: string, code: string): Promise<Coupon | null> {
    const all = await this.getCoupons(tenantId);
    const norm = code.trim().toUpperCase();
    return all.find((c) => c.code.toUpperCase() === norm) || null;
  }
}

export const customerService = new CustomerService();
