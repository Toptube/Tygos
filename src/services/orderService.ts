/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * UNIFIED ORDER LIFECYCLE & PAYMENT TRANSACTION SERVICE (Phase 7 - Sections 2, 3, 6 & 7)
 * Single state machine: draft -> sent -> preparing -> ready -> served -> paid -> closed (or cancelled / refunded)
 * Coordinates: OrderRepository, OrderTransport (KDS), TableService, ShiftTreasuryService,
 * CustomerService, DataService (Audit & Inventory), and DomainEvents.
 */

import {
  CustomerOrder,
  CustomerOrderItem,
  CustomerOrderStatus,
  PrepStation,
} from '../domain/qrMenuTypes.ts';
import { orderRepository, rawMaterialRepository } from '../repositories/repositories.ts';
import { orderTransport } from './orderTransport.ts';
import { tableService } from './tableService.ts';
import { shiftTreasuryService } from './shiftTreasuryService.ts';
import { customerService, Coupon, calculateOrderDiscounts } from './customerService.ts';
import { dataService } from './dataService.ts';
import { warehouseService } from './warehouseService.ts';
import { productAvailabilityService } from './productAvailabilityService.ts';
import { domainEvents } from '../events/domainEvents.ts';
import { calculateTax } from '../domain/formulas.ts';
import { generateUuid } from '../sync/syncTypes.ts';

export type PaymentMethodType = 'cash' | 'card' | 'wallet' | 'credit' | 'split';

export interface SplitPaymentPart {
  method: 'cash' | 'card' | 'wallet' | 'credit';
  amount: number;
}

export interface PaymentTransactionInput {
  orderId: string;
  method: PaymentMethodType;
  cashReceived?: number;
  tipAmount?: number;
  splitParts?: SplitPaymentPart[];
  actorName: string;
  actorRole: string;
}

export interface PaymentTransactionResult {
  order: CustomerOrder;
  netCashToDrawer: number;
  changeDue: number;
  cardAmount: number;
  walletAmount: number;
  creditAmount: number;
  tipAmount: number;
  journalEntryId: string;
}

class OrderService {
  /**
   * Computes order totals from items, discount/coupon/loyalty, service charge, and tax.
   */
  public calculateTotals(params: {
    items: CustomerOrderItem[];
    manualDiscountAmount?: number;
    coupon?: Coupon | null;
    loyaltyPointsToRedeem?: number;
    customerAvailablePoints?: number;
    serviceChargePct?: number;
    taxRatePct?: number;
    isTaxInclusive?: boolean;
    deliveryFee?: number;
  }) {
    const subtotal = Number(
      params.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)
    );

    const promo = calculateOrderDiscounts({
      subtotal,
      coupon: params.coupon,
      loyaltyPointsToRedeem: params.loyaltyPointsToRedeem,
      customerAvailablePoints: params.customerAvailablePoints,
    });

    const manualDisc = Math.max(0, Number(params.manualDiscountAmount) || 0);
    const totalDiscount = Number(Math.min(subtotal, promo.totalDiscount + manualDisc).toFixed(2));
    const netSubtotal = Number(Math.max(0, subtotal - totalDiscount).toFixed(2));

    const serviceChargeAmount = Number(
      ((netSubtotal * (params.serviceChargePct || 0)) / 100).toFixed(2)
    );
    const taxableBase = Number((netSubtotal + serviceChargeAmount).toFixed(2));
    const taxRes = calculateTax(
      taxableBase,
      params.taxRatePct ?? 14,
      Boolean(params.isTaxInclusive)
    );
    const deliveryFee = Math.max(0, Number(params.deliveryFee) || 0);
    const totalAmount = Number((taxRes.totalWithTax + deliveryFee).toFixed(2));

