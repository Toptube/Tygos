/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Paperclip,
  Smile,
  Hash,
  Users,
  Bell,
  CheckCheck,
  Search,
} from 'lucide-react';
import { MOCK_CHAT_CHANNELS, MOCK_CHAT_MESSAGES } from '../../data/mockData.ts';
import { ChatChannel, ChatMessage } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

export const InternalChatModule: React.FC = () => {
  const { currentUser } = useAuth();
  const { t, dir } = useI18n();
  const [channels, setChannels] = useState<ChatChannel[]>(MOCK_CHAT_CHANNELS);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('ch-kitchen');
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(MOCK_CHAT_MESSAGES);
  const [inputText, setInputText] = useState('');

  const activeChannel = channels.find((c) => c.id === selectedChannelId) || channels[0];
  const currentMessages = messages[selectedChannelId] || [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      channelId: selectedChannelId,
      senderName: currentUser?.fullName || 'Current User',
      senderRole: currentUser?.role.replace('_', ' ').toUpperCase() || 'Staff',
      content: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isCurrentUser: true,
    };

    setMessages((prev) => ({
      ...prev,
      [selectedChannelId]: [...(prev[selectedChannelId] || []), newMsg],
    }));

    setInputText('');
  };

  const handleAddReaction = (msgId: string, emoji: string) => {
    setMessages((prev) => {
      const channelMsgs = prev[selectedChannelId] || [];
      return {
        ...prev,
        [selectedChannelId]: channelMsgs.map((m) => {
          if (m.id === msgId) {
            const existing = m.reactions?.find((r) => r.emoji === emoji);
            const reactions = existing
              ? m.reactions?.map((r) =>
                  r.emoji === emoji ? { ...r, count: r.count + 1 } : r
                )
              : [...(m.reactions || []), { emoji, count: 1 }];
            return { ...m, reactions };
          }
          return m;
        }),
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('chat.title', 'Internal Hospitality Communications')}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t('chat.subtitle', 'Departmental dispatch channels, hot-line order calls, shift handovers, and executive announcements.')}
        </p>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[600px]">
        {/* Sidebar: Channels List */}
        <div className="md:col-span-4 border-e border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('chat.staffChannels', 'Staff Channels')}
              </span>
              <span className="text-[10px] text-cyan-500 font-mono">
                {t('chat.realtime', 'Real-time')}
              </span>
            </div>

            <div className="p-2 space-y-1">
              {channels.map((ch) => {
                const isSelected = selectedChannelId === ch.id;
                return (
                  <div
                    key={ch.id}
                    onClick={() => setSelectedChannelId(ch.id)}
                    className={`p-2.5 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-500/40 text-slate-900 dark:text-white'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="text-xs font-bold">{ch.name}</span>
                      </div>
                      {ch.unreadCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-bold flex items-center justify-center font-mono" dir="ltr">
                          {ch.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 truncate ps-6">
                      {ch.lastMessageSnippet}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              {t('chat.signedInAs', 'Signed in as:')} <strong>{currentUser?.fullName}</strong>
            </span>
            <span className="text-emerald-400 font-mono">{t('chat.online', 'Online')}</span>
          </div>
        </div>

        {/* Main Chat View */}
        <div className="md:col-span-8 flex flex-col justify-between h-full bg-slate-50/50 dark:bg-slate-950/30">
          {/* Channel Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {activeChannel.name}
                </h3>
                <p className="text-[11px] text-slate-500">{activeChannel.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Users className="w-3.5 h-3.5" />
              <span>{t('chat.allStaffNotice', 'All Kitchen & Service Staff')}</span>
            </div>
          </div>

          {/* Message Stream */}
          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            {currentMessages.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-400">
                <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                <p>{t('chat.noMessages', 'No messages yet in this channel.')}</p>
                <p className="text-[11px] text-slate-500">
                  {t('chat.noMessagesDesc', 'Send a briefing or table status update below.')}
                </p>
              </div>
            ) : (
              currentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.isCurrentUser ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-baseline gap-2 mb-1 text-[11px]">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {msg.senderName}
                    </span>
                    <span className="text-[10px] text-cyan-500 uppercase font-mono">
                      {msg.senderRole}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                      {msg.timestamp}
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-2xl max-w-md text-xs relative group ${
                      msg.isCurrentUser
                        ? 'bg-cyan-600 text-white rounded-br-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-bl-xs shadow-xs'
                    }`}
                  >
                    <p className="leading-relaxed">{msg.content}</p>

                    {/* Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        {msg.reactions.map((r, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20 text-white flex items-center gap-1 font-mono"
                            dir="ltr"
                          >
                            <span>{r.emoji}</span>
                            <span>{r.count}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Quick Reaction Bar on Hover */}
                    <div className="absolute top-1 end-2 hidden group-hover:flex items-center gap-1 bg-slate-900/90 text-white px-2 py-0.5 rounded-full text-xs shadow-md">
                      <button
                        onClick={() => handleAddReaction(msg.id, '👍')}
                        className="hover:scale-125 transition-transform cursor-pointer"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => handleAddReaction(msg.id, '🔥')}
                        className="hover:scale-125 transition-transform cursor-pointer"
                      >
                        🔥
                      </button>
                      <button
                        onClick={() => handleAddReaction(msg.id, '✅')}
                        className="hover:scale-125 transition-transform cursor-pointer"
                      >
                        ✅
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input Box */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={`${t('chat.sendPlaceholder', 'Type a message...')} (${activeChannel.name})`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                inputText.trim()
                  ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
