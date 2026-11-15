/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SCHEMA VERSIONING, IDEMPOTENT MIGRATIONS, ATOMIC BACKUP/RESTORE + ROLLBACK,
 * CORRUPT DATA QUARANTINE & DATA REPAIR SERVICE (Package 6 - Section 4)
 * Strictly uses getStorageAdapter() (no raw localStorage).
 */

import { getStorageAdapter } from '../repositories/storageAdapter.ts';

export const CURRENT_SCHEMA_VERSION = 6;

export interface QuarantineRecord {
  id: string;
  key: string;
  quarantinedAt: string;
  reason: string;
  rawSnippet: string;
}

export interface MigrationReport {
  previousVersion: number;
  currentVersion: number;
  migratedSteps: string[];
  quarantinedCount: number;
  repairedCount: number;
}

export interface BackupPreview {
  valid: boolean;
  format: 'v6_full' | 'v1_legacy' | 'invalid';
  sourceVersion: number;
  exportedAt?: string;
  sourceEstablishmentId?: string;
  warnings: string[];
  counts: {
    totalKeys: number;
    materials: number;
    products: number;
    preparations: number;
    warehouses: number;
    requisitions: number;
    expenses: number;
  };
  error?: string;
}

export interface BackupImportResult {
  success: boolean;
  restoredKeys: number;
  migratedFromVersion: number;
  rolledBack: boolean;
  warnings: string[];
  error?: string;
}

export interface RepairReport {
  fixedItems: string[];
  warnings: string[];
  quarantinedCount: number;
}

const STRING_PRIMITIVE_KEYS = new Set(['schema_version']);