    return {
      subtotal,
      couponDiscount: promo.couponDiscount,
      loyaltyDiscount: promo.loyaltyDiscount,
      totalDiscount,
      netSubtotal,
      serviceChargeAmount,
      taxAmount: taxRes.taxAmount,
      deliveryFee,
      totalAmount,
    };
  }

  /**
   * Save & Send to Kitchen/Bar/Grill Stations:
   * - Requires an open shift for POS orders
   * - Sends ONLY new items (lineStatus !== 'sent' && lineStatus !== 'preparing' && lineStatus !== 'ready')
   * - Marks sent items as 'sent' (locked quantity unless manager cancels)
   * - Marks subsequent additions with isAddition: true
   */
  public async saveAndSend(
    estId: string,
    orderInput: Omit<CustomerOrder, 'id' | 'serialNumber' | 'createdAt' | 'status'> & {
      id?: string;
      serialNumber?: string;
      createdAt?: string;
    },
    actorName = 'كاشير'
  ): Promise<CustomerOrder> {
    const activeShift = shiftTreasuryService.getActiveShift(estId);
    if (!activeShift) {
      throw new Error('NO_OPEN_SHIFT');
    }

    const existing = orderInput.id ? orderRepository.getByIdSync(estId, orderInput.id) : null;
    const isAddition = Boolean(existing && existing.items.some((i) => i.lineStatus && i.lineStatus !== 'new'));

    const newItemsToSend = orderInput.items.filter(
      (i) => !i.lineStatus || i.lineStatus === 'new'
    );

    const updatedItems: CustomerOrderItem[] = orderInput.items.map((item) => ({
      ...item,
      lineStatus: !item.lineStatus || item.lineStatus === 'new' ? 'sent' : item.lineStatus,
    }));

    // Build station statuses for stations involved in this order
    const stationStatuses: Partial<Record<PrepStation, 'pending' | 'preparing' | 'ready'>> = {
      ...(existing?.stationStatuses || {}),
    };
    for (const item of newItemsToSend) {
      stationStatuses[item.station] = 'pending';
    }

    const orderId = existing?.id || orderInput.id || generateUuid();
    const serialNumber =
      existing?.serialNumber ||
      orderInput.serialNumber ||
      orderRepository.getNextSerial(estId, false);

    const orderToSave: CustomerOrder = {
      ...orderInput,
      id: orderId,
      serialNumber,
      establishmentId: estId,
      items: updatedItems,
      status: 'sent',
      stationStatuses,
      isAddition,
      additionCount: isAddition ? (existing?.additionCount || 0) + 1 : 0,
      shiftId: activeShift.id,
      createdAt: existing?.createdAt || orderInput.createdAt || new Date().toISOString(),
      approvedAt: existing?.approvedAt || new Date().toISOString(),
    };

    const saved = orderRepository.upsertSync(estId, orderToSave);

    // Occupy table if dine_in
    if (saved.serviceType === 'dine_in' && saved.tableNumber) {
      const tbl = tableService.getTableByNumber(estId, saved.tableNumber);
      if (tbl) {
        tableService.occupyTable(
          estId,
          tbl.id,
          saved.id,
          saved.serialNumber,
          saved.totalAmount,
          saved.guestCount || 2
        );
      }
    }

    // Broadcast to KDS / Stations (only new items in the ticket payload if addition)
    const kdsOrderPayload: CustomerOrder = {
      ...saved,
      items: newItemsToSend.length > 0 ? newItemsToSend : saved.items,
    };
    await orderTransport.submitOrder(kdsOrderPayload);

    domainEvents.publish({
      type: 'order.sent',
      tenantId: estId,
      entityId: saved.id,
      actorName,
      payload: {
        orderId: saved.id,
        serialNumber: saved.serialNumber,
        tableNumber: saved.tableNumber,
        isAddition,
        newItemsCount: newItemsToSend.length,
        totalAmount: saved.totalAmount,
      },
    });

    return saved;
  }

  /**
   * Hold order as draft without sending to stations.
   */
  public holdOrder(
    estId: string,
    orderInput: Omit<CustomerOrder, 'id' | 'serialNumber' | 'createdAt' | 'status'> & {
      id?: string;
      serialNumber?: string;
      createdAt?: string;
    }
  ): CustomerOrder {
    const existing = orderInput.id ? orderRepository.getByIdSync(estId, orderInput.id) : null;
    const orderId = existing?.id || orderInput.id || generateUuid();
    const serialNumber =
      existing?.serialNumber ||
      orderInput.serialNumber ||
      orderRepository.getNextSerial(estId, false);

    const draftOrder: CustomerOrder = {
      ...orderInput,
      id: orderId,
      serialNumber,
      establishmentId: estId,
      status: 'draft',
      createdAt: existing?.createdAt || orderInput.createdAt || new Date().toISOString(),
    };

    const saved = orderRepository.upsertSync(estId, draftOrder);
    if (saved.serviceType === 'dine_in' && saved.tableNumber) {
      const tbl = tableService.getTableByNumber(estId, saved.tableNumber);
      if (tbl) {
        tableService.occupyTable(estId, tbl.id, saved.id, saved.serialNumber, saved.totalAmount);
      }
    }
    return saved;
  }

  /**
   * Cancel a previously sent item (requires manager permission + reason + notifies KDS).
   */
  public async cancelSentItem(
    estId: string,
    orderId: string,
    itemIndex: number,
    reason: string,
    actorName: string
  ): Promise<CustomerOrder | null> {
    const order = orderRepository.getByIdSync(estId, orderId);
    if (!order) return null;

    const removedItem = order.items[itemIndex];
    const nextItems = order.items.filter((_, idx) => idx !== itemIndex);
    const totals = this.calculateTotals({ items: nextItems });

    const updated: CustomerOrder = {
      ...order,
      items: nextItems,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
    };

    const saved = orderRepository.upsertSync(estId, updated);
    await dataService.logAudit(
      estId,
      'إلغاء صنف مُرسل للمطبخ',
      `تم إلغاء [${removedItem?.nameAr}] من الفاتورة ${order.serialNumber} — السبب: ${reason}`,
      'pos',
      actorName
    );
    return saved;
  }

  /**
   * Transfer an open table order to another available table.
   */
  public transferTable(estId: string, orderId: string, targetTableId: string): CustomerOrder | null {
    const order = orderRepository.getByIdSync(estId, orderId);
    const targetTbl = tableService.getTableById(estId, targetTableId);
    if (!order || !targetTbl) return null;

    if (order.tableNumber) {
      const oldTbl = tableService.getTableByNumber(estId, order.tableNumber);
      if (oldTbl) tableService.releaseTable(estId, oldTbl.id);
    }

    const updated: CustomerOrder = {
      ...order,
      tableNumber: String(targetTbl.number),
    };
    const saved = orderRepository.upsertSync(estId, updated);
    tableService.occupyTable(estId, targetTbl.id, saved.id, saved.serialNumber, saved.totalAmount);
    return saved;
  }

  /**
   * Merge source order into target order and release source table.
   */
  public mergeOrders(estId: string, sourceOrderId: string, targetOrderId: string): CustomerOrder | null {
    const source = orderRepository.getByIdSync(estId, sourceOrderId);
    const target = orderRepository.getByIdSync(estId, targetOrderId);
    if (!source || !target || source.id === target.id) return null;

    const mergedItems = [...target.items, ...source.items];
    const totals = this.calculateTotals({ items: mergedItems });

    const updatedTarget: CustomerOrder = {
      ...target,
      items: mergedItems,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
    };
    const savedTarget = orderRepository.upsertSync(estId, updatedTarget);

    if (source.tableNumber) {
      const srcTbl = tableService.getTableByNumber(estId, source.tableNumber);
      if (srcTbl) tableService.releaseTable(estId, srcTbl.id);
    }
    orderRepository.upsertSync(estId, {
      ...source,
      status: 'cancelled',
      rejectionReason: `تم الدمج مع الفاتورة ${target.serialNumber}`,
    });

    if (savedTarget.tableNumber) {
      const tgtTbl = tableService.getTableByNumber(estId, savedTarget.tableNumber);
      if (tgtTbl) {
        tableService.occupyTable(
          estId,
          tgtTbl.id,
          savedTarget.id,
          savedTarget.serialNumber,
          savedTarget.totalAmount
        );
      }
    }

    return savedTarget;
  }

  /**
   * Update order lifecycle status (preparing -> ready -> served -> paid -> closed / cancelled).
   */
  public async transitionStatus(
    estId: string,
    orderId: string,
    nextStatus: CustomerOrderStatus,
    extra?: Partial<CustomerOrder>
  ): Promise<CustomerOrder | null> {
    const existing = orderRepository.getByIdSync(estId, orderId);
    if (!existing) return null;

    const updated: CustomerOrder = {
      ...existing,
      ...extra,
      status: nextStatus,
      readyAt: nextStatus === 'ready' ? new Date().toISOString() : existing.readyAt,
      completedAt:
        nextStatus === 'closed' || nextStatus === 'completed'
          ? new Date().toISOString()
          : existing.completedAt,
    };

    const saved = orderRepository.upsertSync(estId, updated);
    await orderTransport.updateOrderStatus(estId, orderId, nextStatus, extra);

    if (nextStatus === 'cancelled' && saved.tableNumber) {
      const tbl = tableService.getTableByNumber(estId, saved.tableNumber);
      if (tbl) tableService.releaseTable(estId, tbl.id);
      domainEvents.publish({
        type: 'order.cancelled',
        tenantId: estId,
        entityId: saved.id,
        payload: { orderId: saved.id, serialNumber: saved.serialNumber, reason: extra?.rejectionReason },
      });
    }

    return saved;
  }

  /**
   * Update a specific station's ticket status from KDS and sync item lineStatus + domainEvents.
   */
  public async updateStationTicketStatus(
    estId: string,
    orderId: string,
    station: PrepStation,
    stationStatus: 'pending' | 'preparing' | 'ready'
  ): Promise<CustomerOrder | null> {
    await orderTransport.updateStationStatus(estId, orderId, station, stationStatus);
    const existing = orderRepository.getByIdSync(estId, orderId);
    if (!existing) return null;

    const updatedItems = existing.items.map((item) =>
      item.station === station
        ? {
            ...item,
            lineStatus:
              stationStatus === 'ready'
                ? ('ready' as const)
                : stationStatus === 'preparing'
                ? ('preparing' as const)
                : item.lineStatus,
          }
        : item
    );

    const nextStationStatuses = {
      ...(existing.stationStatuses || {}),
      [station]: stationStatus,
    };

    const allReady = Object.values(nextStationStatuses).every((s) => s === 'ready');
    const anyPreparing = Object.values(nextStationStatuses).some(
      (s) => s === 'preparing' || s === 'ready'
    );

    const nextOrderStatus: CustomerOrderStatus = allReady
      ? 'ready'
      : anyPreparing && (existing.status === 'sent' || existing.status === 'approved')
      ? 'preparing'
      : existing.status;

    const saved = orderRepository.upsertSync(estId, {
      ...existing,
      items: updatedItems,
      stationStatuses: nextStationStatuses,
      status: nextOrderStatus,
      readyAt: allReady ? new Date().toISOString() : existing.readyAt,
    });

    domainEvents.publish({
      type: 'order.station_updated',
      tenantId: estId,
      entityId: saved.id,
      payload: {
        orderId: saved.id,
        serialNumber: saved.serialNumber,
        station,
        stationStatus,
        orderStatus: saved.status,
        allReady,
      },
    });

    return saved;
  }

  /**
   * Atomic Checkout Transaction (Section 3):
   * 1. Closes invoice & releases table
   * 2. Adds NET cash (excluding change) to active shift cash drawer
   * 3. Records non-cash payments (card, wallet, credit)
   * 4. Deducts theoretical inventory & logs COGS + double-entry journal
   * 5. Updates customer profile & loyalty points
   * 6. Logs audit trail & publishes 'order.paid' event
   */
  public async processPaymentTransaction(
    estId: string,
    input: PaymentTransactionInput
  ): Promise<PaymentTransactionResult> {
    const activeShift = shiftTreasuryService.getActiveShift(estId);
    if (!activeShift) {
      throw new Error('NO_OPEN_SHIFT');
    }

    const order = orderRepository.getByIdSync(estId, input.orderId);
    if (!order) {
      throw new Error('ORDER_NOT_FOUND');
    }

    const tipAmount = Math.max(0, Number(input.tipAmount) || 0);
    const grandDue = Number((order.totalAmount + tipAmount).toFixed(2));

    let cashApplied = 0;
    let cardAmount = 0;
    let walletAmount = 0;
    let creditAmount = 0;
    let changeDue = 0;

    if (input.method === 'cash') {
      const received = Math.max(grandDue, Number(input.cashReceived ?? grandDue));
      changeDue = Number(Math.max(0, received - grandDue).toFixed(2));
      cashApplied = grandDue;
    } else if (input.method === 'card') {
      cardAmount = grandDue;
    } else if (input.method === 'wallet') {
      walletAmount = grandDue;
    } else if (input.method === 'credit') {
      creditAmount = grandDue;
    } else if (input.method === 'split' && input.splitParts) {
      for (const part of input.splitParts) {
        if (part.method === 'cash') cashApplied += part.amount;
        if (part.method === 'card') cardAmount += part.amount;
        if (part.method === 'wallet') walletAmount += part.amount;
        if (part.method === 'credit') creditAmount += part.amount;
      }
      const totalPaid = cashApplied + cardAmount + walletAmount + creditAmount;
      if (totalPaid > grandDue && cashApplied > 0) {
        const excess = Number((totalPaid - grandDue).toFixed(2));
        changeDue = excess;
        cashApplied = Number(Math.max(0, cashApplied - excess).toFixed(2));
      }
    }

    const netCashToDrawer = Number(cashApplied.toFixed(2));
    const journalEntryId = `JV-${order.serialNumber.replace('#', '')}`;

    // 1. Update order status to 'paid' / 'closed'
    const paidOrder: CustomerOrder = {
      ...order,
      status: 'paid',
      paymentMethod: input.method,
      tipAmount,
      paidAmount: grandDue,
      changeDue,
      journalEntryId,
      shiftId: activeShift.id,
      completedAt: new Date().toISOString(),
    };
    const savedOrder = orderRepository.upsertSync(estId, paidOrder);

    // 2. Release table
    if (savedOrder.tableNumber) {
      const tbl = tableService.getTableByNumber(estId, savedOrder.tableNumber);
      if (tbl) {
        tableService.releaseTable(estId, tbl.id);
      }
    }

    // 3. Update shift cash drawer & payment totals
    shiftTreasuryService.recordOrderPaymentInShift(estId, {
      orderId: savedOrder.id,
      orderSerial: savedOrder.serialNumber,
      netCashToDrawer,
      cardAmount,
      walletAmount,
      creditAmount,
      tipAmount,
      actorName: input.actorName,
    });

    // 4. Deduct theoretical inventory from SECTION warehouse & calculate COGS
    const products = await dataService.getProducts(estId);
    let totalCogs = 0;
    for (const item of savedOrder.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        totalCogs += prod.trueCost * item.quantity;

        // Deduct from manual batch counter if enabled (e.g. croissants)
        if (prod.enableBatchStock) {
          productAvailabilityService.deductBatchStockOnSale(estId, prod.id, item.quantity);
        }

        for (const ing of prod.recipeIngredients) {
          warehouseService.deductSalesStock(
            estId,
            ing.ingredientId,
            prod.prepStation || 'kitchen',
            ing.quantity * item.quantity,
            savedOrder.serialNumber,
            input.actorName || 'كاشير'
          );
        }
      }
    }
    totalCogs = Number(totalCogs.toFixed(2));

    // 5. Update customer profile & loyalty points
    if (savedOrder.customerPhone) {
      await customerService.findOrCreateByPhone(estId, {
        name: savedOrder.customerName || 'عميل',
        phone: savedOrder.customerPhone,
        addressDescription: savedOrder.deliveryAddress,
        orderTotal: savedOrder.totalAmount,
        pointsEarned: Math.floor(savedOrder.totalAmount),
      });
    }

    // 6. Audit log & DomainEvent
    await dataService.logAudit(
      estId,
      'تحصيل فاتورة مبيعات',
      `فاتورة ${savedOrder.serialNumber} بقيمة ${savedOrder.totalAmount} (${input.method}) — صافي للدرج: ${netCashToDrawer} — قيد: ${journalEntryId}`,
      'pos',
      input.actorName
    );

    domainEvents.publish({
      type: 'order.paid',
      tenantId: estId,
      entityId: savedOrder.id,
      actorName: input.actorName,
      actorRole: input.actorRole,
      payload: {
        orderId: savedOrder.id,
        serialNumber: savedOrder.serialNumber,
        method: input.method,
        totalAmount: savedOrder.totalAmount,
        taxAmount: savedOrder.taxAmount,
        tipAmount,
        netCashToDrawer,
        changeDue,
        cardAmount,
        walletAmount,
        creditAmount,
        cogsAmount: totalCogs,
        journalEntryId,
        shiftId: activeShift.id,
      },
    });

    return {
      order: savedOrder,
      netCashToDrawer,
      changeDue,
      cardAmount,
      walletAmount,
      creditAmount,
      tipAmount,
      journalEntryId,
    };
  }

  /**
   * Manager-authorized refund after payment (reverses drawer cash, inventory, and ledger).
   */
  public async refundPaidOrder(
    estId: string,
    orderId: string,
    reason: string,
    actorName: string
  ): Promise<CustomerOrder | null> {
    const order = orderRepository.getByIdSync(estId, orderId);
    if (!order) return null;

    if (order.paymentMethod === 'cash' || (order.paidAmount && order.paymentMethod === 'split')) {
      shiftTreasuryService.recordDrawerMovement(estId, {
        type: 'refund_cash',
        amount: order.totalAmount,
        reason: `مرتجع فاتورة ${order.serialNumber}: ${reason}`,
        orderId: order.id,
        orderSerial: order.serialNumber,
        actorName,
      });
    }

    const refunded = orderRepository.upsertSync(estId, {
      ...order,
      status: 'refunded',
      rejectionReason: reason,
    });

    domainEvents.publish({
      type: 'order.refunded',
      tenantId: estId,
      entityId: refunded.id,
      actorName,
      payload: {
        orderId: refunded.id,
        serialNumber: refunded.serialNumber,
        amount: refunded.totalAmount,
        reason,
      },
    });

    return refunded;
  }
}

export const orderService = new OrderService();
