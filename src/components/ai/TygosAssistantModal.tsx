/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

import { TYGOS_LOGO_SRC } from '../brand/TygosLogo.tsx';

export const TygosAssistantModal: React.FC = () => {
  const {
    isAssistantOpen,
    setIsAssistantOpen,
    assistantMessages,
    sendAssistantQuery,
    clearAssistantHistory,
    setIsSimulationModalOpen,
    setIsAccessModalOpen,
    setTargetAccessResource,
    setIsHelpOpen,
    helpArticles,
    setSelectedHelpArticle,
  } = useBusiness();
  const { currentUser, setActiveView } = useAuth();
  const role = currentUser?.role || 'tenant_admin';
  const { t, language, dir } = useI18n();
  const [inputQuery, setInputQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAr = language === 'ar';
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  useEffect(() => {
    if (isAssistantOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [assistantMessages, isAssistantOpen]);

  if (!isAssistantOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;
    sendAssistantQuery(inputQuery);
    setInputQuery('');
  };

  const handleActionClick = (actionStr?: string, queryStr?: string) => {
    if (actionStr) {
      if (actionStr.startsWith('NAV:')) {
        const view = actionStr.replace('NAV:', '');
        setActiveView(view);
        setIsAssistantOpen(false);
      } else if (actionStr === 'ACTION:simulation') {
        setIsSimulationModalOpen(true);
        setIsAssistantOpen(false);
      } else if (actionStr === 'ACTION:request_access') {
        setTargetAccessResource({
          key: 'HR_PAYROLL_MASTER',
          labelAr: 'مسير الرواتب المعتمد والبيانات المحمية',
          labelEn: 'Approved Payroll & Protected Ledger',
        });
        setIsAccessModalOpen(true);
        setIsAssistantOpen(false);
      } else if (actionStr.startsWith('ARTICLE:')) {
        const slug = actionStr.replace('ARTICLE:', '');
        const targetArticle = helpArticles.find((a) => a.slug === slug);
        if (targetArticle) {
          setSelectedHelpArticle(targetArticle);
        }
        setIsHelpOpen(true);
        setIsAssistantOpen(false);
      }
    } else if (queryStr) {
      sendAssistantQuery(queryStr);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="w-full sm:max-w-xl sm:h-[680px] h-[92vh] bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Top Header Bar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-900/60 to-slate-900 border border-cyan-500/40 flex items-center justify-center p-1 shadow-md shadow-cyan-950/50">
                <img
                  src={TYGOS_LOGO_SRC}
                  alt="Tygos AI Mark"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white">TYGOS</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  {isAr ? 'الذكاء التشغيلي الموحد' : 'Unified Intelligence'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isAr
                  ? 'مساعد الإدارة وضبط التكاليف والامتثال الأمني'
                  : 'Operational Cost Intelligence & Security Assistant'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={clearAssistantHistory}
              title={isAr ? 'مسح المحادثة' : 'Clear Chat'}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsAssistantOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
          {assistantMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                {!isUser && (
                  <div className="flex items-center gap-1.5 mb-1 ps-1">
                    <span className="font-bold text-cyan-400">TYGOS</span>
                    <span className="text-[10px] text-slate-500 font-mono" dir="ltr">
                      {msg.timestamp}
                    </span>
                  </div>
                )}

                <div
                  className={`p-3.5 rounded-2xl max-w-[88%] text-xs leading-relaxed whitespace-pre-line shadow-xs ${
                    isUser
                      ? 'bg-cyan-600 text-white rounded-br-xs'
                      : msg.isPermissionDenied
                      ? 'bg-amber-950/30 border border-amber-500/40 text-amber-200 rounded-bl-xs'
                      : 'bg-slate-800/80 border border-slate-700/70 text-slate-100 rounded-bl-xs'
                  }`}
                >
                  {msg.isPermissionDenied && (
                    <div className="flex items-center gap-2 mb-2 text-amber-400 font-bold">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{isAr ? 'تقييد الصلاحيات الأمنية' : 'Security Permission Guard'}</span>
                    </div>
                  )}

                  <p>{msg.content}</p>

                  {/* Contextual Action Buttons */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex flex-wrap gap-1.5">
                      {msg.suggestedActions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleActionClick(action.action, action.query)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                            msg.isPermissionDenied
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                              : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25'
                          }`}
                        >
                          <span>{action.label}</span>
                          <ArrowIcon className="w-3 h-3 opacity-70" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder={
              isAr
                ? 'اسأل TYGOS (مثال: ليه الـ Food Cost زاد؟ أسباب الأرباح...)'
                : 'Ask TYGOS (e.g. Why did Food Cost increase? Profit drivers...)'
            }
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim()}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
              inputQuery.trim()
                ? 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-md shadow-cyan-950/50'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Send className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          </button>
        </form>
      </div>
    </div>
  );
};
