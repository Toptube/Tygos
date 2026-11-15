/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SCREEN ERROR BOUNDARY (Package 6 - Section 3)
 * Wraps the active module screen so any unexpected rendering crash displays a
 * friendly Arabic RTL recovery card instead of a blank white screen, and logs
 * full diagnostics locally via errorLogService.
 */

import React from 'react';
import { AlertTriangle, Copy, RotateCcw, ArrowRight, Check } from 'lucide-react';
import { Button } from './Button.tsx';
import { errorLogService } from '../../services/errorLogService.ts';

interface ScreenErrorBoundaryProps {
  viewId: string;
  establishmentId: string;
  onGoHome: () => void;
  children: React.ReactNode;
}

interface ScreenErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  errorStack: string;
  copied: boolean;
}

export class ScreenErrorBoundary extends React.Component<
  ScreenErrorBoundaryProps,
  ScreenErrorBoundaryState
> {
  constructor(props: ScreenErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      errorStack: '',
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ScreenErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage: error?.message || 'حدث خطأ غير متوقع أثناء عرض هذه الشاشة',
      errorStack: error?.stack || '',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    errorLogService.logError(this.props.establishmentId, {
      viewId: this.props.viewId,
      message: error?.message || 'خطأ في تصيير الشاشة',
      stack: error?.stack,
      componentStack: errorInfo?.componentStack || undefined,
      source: 'error_boundary',
    });
  }

  componentDidUpdate(prevProps: ScreenErrorBoundaryProps): void {
    if (prevProps.viewId !== this.props.viewId && this.state.hasError) {
      this.setState({
        hasError: false,
        errorMessage: '',
        errorStack: '',
        copied: false,
      });
    }
  }

  handleCopyDetails = () => {
    const details = [
      `الشاشة: ${this.props.viewId}`,
      `الوقت: ${new Date().toISOString()}`,
      `الرسالة: ${this.state.errorMessage}`,
      this.state.errorStack ? `التفاصيل:\n${this.state.errorStack}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(details).catch(() => {});
    }
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2500);
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        className="max-w-xl mx-auto my-8 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-sm text-center space-y-4"
        dir="rtl"
        data-testid="screen-error-boundary-fallback"
      >
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            حدث عطل غير متوقع في هذه الشاشة
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            تم حفظ تفاصيل المشكلة تلقائياً في سجل الأخطاء للمتابعة دون أن تتأثر بيانات منشأتك. يمكنك الرجوع للرئيسية أو نسخ التفاصيل لإرسالها للدعم الفني.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-start text-xs font-mono text-rose-700 dark:text-rose-300 break-words">
          {this.state.errorMessage}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              this.setState({ hasError: false, errorMessage: '', errorStack: '' });
              this.props.onGoHome();
            }}
            data-testid="error-boundary-back-btn"
            className="gap-1.5 font-bold"
          >
            <ArrowRight className="w-4 h-4" />
            <span>رجوع للرئيسية</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false, errorMessage: '', errorStack: '' })}
            className="gap-1.5 font-bold"
          >
            <RotateCcw className="w-4 h-4" />
            <span>إعادة المحاولة</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={this.handleCopyDetails}
            data-testid="error-boundary-copy-btn"
            className="gap-1.5 font-bold"
          >
            {this.state.copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>{this.state.copied ? 'تم النسخ ✓' : 'نسخ تفاصيل الخطأ'}</span>
          </Button>
        </div>
      </div>
    );
  }
}
