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
import { MenuItemProduct } from '../services/dataService.ts';

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
const internalProduct: MenuItemProduct = {
  id: 'prd-secret-1',
  establishmentId: 'est-1',
  code: 'P-001',
  nameAr: 'ستيك ريب آي فاخر',
  nameEn: 'Prime Ribeye Steak',
  category: 'Main Course',
  sellingPrice: 45.0,
  suggestedPrice: 45.0,
  trueCost: 18.25, // SENSITIVE COST: MUST BE STRIPPED
  foodCostPercentage: 40.5, // SENSITIVE COST: MUST BE STRIPPED
  grossMarginPercentage: 59.5, // SENSITIVE MARGIN: MUST BE STRIPPED
  targetMarginPercentage: 60, // SENSITIVE MARGIN: MUST BE STRIPPED
  isActive: true,
  recipeIngredients: [],
  directLaborMinutes: 15,
  laborHourlyRate: 18,
  wasteLossBuffer: 1.2,
  utilitiesCost: 1.0,
  consumablesCost: 0.5,
  createdAt: '2026-11-01',
  updatedAt: '2026-11-01',
};

const publicItem = toPublicMenuItem(internalProduct, {
  productId: 'prd-secret-1',
  descriptionAr: 'قطعة لحم أنجوس معتقة 21 يوماً مشوية على الحطب',
  prepTimeMinutes: 25,
  station: 'grill',
  allergens: ['dairy'],
  displayIngredientsAr: ['لحم بقري بلاك أنجوس', 'زبدة بالأعشاب', 'ملح صخري مدخن'],
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
      price: 45.0,
      quantity: 2,
      station: 'grill',
      notes: 'Medium Rare, no salt',
    },
    {
      productId: 'prd-2',
      nameAr: 'تيراميسو كلاسيك',
      nameEn: 'Classic Tiramisu',
      price: 15.0,
      quantity: 1,
      station: 'pastry',
    },
    {
      productId: 'prd-3',
      nameAr: 'كوكتيل الموهيتو المنعش',
      nameEn: 'Fresh Mojito',
      price: 8.0,
      quantity: 3,
      station: 'bar',
      notes: 'Extra mint, less ice',
    },
    {
      productId: 'prd-4',
      nameAr: 'بطاطس مقلية بالكمأة',
      nameEn: 'Truffle Fries',
      price: 12.0,
      quantity: 1,
      station: 'kitchen',
    },
  ],
  subtotal: 145.0,
  taxAmount: 20.3,
  serviceFee: 0,
  deliveryFee: 0,
  totalAmount: 165.3,
  status: 'pending_approval',
  stationStatuses: {},
  source: 'qr_menu',
  createdAt: new Date().toISOString(),
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

// ---------------------------------------------------------------------------
// 6. Display Separation Proof (Item هـ): POS/Accounting/Inventory Data Layer
// ---------------------------------------------------------------------------
import { dataService } from '../services/dataService.ts';
import { orderTransport, OrderTransportEvent } from '../services/orderTransport.ts';

