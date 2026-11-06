/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CASHIER SHIFTS, CASH DRAWER & TREASURY SERVICE (Phase 7 - Sections 3 & 4)
 * - Enforces open shift before any POS sale
 * - Tracks live cash drawer balance & movements (sale_cash, expense, cash_in, cash_out, refund_cash)
 * - Z-Report closing with denomination breakdown & open-table guard
 * - Treasury handover & deposit receipts with running treasury balance
 */

import { TenantRepository, settingsRepository } from '../repositories/repositories.ts';
import { generateUuid } from '../sync/syncTypes.ts';
import { domainEvents } from '../events/domainEvents.ts';
import { tableService } from './tableService.ts';

export type DrawerMovementType = 'sale_cash' | 'expense' | 'cash_in' | 'cash_out' | 'refund_cash';

export interface DrawerMovement {
  id: string;
  shiftId: string;
  type: DrawerMovementType;
  amount: number; // Positive for inflows, negative for outflows
  reason: string;
  orderId?: string;
  orderSerial?: string;
  actorName: string;
  timestamp: string;
}

export interface ShiftRecord {
  id: string;
  establishmentId: string;
  zReportNumber: string;
  cashierUsername: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  suggestedOpeningFloat: number;
  openingFloat: number;
  openingFloatVariance: number;
  cashSales: number;
  cardSales: number;
  walletSales: number;
  creditSales: number;
  tipsTotal: number;
  refundsTotal: number;
  cashRefunds: number;
  drawerExpenses: number;
  drawerCashIn: number;
  drawerCashOut: number;
  expectedDrawerCash: number;
  actualCountedCash?: number;
  discrepancy?: number;
  denominations?: Record<number, number>;
  ordersCount: number;
  status: 'open' | 'closed';
  depositedToTreasury?: boolean;
  treasuryDepositAmount?: number;
  retainedFloatForNextShift?: number;
  treasuryReceiptNumber?: string;
  managerOverrideNote?: string;
  movements: DrawerMovement[];
}

export interface TreasuryMovement {
  id: string;
  establishmentId: string;
  type: 'shift_deposit' | 'general_expense' | 'bank_deposit' | 'capital_in';
  amount: number; // Positive for inflows, negative for outflows
  balanceAfter: number;
  description: string;
  receiptNumber: string;
  shiftId?: string;
  zReportNumber?: string;
  receiverName: string;
  actorName: string;
  journalEntryRef?: string;
  timestamp: string;
}

class ShiftTreasuryService {
  private shiftsRepo = new TenantRepository<ShiftRecord>('shifts_v2', 'shift');
  private treasuryRepo = new TenantRepository<TreasuryMovement>('treasury_movements', 'shift');

  public getActiveShift(estId: string): ShiftRecord | null {
    const active = settingsRepository.getActiveShift<ShiftRecord>(estId);
    if (active && active.status === 'open') {
      return active;
    }
    return null;
  }

  public getLastHandoverFloat(estId: string): number {
    const lastClosed = settingsRepository.getLastClosedShift<ShiftRecord>(estId);
    if (lastClosed && typeof lastClosed.retainedFloatForNextShift === 'number') {
      return lastClosed.retainedFloatForNextShift;
    }
    const all = this.getAllShifts(estId);
    const latestClosed = all.find((s) => s.status === 'closed');
    return latestClosed?.retainedFloatForNextShift ?? 500;
  }

  public getAllShifts(estId: string): ShiftRecord[] {
    const list = this.shiftsRepo.getAllSync(estId, false);
    return [...list].sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  }

