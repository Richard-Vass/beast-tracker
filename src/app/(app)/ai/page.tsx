'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Icons } from '@/components/Icons';
import type { AIMessage, UserProfile } from '@/types';

type View = 'chat' | 'generator';

export default function AIPage() {
  const { user } = useAuth();
  const [view, setView] = useState<View>('chat');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data } = await db.profiles.getAll();
      if (data?.[0]) setProfile(data[0]);

      // Load last conversation
      const convRes = await db.aiConversations.getAll('limit=1');
      if (convRes.data?.[0]) {
        setMessages(convRes.data[0].messages || []);
      }
    }
    load();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading || !user) return;
    const userMsg: AIMessage = { role: 'user', content: input.trim(), ts: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          context: {
            name: profile?.name,
            age: profile?.age,
            height: profile?.height,
            weight: profile?.current_weight,
            goal: profile?.goal,
            experience: profile?.experience,
          },
        }),
      });

      const data = await res.json();
      const assistantMsg: AIMessage = {
        role: 'assistant',
        content: data.reply || data.error || 'Chyba',
        ts: new Date().toISOString(),
      };
      const allMessages = [...newMessages, assistantMsg];
      setMessages(allMessages);

      // Save conversation
      const existingConv = await db.aiConversations.getAll('limit=1');
      if (existingConv.data?.[0]) {
        await db.aiConversations.update(existingConv.data[0].id, { messages: allMessages });
      } else {
        await db.aiConversations.create({
          user_id: user.id,
          title: 'AI Chat',
          messages: allMessages,
        });
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Chyba pripojenia k AI.', ts: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, profile, user]);

  const clearChat = useCallback(async () => {
    setMessages([]);
    const convRes = await db.aiConversations.getAll('limit=1');
    if (convRes.data?.[0]) {
      await db.aiConversations.update(convRes.data[0].id, { messages: [] });
    }
  }, []);

  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 80px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>
          <Icons.Brain size={24} color="var(--purple)" /> AI Tréner
        </h1>
        <button onClick={clearChat} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--muted)', fontSize: 12 }}>
          Nový chat
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['chat', 'generator'] as View[]).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            flex: 1, padding: '8px 12px', borderRadius: 10,
            background: view === v ? 'var(--purple)' : 'var(--card)',
            border: `1px solid ${view === v ? 'var(--purple)' : 'var(--border)'}`,
            color: '#fff', fontSize: 14, fontWeight: 500,
          }}>
            {v === 'chat' ? 'Chat' : 'Generátor'}
          </button>
        ))}
      </div>

      {view === 'chat' ? (
        <>
          {/* Messages */}
          <div style={{ flex: 1, overflow: 'auto', marginBottom: 12 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                <Icons.Brain size={40} color="var(--purple)" />
                <div style={{ marginTop: 12, fontSize: 14 }}>
                  Opýtaj sa ma na čokoľvek o tréningu, výžive, alebo regenerácii.
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 8,
              }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 14px', borderRadius: 16,
                  background: msg.role === 'user' ? 'var(--orange)' : 'var(--card)',
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
                <div style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: '10px 14px', color: 'var(--muted)',
                }}>
                  Premýšľam...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Napíš správu..."
              style={{ flex: 1 }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                background: 'var(--orange)', borderRadius: 12, padding: '0 16px',
                color: '#fff', opacity: loading ? 0.5 : 1,
              }}
            >
              <Icons.ChevronRight size={20} />
            </button>
          </div>
        </>
      ) : (
        /* Generator view */
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          <Icons.Zap size={40} color="var(--orange)" />
          <div style={{ marginTop: 12, fontSize: 16, fontWeight: 600 }}>AI Generátor tréningov</div>
          <div style={{ marginTop: 8, fontSize: 14 }}>
            Použite chat a požiadajte AI o vygenerovanie tréningu podľa vašich potrieb.
          </div>
        </div>
      )}
    </div>
  );
}
