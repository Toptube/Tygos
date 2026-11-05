/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * QR ELECTRONIC MENU, ORDER TRANSPORT & STATION ROUTING TYPES
 * Phase 5 Master Domain Models & Pure Transformers
 */

export type PrepStation = 'kitchen' | 'bar' | 'grill' | 'pastry' | 'bakery' | 'cashier';

export const PREP_STATIONS: { id: PrepStation; labelAr: string; labelEn: string }[] = [
  { id: 'kitchen', labelAr: 'المطبخ الرئيسي', labelEn: 'Main Kitchen' },
  { id: 'grill', labelAr: 'قسم المشاوي', labelEn: 'Grill Station' },
  { id: 'bar', labelAr: 'البار والمشروبات', labelEn: 'Bar & Beverages' },
  { id: 'pastry', labelAr: 'الحلواني والحلويات', labelEn: 'Pastry & Desserts' },
  { id: 'bakery', labelAr: 'المخبز والأفران', labelEn: 'Bakery & Ovens' },
  { id: 'cashier', labelAr: 'محطة الكاشير والتغليف', labelEn: 'Cashier & Packing' },
];

export type CustomerOrderStatus =
  | 'pending_approval'
  | 'approved'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'completed'
  | 'rejected';

export type ServiceType = 'dine_in' | 'takeaway' | 'delivery';

export type AllergenTag = 'gluten' | 'dairy' | 'nuts' | 'eggs' | 'soy' | 'fish' | 'shellfish';

export interface PublicMenuItem {
  id: string;
  productId: string;
  nameAr: string;
  nameEn: string;
  category: string;
  price: number;
  descriptionAr: string;
  descriptionEn: string;
  displayIngredientsAr: string[];
  displayIngredientsEn: string[];
  prepMethodAr: string;
  prepMethodEn: string;
  prepTimeMinutes: number;
  badges: ('spicy' | 'vegan' | 'new' | 'bestseller')[];
  allergens: AllergenTag[];
  images: string[];
  primaryImage?: string;
  isAvailable: boolean;
  station: PrepStation;
  sortOrder: number;
}

export interface MenuItemOverride {
  productId: string;
  descriptionAr?: string;
  descriptionEn?: string;
  displayIngredientsAr?: string[];
  displayIngredientsEn?: string[];
  prepMethodAr?: string;
  prepMethodEn?: string;
  prepTimeMinutes?: number;
  badges?: ('spicy' | 'vegan' | 'new' | 'bestseller')[];
  allergens?: AllergenTag[];
  images?: string[];
  primaryImage?: string;
  isAvailable?: boolean;
  station?: PrepStation;
  sortOrder?: number;
}

export interface CustomerOrderItem {
  productId: string;
  nameAr: string;
  nameEn: string;
  price: number;
  quantity: number;
  notes?: string;
  station: PrepStation;
}

export interface CustomerOrder {
  id: string;
  serialNumber: string; // e.g. #0042
  establishmentId: string;
  serviceType: ServiceType;
  tableNumber?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress?: string;
  landmark?: string;
  deliveryNotes?: string;
  pickupTime?: string;
  items: CustomerOrderItem[];
  subtotal: number;
  taxAmount: number;
  serviceFee: number;
  deliveryFee: number;
  discountAmount?: number;
  couponCode?: string;
  loyaltyPointsRedeemed?: number;
  loyaltyPointsEarned?: number;
  totalAmount: number;
  status: CustomerOrderStatus;
  rejectionReason?: string;
  driverName?: string;
  driverPhone?: string;
  driverCashSettled?: boolean;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  readyAt?: string;
  completedAt?: string;
  stationStatuses: Partial<Record<PrepStation, 'pending' | 'preparing' | 'ready'>>;
  source: 'qr_menu' | 'pos';
}

export interface StationTicket {
  id: string;
  orderId: string;
  serialNumber: string;
  station: PrepStation;
  serviceType: ServiceType;
  tableNumber?: string;
  customerName?: string;
  // Personal data ONLY for cashier ticket - hidden from kitchen/bar/grill
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
  createdAt: string;
  items: {
    productId: string;
    nameAr: string;
    nameEn: string;
    quantity: number;
    notes?: string;
  }[];
  status: 'pending' | 'preparing' | 'ready';
}

/**
 * PURE TRANSFORMER: Converts a internal Product to PublicMenuItem.
 * STRICT SECURITY INVARIANT:
 * Strips all internal costs, recipe BOMs, margin targets, stock levels, and supplier data!
 */