  public openShift(
    estId: string,
    params: {
      cashierUsername: string;
      cashierName: string;
      openingFloat: number;
      note?: string;
    }
  ): ShiftRecord {
    const existing = this.getActiveShift(estId);
    if (existing) {
      return existing;
    }

    const suggested = this.getLastHandoverFloat(estId);
    const openingFloat = Math.max(0, Number(params.openingFloat) || 0);
    const variance = Number((openingFloat - suggested).toFixed(2));
    const seqNum = this.getAllShifts(estId).length + 1;

    const newShift: ShiftRecord = {
      id: `shf-${generateUuid().slice(0, 8)}`,
      establishmentId: estId,
      zReportNumber: `Z-${new Date().getFullYear()}-${String(seqNum).padStart(4, '0')}`,
      cashierUsername: params.cashierUsername,
      cashierName: params.cashierName,
      openedAt: new Date().toISOString(),
      suggestedOpeningFloat: suggested,
      openingFloat,
      openingFloatVariance: variance,
      cashSales: 0,
      cardSales: 0,
      walletSales: 0,
      creditSales: 0,
      tipsTotal: 0,
      refundsTotal: 0,
      cashRefunds: 0,
      drawerExpenses: 0,
      drawerCashIn: 0,
      drawerCashOut: 0,
      expectedDrawerCash: openingFloat,
      ordersCount: 0,
      status: 'open',
      movements: [],
    };

    settingsRepository.saveActiveShift(estId, newShift);
    this.shiftsRepo.upsertSync(estId, newShift);

    domainEvents.publish({
      type: 'shift.opened',
      tenantId: estId,
      entityId: newShift.id,
      actorName: params.cashierName,
      payload: {
        shiftId: newShift.id,
        zReportNumber: newShift.zReportNumber,
        openingFloat,
        suggestedOpeningFloat: suggested,
        variance,
        note: params.note,
      },
    });

    return newShift;
  }

  private recalculateExpectedDrawer(shift: ShiftRecord): number {
    return Number(
      (
        shift.openingFloat +
        shift.cashSales +
        shift.drawerCashIn -
        shift.drawerCashOut -
        shift.drawerExpenses -
        shift.cashRefunds
      ).toFixed(2)
    );
  }

  public recordOrderPaymentInShift(
    estId: string,
    params: {
      orderId: string;
      orderSerial: string;
      netCashToDrawer: number;
      cardAmount: number;
      walletAmount: number;
      creditAmount: number;
      tipAmount: number;
      actorName: string;
    }
  ): ShiftRecord | null {
    const shift = this.getActiveShift(estId);
    if (!shift) return null;

    const updated: ShiftRecord = {
      ...shift,
      cashSales: Number((shift.cashSales + params.netCashToDrawer).toFixed(2)),
      cardSales: Number((shift.cardSales + params.cardAmount).toFixed(2)),
      walletSales: Number((shift.walletSales + params.walletAmount).toFixed(2)),
      creditSales: Number((shift.creditSales + params.creditAmount).toFixed(2)),
      tipsTotal: Number((shift.tipsTotal + params.tipAmount).toFixed(2)),
      ordersCount: shift.ordersCount + 1,
      movements: [...shift.movements],
    };

    if (params.netCashToDrawer > 0) {
      const mov: DrawerMovement = {
        id: `mov-${generateUuid().slice(0, 8)}`,
        shiftId: shift.id,
        type: 'sale_cash',
        amount: params.netCashToDrawer,
        reason: `مبيعات نقدية فاتورة ${params.orderSerial}`,
        orderId: params.orderId,
        orderSerial: params.orderSerial,
        actorName: params.actorName,
        timestamp: new Date().toISOString(),
      };
      updated.movements.unshift(mov);
    }

    updated.expectedDrawerCash = this.recalculateExpectedDrawer(updated);
    settingsRepository.saveActiveShift(estId, updated);
    this.shiftsRepo.upsertSync(estId, updated);
    return updated;
  }

