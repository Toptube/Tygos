/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MULTI-LEVEL UNIT CHAIN & PACKAGING CONVERSION SERVICE (Package 2 - Section 2)
 *
 * Packaging Hierarchy:
 * Major Storage Unit (كرتونة / شوال / جركن / صندوق)
 *  └── Sub-Unit (علبة / كيس / زجاجة / برطمان)
 *       └── Base Measurement Unit (جرام / مل / قطعة)
 *
 * Rules:
 * - Internal system storage is ALWAYS in the smallest base unit (g, ml, pc).
 * - POS sales and Recipes consume in base units (g, ml, pc).
 * - Warehouses operate in Major or Sub units (cartons, boxes, cans).
 * - Sections display balances in mixed compound units («2 كرتونة و 2 علبة و 500 مل»).
 * - Immediate keyboard numeric typing converts automatically (e.g. 2 cans = 1400 ml).
 */

import { RawMaterialItem } from './dataService.ts';

export interface MultiUnitBreakdown {
  majorQty: number;
  subQty: number;
  baseQty: number;
  majorUnitName: string;
  subUnitName: string;
  baseUnitName: string;
  totalBase: number;
  formattedMixed: string;
}

export class MultiUnitService {
  /**
   * Calculates the capacity of 1 Major Unit in Base Units.
   */
  public getMajorUnitInBase(material: Partial<RawMaterialItem>): number {
    const subCapacity = material.subUnitCapacity || 1;
    const majorCapacity = material.majorUnitCapacity || 1;
    return majorCapacity * subCapacity;
  }

  /**
   * Calculates the capacity of 1 Sub Unit in Base Units.
   */
  public getSubUnitInBase(material: Partial<RawMaterialItem>): number {
    return material.subUnitCapacity || 1;
  }

  /**
   * Converts any quantity entered in major, sub, or base unit into base units.
   * Example: 2 cans of 700ml -> 1400ml.
   * Example: 1 carton of 12 cans (700ml each) -> 8400ml.
   */
  public convertToBase(
    quantity: number,
    unitType: 'major' | 'sub' | 'base',
    material: Partial<RawMaterialItem>
  ): number {
    const qty = Math.max(0, quantity || 0);

    if (unitType === 'major') {
      const majInBase = this.getMajorUnitInBase(material);
      return Math.round(qty * majInBase * 1000) / 1000;
    }

    if (unitType === 'sub') {
      const subInBase = this.getSubUnitInBase(material);
      return Math.round(qty * subInBase * 1000) / 1000;
    }

    return Math.round(qty * 1000) / 1000;
  }

  /**
   * Converts a base unit quantity into a specific target unit.
   */
  public convertFromBase(
    baseQuantity: number,
    targetUnitType: 'major' | 'sub' | 'base',
    material: Partial<RawMaterialItem>
  ): number {
    const base = Math.max(0, baseQuantity || 0);

    if (targetUnitType === 'major') {
      const majInBase = this.getMajorUnitInBase(material);
      return majInBase > 0 ? Math.round((base / majInBase) * 100) / 100 : base;
    }

    if (targetUnitType === 'sub') {
      const subInBase = this.getSubUnitInBase(material);
      return subInBase > 0 ? Math.round((base / subInBase) * 100) / 100 : base;
    }

    return Math.round(base * 1000) / 1000;
  }

  /**
   * Decomposes a base quantity into compound mixed units:
   * (e.g. 15900 ml with carton=12 cans & can=700ml -> 1 carton, 10 cans, 500 ml).
   */
  public decomposeToCompoundUnits(
    baseQuantity: number,
    material: Partial<RawMaterialItem>
  ): MultiUnitBreakdown {
    const totalBase = Math.round((baseQuantity || 0) * 1000) / 1000;
    const baseUnitName = material.baseUnit || material.consumptionUnit || 'قطعة';
    const subUnitName = material.subUnit || '';
    const majorUnitName = material.majorUnit || '';

    // If no multi-level packaging defined, return simple base
    if (!material.subUnit || !material.subUnitCapacity) {
      return {
        majorQty: 0,
        subQty: 0,
        baseQty: totalBase,
        majorUnitName,
        subUnitName,
        baseUnitName,
        totalBase,
        formattedMixed: `${totalBase.toLocaleString('ar-EG-u-nu-latn')} ${baseUnitName}`,
      };
    }

    const subCap = Math.max(1, material.subUnitCapacity || 1);
    const majMultiplier = Math.max(1, material.majorUnitCapacity || 1);
    const majCap = majMultiplier * subCap;

    const hasMajor = Boolean(material.majorUnit && material.majorUnitCapacity);

    let majorQty = 0;
    let remainder = totalBase;

    if (hasMajor && majCap > 0) {
      majorQty = Math.floor(remainder / majCap);
      remainder = remainder % majCap;
    }

    const subQty = Math.floor(remainder / subCap);
    const baseQty = Math.round((remainder % subCap) * 1000) / 1000;

    // Compose Arabic readable string
    const parts: string[] = [];

    if (majorQty > 0 && majorUnitName) {
      parts.push(`${majorQty} ${majorUnitName}`);
    }

    if (subQty > 0 && subUnitName) {
      parts.push(`${subQty} ${subUnitName}`);
    }

    if (baseQty > 0 || parts.length === 0) {
      parts.push(`${baseQty.toLocaleString('ar-EG-u-nu-latn')} ${baseUnitName}`);
    }

    const formattedMixed = parts.join(' و ');

    return {
      majorQty,
      subQty,
      baseQty,
      majorUnitName,
      subUnitName,
      baseUnitName,
      totalBase,
      formattedMixed,
    };
  }

  /**
   * Helper to format mixed units string directly.
   */
  public formatMixed(
    baseQuantity: number,
    material: Partial<RawMaterialItem>
  ): string {
    return this.decomposeToCompoundUnits(baseQuantity, material).formattedMixed;
  }

  /**
   * Generates live examples for the units configuration modal.
   */
  public getConversionExamples(material: Partial<RawMaterialItem>): Array<{
    title: string;
    description: string;
  }> {
    const baseUnit = material.baseUnit || material.consumptionUnit || 'جم';
    const subUnit = material.subUnit || 'علبة';
    const subCap = material.subUnitCapacity || 1;
    const majorUnit = material.majorUnit || 'كرتونة';
    const majMult = material.majorUnitCapacity || 1;
    const majCap = majMult * subCap;

    return [
      {
        title: `العبوة الصغرى (${subUnit})`,
        description: `كل 1 ${subUnit} = ${subCap.toLocaleString('ar-EG-u-nu-latn')} ${baseUnit}`,
      },
      {
        title: `العبوة الكبرى (${majorUnit})`,
        description: `كل 1 ${majorUnit} = ${majMult} ${subUnit} = ${majCap.toLocaleString('ar-EG-u-nu-latn')} ${baseUnit}`,
      },
      {
        title: 'مثال التحويل عند الإدخال',
        description: `إدخال «2 ${subUnit}» يحولها النظام تلقائياً إلى ${(2 * subCap).toLocaleString('ar-EG-u-nu-latn')} ${baseUnit}.`,
      },
      {
        title: 'مثال العرض المركب في الأقسام',
        description: `رصيد ${(majCap + 2 * subCap + Math.round(subCap / 2)).toLocaleString('ar-EG-u-nu-latn')} ${baseUnit} يظهر على الشاشة: «1 ${majorUnit} و 2 ${subUnit} و ${Math.round(subCap / 2).toLocaleString('ar-EG-u-nu-latn')} ${baseUnit}».`,
      },
    ];
  }
}

export const multiUnitService = new MultiUnitService();
