/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MANDATORY PASSWORD CHANGE MODAL
 * Displayed when user logs in with mustChangePasswordOnLogin: true
 * (e.g., after an admin sets a one-time 6-digit random PIN).
 * Non-dismissible until a valid personal password or PIN is set.
 */

import React, { useState } from 'react';
import { Button } from './Button.tsx';
import { KeyRound, ShieldAlert, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';

export const MandatoryPasswordChangeModal: React.FC = () => {
  const { currentUser, resetUserPassword } = useAuth();
  const { language, dir } = useI18n();
  const { showToast } = useToast();
  const isAr = language === 'ar';

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!currentUser?.mustChangePasswordOnLogin) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPass.length < 4) {
      setErrorMsg(isAr ? 'كلمة المرور يجب أن تكون 4 خانات على الأقل' : 'Password must be at least 4 characters');
      return;
    }
    if (newPass !== confirmPass) {
      setErrorMsg(isAr ? 'كلمة المرور وتأكيدها غير متطابقين' : 'Passwords do not match');
      return;
    }

    resetUserPassword(currentUser.id, newPass, false);
    showToast({
      title: isAr ? 'تم حفظ كلمة المرور الشخصية بنجاح' : 'Personal password saved successfully',
      type: 'success',
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
      dir={dir}
      role="dialog"
      aria-modal="true"
      data-testid="mandatory-password-change-modal"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            {isAr ? 'تعيين كلمة المرور الشخصية' : 'Set Your Personal Password'}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {isAr
              ? `مرحباً ${currentUser.fullName}، تم تعيين رمز دخول مؤقت لحسابك بواسطة الإدارة. يُرجى تعيين كلمة مرور أو PIN شخصي جديد خاص بك لمتابعة الدخول.`
              : `Welcome ${currentUser.fullName}, a temporary entry credential was assigned by admin. Please configure your new personal password or PIN.`}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              {isAr ? 'كلمة المرور أو PIN الجديد:' : 'New Password or PIN:'}
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder={isAr ? 'أدخل 4 خانات على الأقل...' : 'Enter at least 4 characters...'}
                dir="ltr"
                className="w-full ps-3 pe-10 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                autoFocus
                data-testid="new-mandatory-password-input"
              />
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setShowPass(!showPass)}
                className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-slate-400"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              {isAr ? 'تأكيد كلمة المرور أو PIN:' : 'Confirm Password or PIN:'}
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder={isAr ? 'أعد إدخال الرمز لتأكيده...' : 'Re-enter to confirm...'}
              dir="ltr"
              className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
              data-testid="confirm-mandatory-password-input"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            data-testid="save-mandatory-password-button"
          >
            <Check className="w-4 h-4" />
            <span>{isAr ? 'حفظ ومتابعة الدخول للمنظومة' : 'Save & Continue'}</span>
          </Button>
        </form>
      </div>
    </div>
  );
};