export function toPublicMenuItem(
  product: any,
  override?: MenuItemOverride
): PublicMenuItem {
  const p = product as any;
  const ov = override as any;
  const calculatedPrice =
    p.sellingPrice !== undefined
      ? p.sellingPrice
      : p.salePrice !== undefined
      ? p.salePrice
      : p.price !== undefined
      ? p.price
      : 0;

  return {
    id: `public_${p.id}`,
    productId: p.id,
    nameAr: p.nameAr || p.name || '',
    nameEn: p.nameEn || p.name || '',
    category: p.category || 'General',
    price: calculatedPrice,
    descriptionAr: ov?.descriptionAr || ov?.marketingDescriptionAr || p.descriptionAr || '',
    descriptionEn: ov?.descriptionEn || ov?.marketingDescriptionEn || p.descriptionEn || '',
    displayIngredientsAr: ov?.displayIngredientsAr || ov?.publicIngredientsAr || p.displayIngredientsAr || [],
    displayIngredientsEn: ov?.displayIngredientsEn || ov?.publicIngredientsEn || p.displayIngredientsEn || [],
    prepMethodAr: ov?.prepMethodAr || '',
    prepMethodEn: ov?.prepMethodEn || '',
    prepTimeMinutes: ov?.prepTimeMinutes || p.prepTimeMinutes || 15,
    badges: ov?.badges || [],
    allergens: ov?.allergens || p.allergens || [],
    images: ov?.images || (p.imageUrl ? [p.imageUrl] : []),
    primaryImage: ov?.primaryImage || (ov?.images?.[0] || p.imageUrl),
    isAvailable: ov?.isAvailable !== undefined ? ov.isAvailable : p.isActive !== undefined ? p.isActive : true,
    station: ov?.station || ov?.prepStation || p.station || 'kitchen',
    sortOrder: ov?.sortOrder || 0,
  };
}

/**
 * Splits an approved CustomerOrder into Station Tickets.
 * Production stations (kitchen, bar, grill, etc.) DO NOT see customer phone, address, or prices.
 * Cashier ticket receives the full breakdown.
 */
export function splitOrderIntoStationTickets(order: CustomerOrder): StationTicket[] {
  const tickets: StationTicket[] = [];

  // Group items by station
  const stationGroups = new Map<PrepStation, CustomerOrderItem[]>();

  for (const item of order.items) {
    const list = stationGroups.get(item.station) || [];
    list.push(item);
    stationGroups.set(item.station, list);
  }

  // Generate station-specific tickets
  stationGroups.forEach((items, station) => {
    tickets.push({
      id: `ticket_${order.id}_${station}`,
      orderId: order.id,
      serialNumber: order.serialNumber,
      station,
      serviceType: order.serviceType,
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      // Personal customer details are HIDDEN from food prep stations
      customerPhone: undefined,
      deliveryAddress: undefined,
      deliveryNotes: undefined,
      createdAt: order.createdAt,
      items: items.map((it) => ({
        productId: it.productId,
        nameAr: it.nameAr,
        nameEn: it.nameEn,
        quantity: it.quantity,
        notes: it.notes,
      })),
      status: order.stationStatuses?.[station] || 'pending',
    });
  });

  // Always generate a master Cashier ticket containing all items + customer contact details
  tickets.push({
    id: `ticket_${order.id}_cashier`,
    orderId: order.id,
    serialNumber: order.serialNumber,
    station: 'cashier',
    serviceType: order.serviceType,
    tableNumber: order.tableNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    deliveryAddress: order.deliveryAddress,
    deliveryNotes: order.deliveryNotes,
    createdAt: order.createdAt,
    items: order.items.map((it) => ({
      productId: it.productId,
      nameAr: it.nameAr,
      nameEn: it.nameEn,
      quantity: it.quantity,
      notes: it.notes,
    })),
    status: 'pending',
  });

  return tickets;
}

/**
 * Format incremental venue order serial number (e.g. 1 -> "#0001", 42 -> "#0042")
 */
export function formatOrderSerialNumber(num: number): string {
  const safeNum = Math.max(1, Math.floor(num));
  return `#${safeNum.toString().padStart(4, '0')}`;
}

/**
 * Parse serial number back to numeric
 */
export function parseOrderSerialNumber(serial: string): number {
  const clean = serial.replace('#', '').trim();
  const val = parseInt(clean, 10);
  return isNaN(val) ? 1 : val;
}

/**
 * Sanitize user text inputs (anti-XSS and script injection prevention)
 */
export function sanitizeUserInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, 500);
}