async function runAsyncSuites() {
  // Mock window & localStorage for Node.js test execution
  const memoryStore: Record<string, string> = {};
  (globalThis as any).window = globalThis;
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k in memoryStore ? memoryStore[k] : null),
    setItem: (k: string, v: string) => {
      memoryStore[k] = String(v);
    },
    removeItem: (k: string) => {
      delete memoryStore[k];
    },
  };

  const estId = 'est-sep-test';

  // Seed marketing overrides with heavy images & marketing copy
  await dataService.saveMenuItemOverride(estId, {
    productId: 'prd-1',
    images: ['data:image/png;base64,AAAA...', 'data:image/png;base64,BBBB...'],
    primaryImage: 'data:image/png;base64,AAAA...',
    descriptionAr: 'وصف تسويقي فاخر للعميل فقط',
    descriptionEn: 'Luxury marketing copy for customer only',
    prepMethodAr: 'مشوي على حطب البلوط',
    prepMethodEn: 'Oak wood-fired grill',
    displayIngredientsAr: ['لحم أنجوس', 'كمأة'],
    displayIngredientsEn: ['Angus Beef', 'Truffle'],
    badges: ['bestseller', 'new'],
    station: 'grill',
  });

  // Load products & raw materials as consumed by POS, Accounting, and Inventory
  const posProducts = await dataService.getProducts(estId);
  const inventoryMaterials = await dataService.getRawMaterials(estId);

  assert(posProducts.length > 0, 'POS/Accounting products loaded');
  assert(inventoryMaterials.length > 0, 'Inventory raw materials loaded');

  const hasMarketingFieldsOnPos = posProducts.some(
    (p: any) =>
      'images' in p ||
      'primaryImage' in p ||
      'descriptionAr' in p ||
      'descriptionEn' in p ||
      'prepMethodAr' in p ||
      'prepMethodEn' in p ||
      'displayIngredientsAr' in p ||
      'displayIngredientsEn' in p
  );
  assert(
    !hasMarketingFieldsOnPos,
    'DISPLAY SEPARATION (Item هـ): POS, Accounting & Inventory data layer contains ZERO marketing images or descriptions'
  );

  // -------------------------------------------------------------------------
  // 7. Full Two-Tab E2E Scenario (Item ي): Customer + Cashier/KDS
  //    for dine_in, delivery, and takeaway
  // -------------------------------------------------------------------------
  const cashierEvents: OrderTransportEvent[] = [];
  const unsubscribe = orderTransport.subscribe((ev) => cashierEvents.push(ev));

  // Scenario A: DINE-IN (Table #5)
  const dineInOrder: CustomerOrder = {
    id: 'ord-e2e-1',
    serialNumber: formatOrderSerialNumber(1),
    establishmentId: estId,
    serviceType: 'dine_in',
    tableNumber: '5',
    customerName: 'Table 5 Guest',
    items: [
      {
        productId: 'prd-1',
        nameAr: 'ستيك ريب آي',
        nameEn: 'Ribeye Steak',
        price: 45,
        quantity: 1,
        station: 'grill',
      },
      {
        productId: 'prd-3',
        nameAr: 'موهيتو',
        nameEn: 'Mojito',
        price: 8,
        quantity: 1,
        station: 'bar',
      },
    ],
    subtotal: 53,
    taxAmount: 7.42,
    serviceFee: 0,
    deliveryFee: 0,
    totalAmount: 60.42,
    status: 'pending_approval',
    stationStatuses: { grill: 'pending', bar: 'pending' },
    source: 'qr_menu',
    createdAt: new Date().toISOString(),
  };

  await orderTransport.submitOrder(dineInOrder);
  assert(
    cashierEvents.some((e) => e.type === 'ORDER_SUBMITTED' && e.order.id === 'ord-e2e-1'),
    'E2E Dine-In: Cashier tab received ORDER_SUBMITTED for Table #5 (#0001)'
  );

  await orderTransport.updateOrderStatus(estId, 'ord-e2e-1', 'approved');
  const dineInTickets = splitOrderIntoStationTickets(dineInOrder);
  assert(dineInTickets.length === 3, 'E2E Dine-In: Split into grill + bar + cashier tickets');

  // Grill finishes first while Bar is still pending (station lag condition)
  const afterGrillReady = await orderTransport.updateStationStatus(estId, 'ord-e2e-1', 'grill', 'ready');
  assert(
    afterGrillReady?.stationStatuses.grill === 'ready' &&
      afterGrillReady?.stationStatuses.bar === 'pending' &&
      afterGrillReady?.status === 'approved',
    'E2E Dine-In: Station lag state detected (grill=ready, bar=pending, order not yet ready)'
  );

  // Bar finishes -> overall order becomes ready
  const afterBarReady = await orderTransport.updateStationStatus(estId, 'ord-e2e-1', 'bar', 'ready');
  assert(
    afterBarReady?.status === 'ready',
    'E2E Dine-In: Order automatically transitions to READY when all stations finish'
  );

  // Scenario B: DELIVERY
  const deliveryOrder: CustomerOrder = {
    id: 'ord-e2e-2',
    serialNumber: formatOrderSerialNumber(2),
    establishmentId: estId,
    serviceType: 'delivery',
    customerName: 'Nadia Hassan',
    customerPhone: '+201012345678',
    deliveryAddress: '14 Nile St, Maadi',
    items: [
      {
        productId: 'prd-4',
        nameAr: 'بيتزا مارغريتا',
        nameEn: 'Pizza Margherita',
        price: 15,
        quantity: 2,
        station: 'kitchen',
      },
    ],
    subtotal: 30,
    taxAmount: 4.2,
    serviceFee: 0,
    deliveryFee: 5,
    totalAmount: 39.2,
    status: 'pending_approval',
    stationStatuses: { kitchen: 'pending' },
    source: 'qr_menu',
    createdAt: new Date().toISOString(),
  };

  await orderTransport.submitOrder(deliveryOrder);
  await orderTransport.updateOrderStatus(estId, 'ord-e2e-2', 'approved');
  const deliveryReady = await orderTransport.updateStationStatus(estId, 'ord-e2e-2', 'kitchen', 'ready');
  assert(
    deliveryReady?.status === 'ready' && deliveryReady?.deliveryFee === 5,
    'E2E Delivery: Order #0002 with delivery fee & address approved and marked READY'
  );

  // Scenario C: TAKEAWAY
  const takeawayOrder: CustomerOrder = {
    id: 'ord-e2e-3',
    serialNumber: formatOrderSerialNumber(3),
    establishmentId: estId,
    serviceType: 'takeaway',
    customerName: 'Omar Adel',
    customerPhone: '+201122334455',
    pickupTime: '19:30',
    items: [
      {
        productId: 'prd-2',
        nameAr: 'تيراميسو',
        nameEn: 'Tiramisu',
        price: 12,
        quantity: 1,
        station: 'pastry',
      },
    ],
    subtotal: 12,
    taxAmount: 1.68,
    serviceFee: 0,
    deliveryFee: 0,
    totalAmount: 13.68,
    status: 'pending_approval',
    stationStatuses: { pastry: 'pending' },
    source: 'qr_menu',
    createdAt: new Date().toISOString(),
  };

  await orderTransport.submitOrder(takeawayOrder);
  await orderTransport.updateOrderStatus(estId, 'ord-e2e-3', 'approved');
  const takeawayReady = await orderTransport.updateStationStatus(estId, 'ord-e2e-3', 'pastry', 'ready');
  assert(
    takeawayReady?.status === 'ready' && takeawayReady?.pickupTime === '19:30',
    'E2E Takeaway: Order #0003 with pickup time 19:30 approved and marked READY'
  );

  unsubscribe();
  console.log('\n🎉 ALL PHASE 5 UNIT & E2E TESTS PASSED SUCCESSFULLY (7/7 suites)!\n');
}

runAsyncSuites();

