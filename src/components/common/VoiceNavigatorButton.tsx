/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VOICE COMMAND NAVIGATOR (التنقل بالأوامر الصوتية)
 * Uses browser Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 * Directly connected to SCREEN_REGISTRY to navigate hands-free without third-party APIs.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button.tsx';
import { Mic, MicOff, Volume2, AlertCircle, Sparkles } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { findMatchingScreens } from '../../services/screenRegistry.ts';

export const VoiceNavigatorButton: React.FC = () => {
  const { language } = useI18n();
  const isAr = language === 'ar';
  const { currentUser, setActiveView } = useAuth();
  const { setIsAddIngredientModalOpen, setIsAddProductModalOpen, setIsImportDataModalOpen } = useBusiness();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = isAr ? 'ar-EG' : 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setFeedbackMessage(isAr ? 'تحدث الآن... (مثال: "افتح المخزون" أو "أضف خامة")' : 'Listening... (e.g. "open pos" or "add raw material")');
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      handleCommand(text);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setFeedbackMessage(isAr ? 'تعذر التعرف على الصوت، يرجى المحاولة ثانية.' : 'Could not recognize speech, please try again.');
      setTimeout(() => setFeedbackMessage(null), 3000);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [isAr]);

  const handleCommand = (rawText: string) => {
    const text = rawText.toLowerCase().trim();

    // Check direct action commands
    if (text.includes('اضف خامه') || text.includes('خامه جديده') || text.includes('add ingredient')) {
      setIsAddIngredientModalOpen(true);
      setFeedbackMessage(isAr ? 'تم فتح نافذة إضافة خامة' : 'Opened Add Raw Material');
      setTimeout(() => setFeedbackMessage(null), 2500);
      return;
    }

    if (text.includes('اضف منتج') || text.includes('وصفه جديده') || text.includes('add product')) {
      setIsAddProductModalOpen(true);
      setFeedbackMessage(isAr ? 'تم فتح معالج بناء الصنف والوصفة' : 'Opened Product Wizard');
      setTimeout(() => setFeedbackMessage(null), 2500);
      return;
    }

    if (text.includes('استيراد') || text.includes('اكسيل') || text.includes('import')) {
      setIsImportDataModalOpen(true);
      setFeedbackMessage(isAr ? 'تم فتح مساحة الاستيراد' : 'Opened Import Workspace');
      setTimeout(() => setFeedbackMessage(null), 2500);
      return;
    }

    // Dynamic match against central Screen Registry
    const matched = findMatchingScreens(text, currentUser?.role);
    if (matched.length > 0) {
      const screen = matched[0];
      setActiveView(screen.viewId);
      setFeedbackMessage(
        isAr ? `جاري الانتقال إلى ${screen.nameAr}...` : `Navigating to ${screen.nameEn}...`
      );
      setTimeout(() => setFeedbackMessage(null), 2500);
    } else {
      setFeedbackMessage(
        isAr ? `لم أفهم الأمر: "${rawText}". جرّب: "افتح الكاشير" أو "المخزون"` : `Unrecognized: "${rawText}". Try: "open pos" or "inventory"`
      );
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  };

  const toggleListening = () => {
    if (!isSupported) {
      setFeedbackMessage(
        isAr
          ? 'المتصفح الحالي لا يدعم الأوامر الصوتية المباشرة، يمكنك استخدام البحث (⌘K).'
          : 'Speech recognition is not supported in this browser, use search (⌘K).'
      );
      setTimeout(() => setFeedbackMessage(null), 4000);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
      } catch {
        // Fallback
      }
    }
  };

  return (
    <div className="relative">
      <Button
        type="button"
        onClick={toggleListening}
        className={`p-2 rounded-xl border transition-all cursor-pointer relative ${
          isListening
            ? 'bg-rose-500/20 border-rose-500 text-rose-500 animate-pulse'
            : 'text-slate-500 dark:text-slate-400 hover:text-cyan-500 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850'
        }`}
        title={isAr ? 'التنقل بالأوامر الصوتية (انقر وتحدث)' : 'Voice Command Navigator (Click & Speak)'}
        aria-label="Voice Navigation"
      >
        <Mic className="w-4 h-4" />
        {isListening && (
          <span className="absolute -top-1 -end-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
        )}
      </Button>

      {/* Spoken Feedback Popover */}
      {feedbackMessage && (
        <div className="absolute end-0 top-12 z-50 w-64 p-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 shadow-2xl text-xs animate-fade-in pointer-events-none">
          <div className="flex items-center gap-1.5 font-bold text-cyan-400 mb-1">
            <Volume2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'الأمر الصوتي' : 'Voice Assistant'}</span>
          </div>
          <p className="text-[11px] text-slate-300">{feedbackMessage}</p>
          <div className="text-[9px] text-slate-500 mt-1">
            {isAr ? 'خصوصية: لا يتم إرسال أي صوت لخوادمنا' : 'Privacy: Audio processed by local browser'}
          </div>
        </div>
      )}
    </div>
  );
};
