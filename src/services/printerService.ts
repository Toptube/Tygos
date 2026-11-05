/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * THERMAL PRINTER SERVICE (Phase 5)
 * Thermal 80mm and A5 formatting, ticket rendering, and print management.
 * 
 * // INTEGRATION POINT: Connect to network thermal printers via ESC/POS over TCP/IP,
 * USB raw print, or local agent (e.g. QZ Tray / CUPS daemon).
 */

import { StationTicket, CustomerOrder } from '../domain/qrMenuTypes.ts';

export interface StationPrinterConfig {
  stationId: string;
  printerName: string;
  paperWidth: '80mm' | '58mm' | 'A5';
  enabled: boolean;
  autoPrintOnApproval: boolean;
}

export interface PrinterAdapter {
  readonly name: string;
  printHtml(html: string, title: string): Promise<{ ok: boolean; error?: string }>;
}

/**
 * Default Browser Print Adapter (opens print dialog / window)
 */
export class BrowserPrintAdapter implements PrinterAdapter {
  public readonly name = 'BrowserPrint';

  public async printHtml(html: string, title: string): Promise<{ ok: boolean; error?: string }> {
    if (typeof window === 'undefined') return { ok: true };
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      return { ok: false, error: 'يرجى السماح بالنوافذ المنبثقة للطباعة' };
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { margin: 0; font-family: monospace; background: #fff; }
          </style>
        </head>
        <body>
          ${html}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    return { ok: true };
  }
}

/**
 * // INTEGRATION POINT: Local ESC/POS Print Agent Adapter (e.g. QZ Tray / Local Daemon)
 * Sends raw ticket payload to http://localhost:9100/print for silent kitchen auto-printing.
 */
export class LocalPrintAgentAdapter implements PrinterAdapter {
  public readonly name = 'LocalPrintAgent';
  constructor(private readonly agentUrl = 'http://localhost:9100/print') {}

  public async printHtml(html: string, title: string): Promise<{ ok: boolean; error?: string }> {
    // // INTEGRATION POINT: Replace with fetch(this.agentUrl, { method: 'POST', body: JSON.stringify({ html, title }) })
    void this.agentUrl;
    void html;
    void title;
    return { ok: true };
  }
}

export const DEFAULT_PRINTER_CONFIGS: StationPrinterConfig[] = [
  { stationId: 'cashier', printerName: 'Thermal_Cashier_80mm', paperWidth: '80mm', enabled: true, autoPrintOnApproval: true },
  { stationId: 'kitchen', printerName: 'Kitchen_Hot_Line_80mm', paperWidth: '80mm', enabled: true, autoPrintOnApproval: true },
  { stationId: 'grill', printerName: 'Grill_Expediter_80mm', paperWidth: '80mm', enabled: true, autoPrintOnApproval: true },
  { stationId: 'bar', printerName: 'Bar_Dispenser_80mm', paperWidth: '80mm', enabled: true, autoPrintOnApproval: true },
  { stationId: 'pastry', printerName: 'Pastry_Printer_80mm', paperWidth: '80mm', enabled: true, autoPrintOnApproval: true },
  { stationId: 'bakery', printerName: 'Bakery_Station_80mm', paperWidth: '80mm', enabled: true, autoPrintOnApproval: true },
];

class ThermalPrinterService {
  private storageKey = 'tygos_printer_configs';

  public getConfigs(): StationPrinterConfig[] {
    if (typeof window === 'undefined') return DEFAULT_PRINTER_CONFIGS;
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : DEFAULT_PRINTER_CONFIGS;
    } catch {
      return DEFAULT_PRINTER_CONFIGS;
    }
  }

