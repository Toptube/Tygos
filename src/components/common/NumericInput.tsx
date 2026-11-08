/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUMERIC INPUT COMPONENT (Package 1 - Section 1-د)
 * Keyboard-first decimal input:
 * - inputMode="decimal"
 * - Selects all text on focus
 * - Allows clearing, backspacing, and retyping freely
 * - Normalizes Eastern Arabic numerals ٠-٩ to 0-9
 * - Validates and emits numeric value on blur
 * - Optional +/- stepper buttons alongside
 */

import React, { useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';

interface NumericInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  allowDecimals?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  unit?: string;
  showSteppers?: boolean;
  disabled?: boolean;
  id?: string;
  'data-testid'?: string;
}

export function normalizeNumberString(val: string): string {
  // Convert Eastern Arabic numerals ٠-٩ to 0-9
  return val.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)).trim();
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  allowDecimals = true,
  placeholder = '0',
  className = '',
  inputClassName = '',
  unit,
  showSteppers = false,
  disabled = false,
  id,
  'data-testid': testId,
}) => {
  const [textValue, setTextValue] = useState<string>(() => (value !== undefined && value !== null ? String(value) : '0'));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setTextValue(value !== undefined && value !== null ? String(value) : '0');
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const normalized = normalizeNumberString(raw);

    // Allow empty string, single minus, single dot for active typing
    if (normalized === '' || normalized === '-' || (allowDecimals && (normalized === '.' || normalized === '-.'))) {
      setTextValue(normalized);
      if (normalized === '') {
        onChange(min !== undefined ? min : 0);
      }
      return;
    }

    // RegEx pattern for valid numeric typing
    const pattern = allowDecimals ? /^-?\d*\.?\d*$/ : /^-?\d*$/;
    if (pattern.test(normalized)) {
      setTextValue(normalized);
      const parsed = parseFloat(normalized);
      if (!isNaN(parsed) && !normalized.endsWith('.')) {
        onChange(parsed);
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const normalized = normalizeNumberString(textValue);
    let parsed = parseFloat(normalized);

    if (isNaN(parsed)) {
      parsed = min !== undefined ? min : 0;
    }

    if (min !== undefined && parsed < min) {
      parsed = min;
    }
    if (max !== undefined && parsed > max) {
      parsed = max;
    }

    if (!allowDecimals) {
      parsed = Math.round(parsed);
    } else {
      parsed = Math.round(parsed * 1000) / 1000;
    }

    setTextValue(String(parsed));
    onChange(parsed);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    e.target.select();
  };

  const handleStep = (delta: number) => {
    if (disabled) return;
    const current = parseFloat(normalizeNumberString(textValue)) || 0;
    let next = current + delta;
    if (min !== undefined && next < min) next = min;
    if (max !== undefined && next > max) next = max;
    next = allowDecimals ? Math.round(next * 100) / 100 : Math.round(next);
    setTextValue(String(next));
    onChange(next);
  };

  return (
    <div className={`relative flex items-center gap-1 ${className}`}>
      {showSteppers && (
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || (min !== undefined && value <= min)}
          onClick={() => handleStep(-step)}
          className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center shrink-0 transition-colors"
          title="تقليل"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="relative flex-1 min-w-0">
        <input
          id={id}
          data-testid={testId}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={textValue}
          placeholder={placeholder}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all ${
            unit ? 'pe-10' : ''
          } ${inputClassName}`}
        />
        {unit && (
          <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-normal pointer-events-none">
            {unit}
          </span>
        )}
      </div>

      {showSteppers && (
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || (max !== undefined && value >= max)}
          onClick={() => handleStep(step)}
          className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center shrink-0 transition-colors"
          title="زيادة"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
