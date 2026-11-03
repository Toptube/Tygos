/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AuditEvent,
  HrIncidentBridge,
  PrivilegedAccessRequest,
  SecurityNotification,
} from '../domain/types.ts';
import { UserRole } from '../types/index.ts';

// Initial Mock Audit Log
export const INITIAL_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'aud-9801',
    timestamp: '2026-11-03 09:14:22',
    userUsername: 'chef_marco',
    userFullName: 'Marco Bellini',
    userRole: 'kitchen_manager',
    action: 'RECIPE_VERSION_CREATE',
    entity: 'Recipe',
    entityId: 'REC-001',
    beforeSnapshot: 'Version V1.0 (Portion Cost: $7.85)',
    afterSnapshot: 'Version V2.0 (Portion Cost: $8.40)',
    deviceFingerprint: 'POS-Terminal-KDS-02 (iPadOS 18.1)',
    ipAddress: '192.168.10.45',
    sessionId: 'sess-kds-0981a',
    reason: 'Updated ribeye supplier market price index to $31.50/kg',
    result: 'SUCCESS',
  },
  {
    id: 'aud-9802',
    timestamp: '2026-11-03 10:45:10',
    userUsername: 'sami_waiter',
    userFullName: 'Sami Mansoor',
    userRole: 'waiter',
    action: 'HR_SENSITIVE_DATA_ATTEMPT',
    entity: 'PayrollMaster',
    entityId: 'FIN-PAYROLL-NOV26',
    deviceFingerprint: 'Handheld-POS-04 (Android 14)',
    ipAddress: '192.168.10.112',
    sessionId: 'sess-waiter-3312',
    reason: 'Attempted to query general manager compensation records via assistant',
    result: 'DENIED',
    isSuspicious: true,
  },
  {
    id: 'aud-9803',
    timestamp: '2026-11-03 11:20:05',
    userUsername: 'ahmed_gm',
    userFullName: 'Ahmed Al-Mansoor',
    userRole: 'general_manager',
    action: 'INVENTORY_ADJUSTMENT',
    entity: 'WarehouseStock',
    entityId: 'WH-CENTRAL-ING-001',
    beforeSnapshot: 'Stock: 48.5 kg',
    afterSnapshot: 'Stock: 46.2 kg',
    deviceFingerprint: 'Admin-MacBook-Air (macOS 15.0)',
    ipAddress: '192.168.10.10',
    sessionId: 'sess-gm-8841c',
    reason: 'Reconciled monthly butcher prep trim variance (-2.3 kg)',
    result: 'SUCCESS',
  },
];

export const INITIAL_PRIVILEGED_REQUESTS: PrivilegedAccessRequest[] = [
  {
    id: 'req-001',
    requesterUsername: 'sami_waiter',
    requesterName: 'Sami Mansoor',
    requesterRole: 'waiter',
    targetResource: 'HR_PAYROLL_MASTER',
    targetResourceLabelAr: 'مسير الرواتب المعتمد للمنشأة',
    targetResourceLabelEn: 'Approved Establishment Payroll Register',
    justificationReason: 'استفسار عن احتساب نسبة مسبح رسوم الخدمة 12% لشهر نوفمبر',
    requestedDurationMinutes: 15,
    requestTimestamp: '2026-11-03 10:46:00',
    status: 'pending',
    auditEventId: 'aud-9802',
  },
];

export const INITIAL_SECURITY_NOTIFICATIONS: SecurityNotification[] = [
  {
    id: 'notif-001',
    timestamp: '2026-11-03 10:46:05',
    titleAr: 'طلب تصعيد صلاحيات أمنية مؤقتة',
    titleEn: 'Temporary Privileged Access Request',
    messageAr: 'قام المستخدم سامي منصور (نادل) بطلب تصريح مؤقت للاطلاع على سجلات الرواتب لسبب: مراجعة نسبة رسم الخدمة.',
    messageEn: 'User Sami Mansoor (Waiter) requested temporary privileged access to Payroll records for service charge review.',
    severity: 'warning',
    isRead: false,
    relatedRequestId: 'req-001',
  },
];

export const INITIAL_HR_INCIDENTS: HrIncidentBridge[] = [
  {
    id: 'inc-001',
    incidentNumber: 'HR-SEC-2026-001',
    employeeCode: 'EMP-004',
    employeeName: 'Sami Mansoor',
    securityAuditId: 'aud-9802',
    incidentType: 'unauthorized_access_attempt',
    titleAr: 'محاولة استعلام غير مصرح بها عن بيانات الرواتب',
    titleEn: 'Unauthorized Payroll Inquiry Escalation',
    notesAr: 'تم توجيه الموظف لطلب مستند احتساب مسبح الخدمة رسمياً من قسم الموارد البشرية دون محاولة الوصول للسجلات المالية العامة.',
    notesEn: 'Employee coached to submit formal service charge verification form directly to HR rather than seeking financial records access.',
    reviewedByHrUser: 'Layla Al-Otaibi (HR Manager)',
    createdAt: '2026-11-03 11:00:00',
    status: 'closed_no_action',
  },
];

/**
 * Generate a Cryptographic-Style Temporary Limited Session Token
 */
export function generateTemporaryPrivilegeSession(
  requesterUsername: string,
  targetResource: string,
  durationMinutes: number
): { sessionId: string; expiresAt: string } {
  const nonce = Math.random().toString(36).substring(2, 9).toUpperCase();
  const sessionId = `TYGOS-PRIV-${nonce}-${Date.now().toString(36).toUpperCase()}`;
  const expiryDate = new Date(Date.now() + durationMinutes * 60 * 1000);
  const expiresAt = expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return { sessionId, expiresAt };
}