  public recordDrawerMovement(
    estId: string,
    params: {
      type: DrawerMovementType;
      amount: number;
      reason: string;
      orderId?: string;
      orderSerial?: string;
      actorName: string;
    }
  ): ShiftRecord {
    const shift = this.getActiveShift(estId);
    if (!shift) {
      throw new Error('NO_OPEN_SHIFT');
    }

    const absAmount = Math.abs(Number(params.amount) || 0);
    if (absAmount <= 0) {
      throw new Error('INVALID_AMOUNT');
    }

    const isOutflow =
      params.type === 'expense' || params.type === 'cash_out' || params.type === 'refund_cash';
    const signedAmount = isOutflow ? -absAmount : absAmount;

    const mov: DrawerMovement = {
      id: `mov-${generateUuid().slice(0, 8)}`,
      shiftId: shift.id,
      type: params.type,
      amount: signedAmount,
      reason: params.reason.trim(),
      orderId: params.orderId,
      orderSerial: params.orderSerial,
      actorName: params.actorName,
      timestamp: new Date().toISOString(),
    };

    const updated: ShiftRecord = {
      ...shift,
      drawerExpenses:
        params.type === 'expense'
          ? Number((shift.drawerExpenses + absAmount).toFixed(2))
          : shift.drawerExpenses,
      drawerCashIn:
        params.type === 'cash_in'
          ? Number((shift.drawerCashIn + absAmount).toFixed(2))
          : shift.drawerCashIn,
      drawerCashOut:
        params.type === 'cash_out'
          ? Number((shift.drawerCashOut + absAmount).toFixed(2))
          : shift.drawerCashOut,
      cashRefunds:
        params.type === 'refund_cash'
          ? Number((shift.cashRefunds + absAmount).toFixed(2))
          : shift.cashRefunds,
      refundsTotal:
        params.type === 'refund_cash'
          ? Number((shift.refundsTotal + absAmount).toFixed(2))
          : shift.refundsTotal,
      movements: [mov, ...shift.movements],
    };

    updated.expectedDrawerCash = this.recalculateExpectedDrawer(updated);
    settingsRepository.saveActiveShift(estId, updated);
    this.shiftsRepo.upsertSync(estId, updated);

    domainEvents.publish({
      type: 'cash.drawer_movement',
      tenantId: estId,
      entityId: mov.id,
      actorName: params.actorName,
      payload: {
        shiftId: shift.id,
        movement: mov,
        expectedDrawerCash: updated.expectedDrawerCash,
      },
    });

    return updated;
  }

  public closeShift(
    estId: string,
    params: {
      actualCountedCash: number;
      denominations?: Record<number, number>;
      managerOverrideNote?: string;
      actorName: string;
      actorRole: string;
    }
  ): ShiftRecord {
    const shift = this.getActiveShift(estId);
    if (!shift) {
      throw new Error('NO_OPEN_SHIFT');
    }

    const openTables = tableService.getOpenTables(estId);
    if (openTables.length > 0 && !params.managerOverrideNote?.trim()) {
      throw new Error('OPEN_TABLES_EXIST');
    }

    const actual = Number(params.actualCountedCash) || 0;
    const expected = this.recalculateExpectedDrawer(shift);
    const discrepancy = Number((actual - expected).toFixed(2));

    const closedShift: ShiftRecord = {
      ...shift,
      closedAt: new Date().toISOString(),
      expectedDrawerCash: expected,
      actualCountedCash: actual,
      discrepancy,
      denominations: params.denominations,
      managerOverrideNote: params.managerOverrideNote,
      status: 'closed',
    };

    settingsRepository.closeActiveShift(estId, closedShift);
    this.shiftsRepo.upsertSync(estId, closedShift);

    domainEvents.publish({
      type: 'shift.closed',
      tenantId: estId,
      entityId: closedShift.id,
      actorName: params.actorName,
      actorRole: params.actorRole,
      payload: {
        shiftId: closedShift.id,
        zReportNumber: closedShift.zReportNumber,
        expectedDrawerCash: expected,
        actualCountedCash: actual,
        discrepancy,
        totalSales: Number(
          (
            closedShift.cashSales +
            closedShift.cardSales +
            closedShift.walletSales +
            closedShift.creditSales
          ).toFixed(2)
        ),
      },
    });

    return closedShift;
  }