function computeChecksum(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function getEstablishmentKeys(estId: string): string[] {
  const storage = getStorageAdapter();
  const id = estId || 'default';
  const allKeys = storage.keysSync();
  const prefix = `tygos_${id}_`;
  const warehouseSuffix = `_${id}`;
  const warehousePrefixes = [
    'tygos_branches_',
    'tygos_warehouses_',
    'tygos_stock_movements_',
    'tygos_requisitions_',
  ];

  return allKeys.filter((k) => {
    if (k.startsWith(prefix)) return true;
    return warehousePrefixes.some((wp) => k === `${wp}${id}` || (k.startsWith(wp) && k.endsWith(warehouseSuffix)));
  });
}

function isPrimitiveKey(key: string): boolean {
  for (const s of STRING_PRIMITIVE_KEYS) {
    if (key.endsWith(`_${s}`)) return true;
  }
  return false;
}

class MigrationService {
  private versionKey(estId: string): string {
    return `tygos_${estId || 'default'}_schema_version`;
  }

  private quarantineKey(estId: string): string {
    return `tygos_${estId || 'default'}_quarantine`;
  }

  public getSchemaVersion(estId: string = 'default'): number {
    const raw = getStorageAdapter().getItemSync(this.versionKey(estId));
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
  }

  public getQuarantineRecords(estId: string = 'default'): QuarantineRecord[] {
    const raw = getStorageAdapter().getItemSync(this.quarantineKey(estId));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public clearQuarantineRecords(estId: string = 'default'): void {
    getStorageAdapter().setItemSync(this.quarantineKey(estId), JSON.stringify([]));
  }

  private quarantineCorruptKey(estId: string, key: string, raw: string, reason: string): void {
    const storage = getStorageAdapter();
    const list = this.getQuarantineRecords(estId);
    const next: QuarantineRecord[] = [
      {
        id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        key,
        quarantinedAt: new Date().toISOString(),
        reason,
        rawSnippet: raw.slice(0, 500),
      },
      ...list,
    ].slice(0, 100);
    storage.setItemSync(this.quarantineKey(estId), JSON.stringify(next));
    storage.removeItemSync(key);
  }

  /**
   * Scans establishment keys for malformed JSON, isolates into quarantine,
   * and returns count of quarantined entries.
   */
  public scanAndQuarantineCorruptJson(estId: string = 'default'): number {
    const storage = getStorageAdapter();
    const keys = getEstablishmentKeys(estId);
    let count = 0;

    for (const key of keys) {
      if (isPrimitiveKey(key) || key === this.quarantineKey(estId)) continue;
      const raw = storage.getItemSync(key);
      if (raw === null || raw === '') continue;
      try {
        JSON.parse(raw);
      } catch (err) {
        this.quarantineCorruptKey(
          estId,
          key,
          raw,
          err instanceof Error ? err.message : 'بيانات JSON تالفة'
        );
        count += 1;
      }
    }

    return count;
  }

  /**
   * Runs idempotent schema migrations from any legacy version (v1..v5) up to v6.
   */
  public migrateEstablishmentData(estId: string = 'default'): MigrationReport {
    const storage = getStorageAdapter();
    const id = estId || 'default';
    const prevVersion = this.getSchemaVersion(id);
    const migratedSteps: string[] = [];
    let repairedCount = 0;

    // Step 0: Isolate any corrupt JSON keys safely before parsing
    const quarantinedCount = this.scanAndQuarantineCorruptJson(id);

    // v1 -> v2: Normalize venue settings currency defaults for legacy demo USD
    if (prevVersion < 2) {
      const vsKey = `tygos_${id}_venue_settings`;
      const rawVs = storage.getItemSync(vsKey);
      if (rawVs) {
        try {
          const vs = JSON.parse(rawVs);
          if (vs && typeof vs === 'object') {
            let changed = false;
            if (!vs.currency || (id === 'est-1' && vs.currency === 'USD')) {
              vs.currency = 'EGP';
              changed = true;
            }
            if (changed) {
              storage.setItemSync(vsKey, JSON.stringify(vs));
              repairedCount += 1;
            }
          }
        } catch {
          // already quarantined if invalid
        }
      }
      migratedSteps.push('v1→v2: ضبط العملة الافتراضية (ج.م)');
    }

    // v2 -> v3: Ensure raw materials have isStockTracked & valid conversionFactor
    if (prevVersion < 3) {
      const matKey = `tygos_${id}_raw_materials`;
      const rawMats = storage.getItemSync(matKey);
      if (rawMats) {
        try {
          const mats = JSON.parse(rawMats);
          if (Array.isArray(mats)) {
            let changed = false;
            const next = mats.map((m) => {
              const updated = { ...m };
              if (updated.isStockTracked === undefined) {
                updated.isStockTracked = true;
                changed = true;
              }
              if (!Number.isFinite(Number(updated.conversionFactor)) || Number(updated.conversionFactor) <= 0) {
                updated.conversionFactor = 1;
                changed = true;
              }
              if (!Number.isFinite(Number(updated.purchasePrice)) || Number(updated.purchasePrice) < 0) {
                updated.purchasePrice = 0;
                changed = true;
              }
              return updated;
            });
            if (changed) {
              storage.setItemSync(matKey, JSON.stringify(next));
              repairedCount += 1;
            }
          }
        } catch {
          // ignore
        }
      }
      migratedSteps.push('v2→v3: إضافة تتبع المخزون ومعامل التحويل للخامات');
    }

    // v3 -> v4: Ensure products have lowStockThresholdPortions & recipeIngredients array
    if (prevVersion < 4) {
      const prodKey = `tygos_${id}_products`;
      const rawProds = storage.getItemSync(prodKey);
      if (rawProds) {
        try {
          const prods = JSON.parse(rawProds);
          if (Array.isArray(prods)) {
            let changed = false;
            const next = prods.map((p, idx) => {
              const updated = { ...p };
              if (updated.lowStockThresholdPortions === undefined) {
                updated.lowStockThresholdPortions = 5;
                changed = true;
              }
              if (!Array.isArray(updated.recipeIngredients)) {
                updated.recipeIngredients = [];
                changed = true;
              }
              if (!updated.code || typeof updated.code !== 'string') {
                updated.code = `PRD-${String(idx + 1).padStart(3, '0')}`;
                changed = true;
              }
              return updated;
            });
            if (changed) {
              storage.setItemSync(prodKey, JSON.stringify(next));
              repairedCount += 1;
            }
          }
        } catch {
          // ignore
        }
      }
      migratedSteps.push('v3→v4: تعيين حد التنبيه الأصفر وأكواد المنتجات');
    }

    // v4 -> v5: Ensure default warehouses exist & seed warehouseStockMap for tracked items
    if (prevVersion < 5) {
      const whKey = `tygos_warehouses_${id}`;
      const brKey = `tygos_branches_${id}`;
      const nowIso = new Date().toISOString();
      if (!storage.getItemSync(brKey)) {
        storage.setItemSync(
          brKey,
          JSON.stringify([
            {
              id: 'br-main',
              establishmentId: id,
              code: 'BR-001',
              nameAr: 'الفرع الرئيسي',
              nameEn: 'Main Branch',
              address: '',
              isMain: true,
              active: true,
              createdAt: nowIso,
              updatedAt: nowIso,
            },
          ])
        );
        repairedCount += 1;
      }
      if (!storage.getItemSync(whKey)) {
        storage.setItemSync(
          whKey,
          JSON.stringify([
            {
              id: 'wh-main',
              establishmentId: id,
              branchId: 'br-main',
              code: 'WH-001',
              nameAr: 'المخزن الرئيسي',
              nameEn: 'Main Warehouse',
              type: 'main',
              keeperIds: [],
              order: 1,
              active: true,
              createdAt: nowIso,
              updatedAt: nowIso,
            },
            {
              id: 'wh-kitchen',
              establishmentId: id,
              branchId: 'br-main',
              code: 'WH-002',
              nameAr: 'مخزن المطبخ',
              nameEn: 'Kitchen Warehouse',
              type: 'section',
              sectionType: 'kitchen',
              keeperIds: [],
              order: 2,
              active: true,
              createdAt: nowIso,
              updatedAt: nowIso,
            },
          ])
        );
        repairedCount += 1;
      }
      migratedSteps.push('v4→v5: تهيئة هيكل الفروع والمخازن الأساسية');
    }

    // v5 -> v6: Initialize overhead allocation settings & stamp version 6
    if (prevVersion < 6) {
      const ohSetKey = `tygos_${id}_overhead_settings`;
      if (!storage.getItemSync(ohSetKey)) {
        storage.setItemSync(
          ohSetKey,
          JSON.stringify({
            mode: 'activity_rules',
            fixedOverheadRatePct: 20,
            stage1Rule: 'area_sqm',
          })
        );
      }
      migratedSteps.push('v5→v6: ترقية إعدادات التكلفة الكاملة وتثبيت الإصدار 6');
    }

    storage.setItemSync(this.versionKey(id), String(CURRENT_SCHEMA_VERSION));

    return {
      previousVersion: prevVersion,
      currentVersion: CURRENT_SCHEMA_VERSION,
      migratedSteps,
      quarantinedCount,
      repairedCount,
    };
  }

  /**
   * Exports all keys belonging to the establishment into a verifiable JSON snapshot.
   */
  public exportEstablishmentBackup(estId: string = 'default'): string {
    const storage = getStorageAdapter();
    const id = estId || 'default';
    const keys = getEstablishmentKeys(id);
    const keysData: Record<string, unknown> = {};

    for (const key of keys) {
      const raw = storage.getItemSync(key);
      if (raw === null) continue;
      // Canonical relative suffix so restore works across partitions too
      let canonicalKey = key;
      if (key.startsWith(`tygos_${id}_`)) {
        canonicalKey = `part:${key.slice(`tygos_${id}_`.length)}`;
      } else if (key.endsWith(`_${id}`)) {
        canonicalKey = `wh:${key.slice(0, key.length - id.length - 1)}`;
      }

      if (isPrimitiveKey(key)) {
        keysData[canonicalKey] = raw;
      } else {
        try {
          keysData[canonicalKey] = JSON.parse(raw);
        } catch {
          keysData[canonicalKey] = raw;
        }
      }
    }

    const serializedData = JSON.stringify(keysData);
    const payload = {
      app: 'TYGOS',
      schemaVersion: this.getSchemaVersion(id),
      establishmentId: id,
      exportedAt: new Date().toISOString(),
      checksum: computeChecksum(serializedData),
      keyCount: Object.keys(keysData).length,
      keysData,
    };

    return JSON.stringify(payload, null, 2);
  }

  /**
   * Validates and summarizes a JSON backup string BEFORE mutating storage.
   */
  public previewBackupImport(jsonText: string): BackupPreview {
    const emptyCounts = {
      totalKeys: 0,
      materials: 0,
      products: 0,
      preparations: 0,
      warehouses: 0,
      requisitions: 0,
      expenses: 0,
    };

    if (!jsonText || !jsonText.trim()) {
      return {
        valid: false,
        format: 'invalid',
        sourceVersion: 0,
        warnings: [],
        counts: emptyCounts,
        error: 'ملف النسخة الاحتياطية فارغ.',
      };
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return {
        valid: false,
        format: 'invalid',
        sourceVersion: 0,
        warnings: [],
        counts: emptyCounts,
        error: 'صيغة JSON غير صالحة أو تالفة.',
      };
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        valid: false,
        format: 'invalid',
        sourceVersion: 0,
        warnings: [],
        counts: emptyCounts,
        error: 'بنية النسخة الاحتياطية غير معروفة.',
      };
    }

    // Format A: Full keysData snapshot (v2..v6)
    if (parsed.keysData && typeof parsed.keysData === 'object' && !Array.isArray(parsed.keysData)) {
      const kd = parsed.keysData as Record<string, unknown>;
      const warnings: string[] = [];
      const srcVersion = Number(parsed.schemaVersion) || 1;

      if (parsed.checksum && typeof parsed.checksum === 'string') {
        const expected = computeChecksum(JSON.stringify(kd));
        if (expected !== parsed.checksum) {
          return {
            valid: false,
            format: 'invalid',
            sourceVersion: srcVersion,
            warnings: [],
            counts: emptyCounts,
            error: 'فشل التحقق من سلامة الملف (Checksum mismatch) — الملف تم تعديله أو تلف.',
          };
        }
      }

      if (srcVersion < CURRENT_SCHEMA_VERSION) {
        warnings.push(`النسخة بإصدار أقدم (v${srcVersion}) وستتم ترقيتها تلقائياً إلى v${CURRENT_SCHEMA_VERSION}.`);
      }

      const arrLen = (v: unknown) => (Array.isArray(v) ? v.length : 0);

      return {
        valid: true,
        format: 'v6_full',
        sourceVersion: srcVersion,
        exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined,
        sourceEstablishmentId: typeof parsed.establishmentId === 'string' ? parsed.establishmentId : undefined,
        warnings,
        counts: {
          totalKeys: Object.keys(kd).length,
          materials: arrLen(kd['part:raw_materials']),
          products: arrLen(kd['part:products']),
          preparations: arrLen(kd['part:semi_finished_items']),
          warehouses: arrLen(kd['wh:tygos_warehouses']),
          requisitions: arrLen(kd['wh:tygos_requisitions']),
          expenses: arrLen(kd['part:overhead_expenses']),
        },
      };
    }

    // Format B: Legacy v1 backup ({ materials, products, audit })
    if (Array.isArray(parsed.materials) || Array.isArray(parsed.products)) {
      const warnings = ['نسخة احتياطية قديمة (الإصدار 1) — ستتم ترقيتها تلقائياً عند الاستعادة.'];
      const matLen = Array.isArray(parsed.materials) ? parsed.materials.length : 0;
      const prodLen = Array.isArray(parsed.products) ? parsed.products.length : 0;

      return {
        valid: true,
        format: 'v1_legacy',
        sourceVersion: 1,
        exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined,
        sourceEstablishmentId: typeof parsed.establishmentId === 'string' ? parsed.establishmentId : undefined,
        warnings,
        counts: {
          totalKeys: (Array.isArray(parsed.materials) ? 1 : 0) + (Array.isArray(parsed.products) ? 1 : 0),
          materials: matLen,
          products: prodLen,
          preparations: 0,
          warehouses: 0,
          requisitions: 0,
          expenses: 0,
        },
      };
    }

    return {
      valid: false,
      format: 'invalid',
      sourceVersion: 0,
      warnings: [],
      counts: emptyCounts,
      error: 'الملف لا يحتوي على بيانات منشأة صالحة.',
    };
  }

  /**
   * Restores a backup atomically with full snapshot rollback on any failure.
   */
  public importEstablishmentBackup(
    estId: string = 'default',
    jsonText: string,
    options: { simulateFailureAfterWrite?: boolean } = {}
  ): BackupImportResult {
    const storage = getStorageAdapter();
    const id = estId || 'default';
    const preview = this.previewBackupImport(jsonText);

    if (!preview.valid) {
      return {
        success: false,
        restoredKeys: 0,
        migratedFromVersion: 0,
        rolledBack: false,
        warnings: [],
        error: preview.error || 'ملف غير صالح',
      };
    }

    // 1. Capture complete rollback snapshot before modifying anything
    const existingKeys = getEstablishmentKeys(id);
    const snapshot = new Map<string, string | null>();
    for (const k of existingKeys) {
      snapshot.set(k, storage.getItemSync(k));
    }

    const rollbackNow = () => {
      const currentKeys = getEstablishmentKeys(id);
      for (const ck of currentKeys) {
        storage.removeItemSync(ck);
      }
      for (const [k, v] of snapshot.entries()) {
        if (v !== null) storage.setItemSync(k, v);
      }
    };

    try {
      const parsed = JSON.parse(jsonText) as Record<string, unknown>;
      let restoredKeys = 0;

      // Clear current partition data cleanly for v6 full restore before writing
      if (preview.format === 'v6_full') {
        for (const k of existingKeys) {
          storage.removeItemSync(k);
        }
        const kd = parsed.keysData as Record<string, unknown>;
        for (const [ckey, val] of Object.entries(kd)) {
          let actualKey = ckey;
          if (ckey.startsWith('part:')) {
            actualKey = `tygos_${id}_${ckey.slice(5)}`;
          } else if (ckey.startsWith('wh:')) {
            actualKey = `${ckey.slice(3)}_${id}`;
          }
          const strVal = typeof val === 'string' && isPrimitiveKey(actualKey) ? val : JSON.stringify(val);
          storage.setItemSync(actualKey, strVal);
          restoredKeys += 1;
        }
      } else {
        // Legacy v1
        if (Array.isArray(parsed.materials)) {
          storage.setItemSync(`tygos_${id}_raw_materials`, JSON.stringify(parsed.materials));
          restoredKeys += 1;
        }
        if (Array.isArray(parsed.products)) {
          storage.setItemSync(`tygos_${id}_products`, JSON.stringify(parsed.products));
          restoredKeys += 1;
        }
        if (Array.isArray(parsed.audit)) {
          storage.setItemSync(`tygos_${id}_audit_logs`, JSON.stringify(parsed.audit));
          restoredKeys += 1;
        }
        storage.setItemSync(this.versionKey(id), '1');
      }

      if (options.simulateFailureAfterWrite) {
        throw new Error('محاكاة فشل كتابة أثناء الاستعادة لاختبار التراجع الآمن');
      }

      // Run migrations so older backups are immediately compatible with current schema
      const mig = this.migrateEstablishmentData(id);

      return {
        success: true,
        restoredKeys,
        migratedFromVersion: preview.sourceVersion,
        rolledBack: false,
        warnings: [...preview.warnings, ...mig.migratedSteps],
      };
    } catch (err) {
      rollbackNow();
      return {
        success: false,
        restoredKeys: 0,
        migratedFromVersion: preview.sourceVersion,
        rolledBack: true,
        warnings: [],
        error: err instanceof Error ? err.message : 'حدث خطأ أثناء الاستعادة وتم التراجع للبيانات السابقة',
      };
    }
  }

  /**
   * Scans and repairs common integrity anomalies in establishment data:
   * - Quarantines corrupt JSON keys
   * - Fixes duplicate/empty product codes & negative/NaN numbers
   * - Ensures tracked raw materials have valid warehouseStockMap
   * - Strips broken null recipe lines or flags orphaned material IDs
   */
  public repairEstablishmentData(estId: string = 'default'): RepairReport {
    const storage = getStorageAdapter();
    const id = estId || 'default';
    const fixedItems: string[] = [];
    const warnings: string[] = [];

    const quarantinedCount = this.scanAndQuarantineCorruptJson(id);
    if (quarantinedCount > 0) {
      fixedItems.push(`تم عزل ${quarantinedCount} سجل JSON تالف إلى منطقة الحجر الآمن.`);
    }

    // Repair raw materials
    const matKey = `tygos_${id}_raw_materials`;
    let validMaterialIds = new Set<string>();
    const rawMatsStr = storage.getItemSync(matKey);
    if (rawMatsStr) {
      try {
        const mats = JSON.parse(rawMatsStr);
        if (Array.isArray(mats)) {
          let changed = false;
          const fixedMats = mats.map((m, idx) => {
            const next = { ...m };
            if (!next.id) {
              next.id = `mat-repaired-${idx + 1}`;
              changed = true;
            }
            validMaterialIds.add(next.id);
            if (!Number.isFinite(Number(next.purchasePrice)) || Number(next.purchasePrice) < 0) {
              next.purchasePrice = 0;
              changed = true;
            }
            if (!Number.isFinite(Number(next.effectiveUnitCost)) || Number(next.effectiveUnitCost) < 0) {
              next.effectiveUnitCost = 0;
              changed = true;
            }
            if (next.isStockTracked !== false && (!next.warehouseStockMap || typeof next.warehouseStockMap !== 'object')) {
              next.warehouseStockMap = { 'wh-main': Math.max(0, Number(next.currentStock) || 0) };
              changed = true;
            }
            return next;
          });
          if (changed) {
            storage.setItemSync(matKey, JSON.stringify(fixedMats));
            fixedItems.push('تم تصحيح الأرصدة والتكاليف ومعرفات الخرائط المخزنية للخامات.');
          }
        }
      } catch {
        // already quarantined
      }
    }

    // Collect valid semi-finished prep IDs
    const prepKey = `tygos_${id}_semi_finished_items`;
    const validPrepIds = new Set<string>();
    const rawPrepsStr = storage.getItemSync(prepKey);
    if (rawPrepsStr) {
      try {
        const preps = JSON.parse(rawPrepsStr);
        if (Array.isArray(preps)) {
          preps.forEach((pr) => {
            if (pr?.id) validPrepIds.add(pr.id);
          });
        }
      } catch {
        // ignore
      }
    }

    // Repair products: duplicate/empty codes, NaN costs, orphaned recipe references
    const prodKey = `tygos_${id}_products`;
    const rawProdsStr = storage.getItemSync(prodKey);
    if (rawProdsStr) {
      try {
        const prods = JSON.parse(rawProdsStr);
        if (Array.isArray(prods)) {
          let changed = false;
          const seenCodes = new Set<string>();
          const fixedProds = prods.map((p, idx) => {
            const next = { ...p };
            let code = String(next.code || '').trim();
            if (!code || seenCodes.has(code)) {
              code = `PRD-${String(idx + 1).padStart(3, '0')}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
              next.code = code;
              changed = true;
            }
            seenCodes.add(code);

            if (!Number.isFinite(Number(next.sellingPrice)) || Number(next.sellingPrice) < 0) {
              next.sellingPrice = 0;
              changed = true;
            }
            if (next.lowStockThresholdPortions === undefined) {
              next.lowStockThresholdPortions = 5;
              changed = true;
            }

            if (Array.isArray(next.recipeIngredients)) {
              const cleaned = next.recipeIngredients.filter((line: Record<string, unknown> | null) => {
                if (!line || !line.ingredientId) {
                  changed = true;
                  return false;
                }
                const ingId = String(line.ingredientId);
                const exists =
                  validMaterialIds.size === 0 ||
                  validMaterialIds.has(ingId) ||
                  validPrepIds.has(ingId);
                if (!exists) {
                  warnings.push(`المنتج «${next.nameAr || next.id}» يشير إلى مكوّن مفقود (${ingId}).`);
                }
                return true;
              });
              next.recipeIngredients = cleaned;
            }
            return next;
          });

          if (changed) {
            storage.setItemSync(prodKey, JSON.stringify(fixedProds));
            fixedItems.push('تم تصحيح أكواد المنتجات المكررة وتنظيف سطور الوصفات غير الصالحة.');
          }
        }
      } catch {
        // ignore
      }
    }

    // Ensure schema is at current version
    const mig = this.migrateEstablishmentData(id);
    if (mig.migratedSteps.length > 0) {
      fixedItems.push(...mig.migratedSteps);
    }

    return { fixedItems, warnings, quarantinedCount };
  }
}

export const migrationService = new MigrationService();
