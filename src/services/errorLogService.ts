/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CLIENT ERROR LOG SERVICE (Package 6 - Section 3)
 * Captures React Error Boundary crashes and runtime console/window errors
 * locally per establishment via the unified StorageAdapter (never raw localStorage).
 */

import { getStorageAdapter } from '../repositories/storageAdapter.ts';

export interface ClientErrorRecord {
  id: string;
  establishmentId: string;
  timestamp: string;
  viewId: string;
  message: string;
  stack?: string;
  componentStack?: string;
  source: 'error_boundary' | 'window_error' | 'unhandled_rejection' | 'inspector';
  deviceInfo: string;
}

const MAX_ERROR_RECORDS = 200;

class ErrorLogService {
  private getKey(estId: string): string {
    return `tygos_${estId || 'default'}_error_logs`;
  }

  public getErrors(estId: string = 'default'): ClientErrorRecord[] {
    const storage = getStorageAdapter();
    const raw = storage.getItemSync(this.getKey(estId));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public logError(
    estId: string = 'default',
    payload: {
      viewId: string;
      message: string;
      stack?: string;
      componentStack?: string;
      source?: ClientErrorRecord['source'];
    }
  ): ClientErrorRecord {
    const storage = getStorageAdapter();
    const list = this.getErrors(estId);

    const width = typeof window !== 'undefined' ? window.innerWidth : 0;
    const height = typeof window !== 'undefined' ? window.innerHeight : 0;
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';

    const record: ClientErrorRecord = {
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      establishmentId: estId || 'default',
      timestamp: new Date().toISOString(),
      viewId: payload.viewId || 'unknown',
      message: payload.message || 'خطأ غير معروف',
      stack: payload.stack?.slice(0, 2000),
      componentStack: payload.componentStack?.slice(0, 2000),
      source: payload.source || 'error_boundary',
      deviceInfo: `${width}×${height} | ${ua.slice(0, 120)}`,
    };

    const next = [record, ...list].slice(0, MAX_ERROR_RECORDS);
    storage.setItemSync(this.getKey(estId), JSON.stringify(next));
    return record;
  }

  public clearErrors(estId: string = 'default'): void {
    const storage = getStorageAdapter();
    storage.setItemSync(this.getKey(estId), JSON.stringify([]));
  }

  public formatErrorsReport(estId: string = 'default'): string {
    const list = this.getErrors(estId);
    if (list.length === 0) return 'لا توجد أخطاء مسجلة للمنشأة.';
    return list
      .map(
        (e, i) =>
          `${i + 1}. [${e.timestamp}] الشاشة: ${e.viewId} (${e.source})\n   الرسالة: ${e.message}\n   الجهاز: ${e.deviceInfo}${
            e.stack ? `\n   التتبع:\n   ${e.stack.split('\n').slice(0, 4).join('\n   ')}` : ''
          }`
      )
      .join('\n\n');
  }
}

export const errorLogService = new ErrorLogService();