  public depositShiftToTreasury(
    estId: string,
    params: {
      shiftId: string;
      depositAmount: number;
      retainedFloatForNextShift: number;
      receiverName: string;
      actorName: string;
    }
  ): { shift: ShiftRecord; treasuryMovement: TreasuryMovement } {
    const shift = this.shiftsRepo.getByIdSync(estId, params.shiftId);
    if (!shift) {
      throw new Error('SHIFT_NOT_FOUND');
    }

    const depositAmount = Math.max(0, Number(params.depositAmount) || 0);
    const retainedFloat = Math.max(0, Number(params.retainedFloatForNextShift) || 0);
    const currentBalance = this.getTreasuryBalance(estId);
    const newBalance = Number((currentBalance + depositAmount).toFixed(2));
    const receiptNo = `TR-${new Date().getFullYear()}-${String(
      this.getTreasuryMovements(estId).length + 1
    ).padStart(4, '0')}`;

    const updatedShift: ShiftRecord = {
      ...shift,
      depositedToTreasury: true,
      treasuryDepositAmount: depositAmount,
      retainedFloatForNextShift: retainedFloat,
      treasuryReceiptNumber: receiptNo,
    };

    this.shiftsRepo.upsertSync(estId, updatedShift);
    settingsRepository.closeActiveShift(estId, updatedShift);

    const movement: TreasuryMovement = {
      id: `trs-${generateUuid().slice(0, 8)}`,
      establishmentId: estId,
      type: 'shift_deposit',
      amount: depositAmount,
      balanceAfter: newBalance,
      description: `توريد نقدية وردية ${shift.zReportNumber} (كاشير: ${shift.cashierName})`,
      receiptNumber: receiptNo,
      shiftId: shift.id,
      zReportNumber: shift.zReportNumber,
      receiverName: params.receiverName.trim() || 'أمين الخزينة',
      actorName: params.actorName,
      journalEntryRef: `JV-${receiptNo}`,
      timestamp: new Date().toISOString(),
    };

    this.treasuryRepo.upsertSync(estId, movement);

    domainEvents.publish({
      type: 'cash.deposited',
      tenantId: estId,
      entityId: movement.id,
      actorName: params.actorName,
      payload: {
        shiftId: shift.id,
        zReportNumber: shift.zReportNumber,
        depositAmount,
        retainedFloatForNextShift: retainedFloat,
        treasuryBalanceAfter: newBalance,
        receiptNumber: receiptNo,
        receiverName: movement.receiverName,
      },
    });

    return { shift: updatedShift, treasuryMovement: movement };
  }

  public recordTreasuryTransaction(
    estId: string,
    params: {
      type: 'general_expense' | 'bank_deposit' | 'capital_in';
      amount: number;
      description: string;
      receiverName: string;
      actorName: string;
    }
  ): TreasuryMovement {
    const absAmount = Math.abs(Number(params.amount) || 0);
    if (absAmount <= 0) throw new Error('INVALID_AMOUNT');

    const signed = params.type === 'capital_in' ? absAmount : -absAmount;
    const currentBalance = this.getTreasuryBalance(estId);
    const newBalance = Number((currentBalance + signed).toFixed(2));
    const receiptNo = `TR-${new Date().getFullYear()}-${String(
      this.getTreasuryMovements(estId).length + 1
    ).padStart(4, '0')}`;

    const movement: TreasuryMovement = {
      id: `trs-${generateUuid().slice(0, 8)}`,
      establishmentId: estId,
      type: params.type,
      amount: signed,
      balanceAfter: newBalance,
      description: params.description.trim(),
      receiptNumber: receiptNo,
      receiverName: params.receiverName.trim() || 'الإدارة المالية',
      actorName: params.actorName,
      journalEntryRef: `JV-${receiptNo}`,
      timestamp: new Date().toISOString(),
    };

    this.treasuryRepo.upsertSync(estId, movement);
    return movement;
  }

  public getTreasuryMovements(estId: string): TreasuryMovement[] {
    const list = this.treasuryRepo.getAllSync(estId, false);
    return [...list].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  public getTreasuryBalance(estId: string): number {
    const list = this.getTreasuryMovements(estId);
    if (list.length === 0) return 0;
    return list[0].balanceAfter;
  }
}

export const shiftTreasuryService = new ShiftTreasuryService();