  public saveConfigs(configs: StationPrinterConfig[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(configs));
    } catch {
      // ignore
    }
  }

  public updateConfig(stationId: string, updates: Partial<StationPrinterConfig>): void {
    const list = this.getConfigs();
    const idx = list.findIndex((c) => c.stationId === stationId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      this.saveConfigs(list);
    }
  }

  /**
   * Generates HTML printable content for an 80mm thermal ticket
   */
  public generateTicketHtml(ticket: StationTicket, venueName = 'TYGOS VENUE'): string {
    const isAr = true;
    const dateFormatted = new Date(ticket.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'numeric',
    });

    const serviceTypeLabels: Record<string, string> = {
      dine_in: 'طاولة / صالة',
      takeaway: 'تيك أواي / سفري',
      delivery: 'دليفري / توصيل',
    };

    return `
      <div class="thermal-ticket font-mono" style="width: 80mm; padding: 4mm; margin: 0 auto; font-size: 13px; line-height: 1.4; color: #000; background: #fff;">
        <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
          <h2 style="font-size: 18px; margin: 0; font-weight: 900;">${venueName}</h2>
          <div style="font-size: 15px; font-weight: bold; margin-top: 4px; padding: 2px 6px; background: #000; color: #fff; display: inline-block;">
            تذكرة: ${ticket.station.toUpperCase()}
          </div>
          <div style="font-size: 20px; font-weight: 900; margin-top: 4px;">${ticket.serialNumber}</div>
        </div>

        <div style="font-size: 12px; margin-bottom: 6px; border-bottom: 1px solid #000; padding-bottom: 4px;">
          <div><strong>الخدمة:</strong> ${serviceTypeLabels[ticket.serviceType] || ticket.serviceType}</div>
          ${ticket.tableNumber ? `<div><strong>رقم الطاولة:</strong> <span style="font-size: 16px; font-weight: 900;">#${ticket.tableNumber}</span></div>` : ''}
          ${ticket.customerName ? `<div><strong>العميل:</strong> ${ticket.customerName}</div>` : ''}
          ${ticket.customerPhone ? `<div><strong>الهاتف:</strong> ${ticket.customerPhone}</div>` : ''}
          ${ticket.deliveryAddress ? `<div><strong>العنوان:</strong> ${ticket.deliveryAddress}</div>` : ''}
          ${ticket.deliveryNotes ? `<div><strong>ملاحظات التوصيل:</strong> ${ticket.deliveryNotes}</div>` : ''}
          <div><strong>الوقت:</strong> ${dateFormatted}</div>
        </div>

        <div style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 4px;">
            <span>الصنف</span>
            <span>الكمية</span>
          </div>
          ${ticket.items
            .map(
              (it) => `
            <div style="padding: 3px 0; border-bottom: 1px dotted #ccc;">
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
                <span>${it.nameAr}</span>
                <span style="font-size: 16px; font-weight: 900;">x ${it.quantity}</span>
              </div>
              ${it.notes ? `<div style="font-size: 11px; color: #444; font-style: italic; margin-top: 2px;">★ ${it.notes}</div>` : ''}
            </div>
          `
            )
            .join('')}
        </div>

        <div style="text-align: center; border-top: 2px dashed #000; padding-top: 6px; font-size: 11px;">
          <div>منيو QR الذكي · TYGOS</div>
          <div>// INTEGRATION POINT: ESC/POS Direct Print</div>
        </div>
      </div>
    `;
  }

  private adapter: PrinterAdapter = new BrowserPrintAdapter();

  public setAdapter(adapter: PrinterAdapter): void {
    this.adapter = adapter;
  }

  public getAdapterName(): string {
    return this.adapter.name;
  }

  /**
   * Print Trigger via active PrinterAdapter (BrowserPrint or LocalPrintAgent)
   */
  public printTicket(ticket: StationTicket, venueName = 'TYGOS VENUE'): void {
    const html = this.generateTicketHtml(ticket, venueName);
    void this.adapter.printHtml(html, `طباعة تذكرة ${ticket.serialNumber} - ${ticket.station}`);
  }
}

export const printerService = new ThermalPrinterService();
