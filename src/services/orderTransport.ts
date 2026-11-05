/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ORDER TRANSPORT SERVICE (Phase 5)
 * Cross-tab real-time communication between QR Menu customer and Cashier/KDS.
 * 
 * // INTEGRATION POINT: Connect to real WebSocket server / Server-Sent Events (SSE) / Cloud PubSub
 * for multi-device cross-network production sync. The current local transport uses BroadcastChannel
 * with storage event fallback so customer and cashier can be tested simultaneously in two browser tabs.
 */

import { CustomerOrder, CustomerOrderStatus } from '../domain/qrMenuTypes.ts';
import { outboxService } from '../sync/outboxService.ts';
import { DeploymentMode } from '../sync/syncTypes.ts';
import { orderRepository, getStorageAdapter } from '../repositories/repositories.ts';

export type OrderTransportEventType =
  | 'ORDER_SUBMITTED'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_UPDATED'
  | 'ORDER_REJECTED';

export interface OrderTransportEvent {
  type: OrderTransportEventType;
  order: CustomerOrder;
  timestamp: string;
}

class OrderTransportService {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(event: OrderTransportEvent) => void> = new Set();
  private channelName = 'tygos_order_transport';
  private deploymentMode: DeploymentMode = 'standalone';
  private serverBaseUrl = '';

  public setDeploymentConfig(mode: DeploymentMode, serverBaseUrl = ''): void {
    this.deploymentMode = mode;
    this.serverBaseUrl = serverBaseUrl;
  }

  public getDeploymentConfig(): { mode: DeploymentMode; serverBaseUrl: string } {
    return { mode: this.deploymentMode, serverBaseUrl: this.serverBaseUrl };
  }

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.channel = new BroadcastChannel(this.channelName);
          this.channel.onmessage = (msg) => {
            if (msg.data && msg.data.type) {
              this.notifyListeners(msg.data);
            }
          };
        }
      } catch (err) {
        console.warn('BroadcastChannel not supported, falling back to storage events', err);
      }

      // Storage event fallback for cross-tab sync
      window.addEventListener('storage', (e) => {
        if (e.key === 'tygos_order_transport_event' && e.newValue) {
          try {
            const data: OrderTransportEvent = JSON.parse(e.newValue);
            this.notifyListeners(data);
          } catch {
            // ignore malformed storage payload
          }
        }
      });
    }
  }

  private notifyListeners(event: OrderTransportEvent) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in order transport listener:', err);
      }
    });
  }

  private broadcast(event: OrderTransportEvent) {
    // 1. In-process dispatch
    this.notifyListeners(event);

    // 2. BroadcastChannel dispatch (if supported)
    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch {
        // channel error fallback
      }
    }

    // 3. Storage event dispatch (triggers in other tabs of same origin)
    getStorageAdapter().setItemSync('tygos_order_transport_event', JSON.stringify(event));
  }

  // Abuse Protection: Client rate limiting (max 3 orders per minute per client)
  public checkRateLimit(): { allowed: boolean; waitSeconds?: number } {
    const now = Date.now();
    let timestamps = orderRepository.getOrderTimestamps();
    // Keep timestamps within the last 60 seconds
    timestamps = timestamps.filter((t) => now - t < 60000);

    if (timestamps.length >= 3) {
      const oldest = timestamps[0];
      const waitSeconds = Math.ceil((60000 - (now - oldest)) / 1000);
      return { allowed: false, waitSeconds };
    }

    timestamps.push(now);
    orderRepository.saveOrderTimestamps(timestamps);
    return { allowed: true };
  }

  public getOrders(establishmentId: string): CustomerOrder[] {
    return orderRepository.getAllSync(establishmentId, false);
  }

  public saveOrders(establishmentId: string, orders: CustomerOrder[]): void {
    orderRepository.saveAllSync(establishmentId, orders, false);
  }

  public getOrder(establishmentId: string, orderId: string): CustomerOrder | null {
    const orders = this.getOrders(establishmentId);
    return orders.find((o) => o.id === orderId) || null;
  }

  public async submitOrder(order: CustomerOrder): Promise<void> {
    const stampedOrder = orderRepository.upsertSync(
      order.establishmentId,
      order,
      `order:submit:${order.id}`
    );

    const event: OrderTransportEvent = {
      type: 'ORDER_SUBMITTED',
      order: stampedOrder,
      timestamp: new Date().toISOString(),
    };
    this.broadcast(event);
  }

  public async updateOrderStatus(
    establishmentId: string,
    orderId: string,
    status: CustomerOrderStatus,
    extra?: Partial<CustomerOrder>
  ): Promise<CustomerOrder | null> {
    const existing = this.getOrder(establishmentId, orderId);
    if (!existing) return null;

    const updated: CustomerOrder = {
      ...existing,
      ...extra,
      status,
      approvedAt: status === 'approved' ? new Date().toISOString() : existing.approvedAt,
      readyAt: status === 'ready' ? new Date().toISOString() : existing.readyAt,
      completedAt: status === 'completed' ? new Date().toISOString() : existing.completedAt,
    };

    const stampedUpdated = orderRepository.upsertSync(
      establishmentId,
      updated,
      `order:status:${updated.id}:${status}:${Date.now()}`
    );

    const event: OrderTransportEvent = {
      type: status === 'rejected' ? 'ORDER_REJECTED' : 'ORDER_STATUS_CHANGED',
      order: stampedUpdated,
      timestamp: new Date().toISOString(),
    };
    this.broadcast(event);
    return stampedUpdated;
  }

  public async updateStationStatus(
    establishmentId: string,
    orderId: string,
    station: any,
    stationStatus: 'pending' | 'preparing' | 'ready'
  ): Promise<CustomerOrder | null> {
    const orders = this.getOrders(establishmentId);
    const index = orders.findIndex((o) => o.id === orderId);
    if (index === -1) return null;

    const existing = orders[index];
    const newStatuses = {
      ...existing.stationStatuses,
      [station]: stationStatus,
    };

    // Check if all active stations are ready
    const allReady = Object.values(newStatuses).every((st) => st === 'ready');
    const anyPreparing = Object.values(newStatuses).some((st) => st === 'preparing');

    let overallStatus = existing.status;
    if (allReady) {
      overallStatus = 'ready';
    } else if (anyPreparing && existing.status === 'approved') {
      overallStatus = 'preparing';
    }

    const updated: CustomerOrder = {
      ...existing,
      stationStatuses: newStatuses,
      status: overallStatus,
      readyAt: allReady ? new Date().toISOString() : existing.readyAt,
    };

    orders[index] = updated;
    this.saveOrders(establishmentId, orders);

    const event: OrderTransportEvent = {
      type: 'ORDER_STATUS_CHANGED',
      order: updated,
      timestamp: new Date().toISOString(),
    };
    this.broadcast(event);
    return updated;
  }

  public subscribe(callback: (event: OrderTransportEvent) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const orderTransport = new OrderTransportService();
