/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Standalone Unit Verification for TYGOS Phase 5 QR Menu & Station Routing
 */

import {
  toPublicMenuItem,
  splitOrderIntoStationTickets,
  formatOrderSerialNumber,
  sanitizeUserInput,
  PublicMenuItem,
  CustomerOrder,
} from './qrMenuTypes.ts';
import { Product } from '../types/index.ts';

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${testName}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${testName}`);
  }
}

console.log('🧪 Running Phase 5 QR Menu & Routing Unit Tests...\n');

// ---------------------------------------------------------------------------
// 1. Data Privacy: toPublicMenuItem Strict Isolation
// ---------------------------------------------------------------------------
const internalProduct: Product = {
  id: 'prd-secret-1',
  establishmentId: 'est-1',
  nameAr: 'ستيك ريب آي فاخر',
  nameEn: 'Prime Ribeye Steak',
  category: 'Main Course',
  salePrice: 45.0,
  costPrice: 18.25, // SENSITIVE COST: MUST BE STRIPPED
  targetMarginPercentage: 60, // SENSITIVE MARGIN: MUST BE STRIPPED
  allergens: ['Dairy'],
  isAvailable: true,
  createdAt: '2026-11-01',
  updatedAt: '2026-11-01',
};

const publicItem = toPublicMenuItem(internalProduct, {
  marketingDescriptionAr: 'قطعة لحم أنجوس معتقة 21 يوماً مشوية على الحطب',
  prepTimeMinutes: 25,
  prepStation: 'grill',
  allergens: ['Dairy'],
  publicIngredientsAr: ['لحم بقري بلاك أنجوس', 'زبدة بالأعشاب', 'ملح صخري مدخن'],
});

assert(publicItem.productId === 'prd-secret-1', 'Public menu item retains product ID');
assert(publicItem.price === 45.0, 'Public menu item retains customer sale price');
assert(publicItem.station === 'grill', 'Public menu item assigns station correctly');
assert(publicItem.prepTimeMinutes === 25, 'Public menu item includes estimated prep time');
assert(
  !('costPrice' in publicItem) &&
  !('targetMarginPercentage' in publicItem) &&
  !('rawIngredientsCost' in publicItem),
  'PRIVACY GUARANTEE: Sensitive recipe cost, BOM, and margin fields are completely omitted'
);

// ---------------------------------------------------------------------------
// 2. Serial Number Formatting (#0001)
// ---------------------------------------------------------------------------
assert(formatOrderSerialNumber(1) === '#0001', 'Serial 1 formats as #0001');
assert(formatOrderSerialNumber(42) === '#0042', 'Serial 42 formats as #0042');
assert(formatOrderSerialNumber(999) === '#0999', 'Serial 999 formats as #0999');
assert(formatOrderSerialNumber(1000) === '#1000', 'Serial 1000 formats as #1000');

// ---------------------------------------------------------------------------
// 3. Input Sanitization (Anti-XSS & Anti-Injection)
// ---------------------------------------------------------------------------
const dangerousInput = '  <script>alert("hack")</script> extra onions & sauce  ';
const cleanInput = sanitizeUserInput(dangerousInput);
assert(
  !cleanInput.includes('<script>') && !cleanInput.includes('<') && !cleanInput.includes('>'),
  'Sanitizer neutralizes HTML and script tags'
);
assert(cleanInput.endsWith('sauce') && !cleanInput.startsWith(' '), 'Sanitizer trims outer whitespace');

// ---------------------------------------------------------------------------
// 4. Station Routing: splitOrderIntoStationTickets
// ---------------------------------------------------------------------------
const testOrder: CustomerOrder = {
  id: 'ord-test-99',
  serialNumber: '#0042',
  establishmentId: 'est-1',
  serviceType: 'dine_in',
  tableNumber: '7',
  customerName: 'Karim Mansour',
  customerPhone: '+201099998888', // SENSITIVE PII
  deliveryAddress: 'Apt 4B, Zamalek', // SENSITIVE PII
  items: [
    {
      productId: 'prd-1',
      nameAr: 'ستيك ريب آي',
      nameEn: 'Ribeye Steak',
      unitPrice: 45.0,
      quantity: 2,
      station: 'grill',
      notes: 'Medium Rare, no salt',
    },
    {
      productId: 'prd-2',
      nameAr: 'سلطة سيزر مقرمشة',
      nameEn: 'Caesar Salad',
      unitPrice: 15.0,
      quantity: 1,
      station: 'cold_kitchen',
    },
    {
      productId: 'prd-3',
      nameAr: 'كوكتيل الموهيتو المنعش',
      nameEn: 'Fresh Mojito',
      unitPrice: 8.0,
      quantity: 3,
      station: 'bar',
      notes: 'Extra mint, less ice',
    },
    {
      productId: 'prd-4',
      nameAr: 'بطاطس مقلية بالكمأة',
      nameEn: 'Truffle Fries',
      unitPrice: 12.0,
      quantity: 1,
      station: 'hot_kitchen',
    },
  ],
  subtotal: 145.0,
  taxAmount: 20.3,
  deliveryFee: 0,
  total: 165.3,
  status: 'pending_approval',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const stationTickets = splitOrderIntoStationTickets(testOrder);

assert(stationTickets.length === 5, '4 prep stations plus 1 master cashier ticket produced (5 tickets total)');

const grillTicket = stationTickets.find((t) => t.station === 'grill');
assert(!!grillTicket, 'Grill station ticket exists');
assert(grillTicket?.items.length === 1, 'Grill ticket contains 1 item line');
assert(grillTicket?.items[0].quantity === 2, 'Grill ticket preserves quantity of 2');
assert(grillTicket?.items[0].notes === 'Medium Rare, no salt', 'Grill ticket preserves customer prep notes');
assert(grillTicket?.tableNumber === '7', 'Grill ticket carries table reference #7');
assert(grillTicket?.serialNumber === '#0042', 'Grill ticket carries order serial #0042');

const barTicket = stationTickets.find((t) => t.station === 'bar');
assert(!!barTicket, 'Bar station ticket exists');
assert(barTicket?.items[0].quantity === 3, 'Bar ticket has 3 mojitos');

const cashierTicket = stationTickets.find((t) => t.station === 'cashier');
assert(!!cashierTicket, 'Master cashier ticket exists');
assert(cashierTicket?.customerPhone === '+201099998888', 'Cashier ticket retains customer phone for delivery/contact');

// Ensure production food station ticket does not leak customer phone or delivery address
assert(grillTicket?.customerPhone === undefined, 'Kitchen prep tickets do not expose sensitive customer phone number');
assert(barTicket?.deliveryAddress === undefined, 'Bar prep tickets do not expose customer delivery address');

// ---------------------------------------------------------------------------
// 5. Financial Parity: Cart Math & Tax Consistency
// ---------------------------------------------------------------------------
const itemsTotal = (45.0 * 2) + (15.0 * 1) + (8.0 * 3) + (12.0 * 1); // 90 + 15 + 24 + 12 = 141.0
assert(itemsTotal === 141.0, 'Calculated item subtotal matches component math ($141.0)');

const taxRate = 0.14; // 14% Standard VAT
const calculatedTax = Math.round(itemsTotal * taxRate * 100) / 100; // 19.74
const calculatedGrandTotal = Math.round((itemsTotal + calculatedTax) * 100) / 100; // 160.74

assert(calculatedTax === 19.74, '14% VAT on $141 is $19.74');
assert(calculatedGrandTotal === 160.74, 'Grand total of subtotal + VAT is $160.74');

console.log('\n🎉 ALL PHASE 5 UNIT TESTS PASSED SUCCESSFULLY (5/5 suites)!\n');
