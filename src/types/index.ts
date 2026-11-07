/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// -------------------------------------------------------------
// USER ROLES & PERMISSIONS
// -------------------------------------------------------------
export type UserRole =
  | 'super_admin'
  | 'tenant_admin'
  | 'general_manager'
  | 'financial_manager'
  | 'financial_accountant'
  | 'cost_accountant'
  | 'tax_accountant'
  | 'store_manager'
  | 'cashier'
  | 'hr_manager'
  | 'public_relations'
  | 'kitchen_manager'
  | 'bar_manager'
  | 'marketing_officer'
  | 'waiter';

// -------------------------------------------------------------
// ESTABLISHMENT & TENANCY
// -------------------------------------------------------------
export type BusinessType =
  | 'restaurant'
  | 'cafe'
  | 'hotel'
  | 'resort'
  | 'restaurant_cafe'
  | 'fast_food'
  | 'tourist_village'
  | 'system_admin'
  | 'take_away'
  | 'bakery'
  | 'pastry'
  | 'food_beverage_outlet'
  | 'other';

export type EstablishmentStatus = 'active' | 'trial' | 'suspended' | 'pending';

export interface Establishment {
  id: string;
  code: string;
  prefix: string;
  number: string;
  name: string;
  ownerName: string;
  businessType: BusinessType;
  nationalId: string;
  crNumber?: string;
  taxNumber?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  secondaryPhone?: string;
  email: string;
  language: string;
  currency: string;
  timezone: string;
  branchesCount: number;
  usersCount: number;
  status: EstablishmentStatus;
  createdAt: string;
  lastActivity: string;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  establishmentId: string;
  establishmentCode: string;
  establishmentName: string;
  branchName?: string;
  avatarUrl?: string;
  isSuperAdmin?: boolean;
  temporarySessionId?: string;
  permittedViews?: string[];
  customPermissions?: string[];
  password?: string;
  passwordHash?: string;
  passwordSalt?: string;
  mustChangePasswordOnLogin?: boolean;
  status?: 'active' | 'suspended';
  createdAt?: string;
  updatedAt?: string;
}

export interface MaintenanceSession {
  id: string;
  targetEstablishmentCode: string;
  targetEstablishmentName: string;
  adminUsername: string;
  durationMinutes: number;
  reason: string;
  startedAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'terminated';
}

// -------------------------------------------------------------
// POS, PRODUCTS & MENU
// -------------------------------------------------------------
export type ProductionDepartment =
  | 'Kitchen'
  | 'Bar'
  | 'Bakery'
  | 'Pastry'
  | 'Grill'
  | 'Preparation';

export interface RecipeIngredientSummary {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  cost: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  department: string;
  sellingPrice: number;
  taxRate: number;
  unit: string;
  barcode?: string;
  isAvailable: boolean;
  availableDineIn: boolean;
  availableTakeAway: boolean;
  availableDelivery: boolean;
  recipeCost: number;
  foodCostPercentage: number;
  recipe: RecipeIngredientSummary[];
  modifiers?: string[];
  notes?: string;
}

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'waiting_payment' | 'closed';

export interface PosTable {
  id: string;
  tableNumber: string;
  section: string;
  capacity: number;
  status: TableStatus;
  customerName?: string;
  guests?: number;
  waiter?: string;
  openTime?: string;
  orderTotal?: number;
  currentOrderId?: string;
}

export type PosOrderMode = 'dine_in' | 'take_away' | 'takeaway' | 'delivery';

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  department?: string;
  selectedModifiers?: string[];
  specialInstructions?: string;
}

export interface PosOrder {
  id: string;
  orderNumber: string;
  mode: PosOrderMode;
  tableId?: string;
  tableNumber?: string;
  customerName?: string;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  status: 'open' | 'paid' | 'cancelled';
  paymentMethod?: 'cash' | 'card' | 'split';
  createdAt: string;
  cashierName: string;
}

// -------------------------------------------------------------
// COST CONTROL & INVENTORY
// -------------------------------------------------------------
export interface CostKpi {
  title: string;
  currentPercent: number;
  targetPercent: number;
  status: 'normal' | 'warning' | 'critical';
  variancePercent: number;
  monthlyAmount: number;
}

export interface ConsumptionVariance {
  ingredientId: string;
  name: string;
  unit: string;
  theoreticalConsumption: number;
  actualConsumption: number;
  varianceQuantity: number;
  varianceValue: number;
  wasteQuantity: number;
  yieldPercent: number;
  status: 'normal' | 'warning' | 'critical';
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location: string;
  manager: string;
  totalItems: number;
  totalValue: number;
}

export interface StockBalanceItem {
  id: string;
  code: string;
  name: string;
  warehouseId: string;
  warehouseName: string;
  unit: string;
  costPerUnit: number;
  theoreticalStock: number;
  bookStock: number;
  physicalStock: number;
  variance: number;
  totalValuation: number;
  reorderPoint: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'variance_detected';
}

// -------------------------------------------------------------
// PURCHASING & SUPPLIERS
// -------------------------------------------------------------
export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  category: string;
  rating: number;
  paymentTerms: string;
  balanceDue: number;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierName: string;
  issueDate: string;
  deliveryDate: string;
  status: 'draft' | 'pending' | 'approved' | 'received' | 'invoiced' | 'paid';
  totalAmount: number;
  itemsCount: number;
}

// -------------------------------------------------------------
// FINANCE & ACCOUNTING
// -------------------------------------------------------------
export interface AccountItem {
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  balance: number;
  currency: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  sourceModule: string;
}

export interface TaxRecord {
  period: string;
  totalSales: number;
  outputVat: number;
  totalPurchases: number;
  inputVat: number;
  taxPayable: number;
  status: 'draft' | 'submitted' | 'reconciled';
  eDocReference: string;
}

// -------------------------------------------------------------
// HR & CRM
// -------------------------------------------------------------
export interface Employee {
  id: string;
  code: string;
  name: string;
  department: string;
  position: string;
  laborType: 'direct' | 'indirect';
  baseSalary: number;
  hireDate: string;
  currentShift: string;
  attendanceRate: number;
  status: 'active' | 'on_leave' | 'resigned';
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  loyaltyTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  loyaltyPoints: number;
  totalVisits: number;
  totalSpent: number;
  lastVisit: string;
  satisfactionRating: number;
  favoriteDish: string;
}

// -------------------------------------------------------------
// INTERNAL CHAT
// -------------------------------------------------------------
export interface ChatReaction {
  emoji: string;
  count: number;
}

export interface ChatChannel {
  id: string;
  name: string;
  type: 'department' | 'announcement' | 'direct';
  description: string;
  unreadCount: number;
  lastMessageSnippet: string;
  lastMessageTime: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: string;
  isCurrentUser: boolean;
  reactions?: ChatReaction[];
}

// -------------------------------------------------------------
// SYNC & CONNECTIVITY
// -------------------------------------------------------------
export type SyncStatus =
  | 'synced'
  | 'synchronizing'
  | 'offline'
  | 'sync_error'
  | 'pending_changes'
  | 'online';

export interface PendingSyncItem {
  id: string;
  type: 'POS_ORDER' | 'STOCK_MOVEMENT' | 'WASTE_ENTRY' | 'RECIPE_UPDATE' | string;
  description: string;
  timestamp: string;
  status: 'queued' | 'syncing' | 'synced' | 'failed';
}
