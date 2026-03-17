'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Icons } from '@/components/Icons';
import { WORKOUT_LABELS, WORKOUT_COLORS } from '@/lib/constants';
import type { AIMessage, UserProfile, WorkoutType } from '@/types';

type View = 'chat' | 'generator';

interface GeneratedExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rir: string;
  tempo: string;
  rest: number;
  note?: string;
}

interface GeneratedWorkout {
  name: string;
  warmup: string[];
  exercises: GeneratedExercise[];
  recovery?: string[];
}

const GENERATOR_TYPES: WorkoutType[] = ['PUSH', 'PULL', 'LEGS', 'UPPER', 'LOWER', 'FULL'];

export default function AIPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<View>('chat');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generator state
  const [genType, setGenType] = useState<WorkoutType>('PUSH');
  const [generating, setGenerating] = useState(false);
  const [generatedWorkout, setGeneratedWorkout] = useState<GeneratedWorkout | null>(null);
  const [genError, setGenError] = useState('');
  const [warmupChecked, setWarmupChecked] = useState<Record<number, boolean>>({});

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

  // ─── Generator Functions ─────────────────────────────────────
  const generateWorkout = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    setGenError('');
    setGeneratedWorkout(null);
    setWarmupChecked({});

    try {
      const res = await fetch('/api/ai/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: genType,
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
      if (data.error) {
        setGenError(data.error);
      } else {
        setGeneratedWorkout(data);
      }
    } catch {
      setGenError('Chyba pripojenia. Skúste to znova.');
    } finally {
      setGenerating(false);
    }
  }, [generating, genType, profile]);

  const useWorkout = useCallback(() => {
    if (!generatedWorkout) return;
    const planData = {
      type: genType,
      name: generatedWorkout.name,
      warmup: generatedWorkout.warmup,
      exercises: generatedWorkout.exercises,
      source: 'ai-generator',
    };
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('bt-ai-workout', JSON.stringify(planData));
    }
    router.push('/training');
  }, [generatedWorkout, genType, router]);

  const toggleWarmup = (idx: number) => {
    setWarmupChecked(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // ─── Shimmer component ────────────────────────────────────────
  const ShimmerBlock = ({ width, height, mb = 0 }: { width: string; height: number; mb?: number }) => (
    <div style={{
      width, height, borderRadius: 8, marginBottom: mb,
      background: 'linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }} />
  );

  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 80px)' }}>
      {/* Shimmer keyframes */}
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>
          <Icons.Brain size={24} color="var(--purple)" /> AI Tréner
        </h1>
        {view === 'chat' && (
          <button onClick={clearChat} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--muted)', fontSize: 12 }}>
            Nový chat
          </button>
        )}
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
        /* ─── Generator View ──────────────────────────────────── */
        <div style={{ flex: 1, overflow: 'auto' }}>
          {!generatedWorkout && !generating ? (
            <>
              {/* Type selection */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#999', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Typ tréningu
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {GENERATOR_TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => setGenType(t)}
                      style={{
                        padding: '14px 8px',
                        borderRadius: 12,
                        background: genType === t ? `${WORKOUT_COLORS[t]}20` : '#141414',
                        border: `2px solid ${genType === t ? WORKOUT_COLORS[t] : '#1E1E1E'}`,
                        color: genType === t ? WORKOUT_COLORS[t] : '#888',
                        fontSize: 14,
                        fontWeight: 600,
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                      }}
                    >
                      {WORKOUT_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info card */}
              <div style={{
                background: '#141414', border: '1px solid #1E1E1E', borderRadius: 14,
                padding: 16, marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Icons.Zap size={18} color="#F57C00" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>AI vygeneruje</span>
                </div>
                <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>
                  Personalizovaný {WORKOUT_LABELS[genType]} tréning prispôsobený tvojim skúsenostiam a cieľom. Obsahuje rozcvičku, cviky s váhami, a tipy na regeneráciu.
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={generateWorkout}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14,
                  background: 'linear-gradient(135deg, #F57C00, #FF9800)',
                  border: 'none', color: '#fff', fontSize: 16, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 10,
                }}
              >
                <Icons.Zap size={20} color="#fff" />
                Generovať tréning
              </button>

              {genError && (
                <div style={{
                  marginTop: 12, padding: 12, borderRadius: 10,
                  background: '#2D1111', border: '1px solid #5C2020',
                  color: '#FF6B6B', fontSize: 13, textAlign: 'center',
                }}>
                  {genError}
                </div>
              )}
            </>
          ) : generating ? (
            /* ─── Loading Shimmer ─────────────────────────────── */
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${WORKOUT_COLORS[genType]}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icons.Zap size={18} color={WORKOUT_COLORS[genType]} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>Generujem {WORKOUT_LABELS[genType]}...</div>
                  <div style={{ fontSize: 12, color: '#666' }}>AI vytvára tvoj tréning</div>
                </div>
              </div>

              {/* Warmup shimmer */}
              <div style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <ShimmerBlock width="30%" height={14} mb={12} />
                <ShimmerBlock width="70%" height={12} mb={8} />
                <ShimmerBlock width="60%" height={12} mb={8} />
                <ShimmerBlock width="65%" height={12} />
              </div>

              {/* Exercise shimmer cards */}
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                  <ShimmerBlock width="50%" height={16} mb={10} />
                  <div style={{ display: 'flex', gap: 12 }}>
                    <ShimmerBlock width="25%" height={12} />
                    <ShimmerBlock width="25%" height={12} />
                    <ShimmerBlock width="25%" height={12} />
                  </div>
                </div>
              ))}
            </div>
          ) : generatedWorkout ? (
            /* ─── Generated Workout Display ───────────────────── */
            <div>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
                padding: 16, background: '#141414', border: '1px solid #1E1E1E', borderRadius: 14,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${WORKOUT_COLORS[genType]}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icons.Zap size={22} color={WORKOUT_COLORS[genType]} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{generatedWorkout.name}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {generatedWorkout.exercises.length} cvikov
                    {generatedWorkout.warmup?.length ? ` · ${generatedWorkout.warmup.length} rozcvičiek` : ''}
                  </div>
                </div>
              </div>

              {/* Warmup */}
              {generatedWorkout.warmup && generatedWorkout.warmup.length > 0 && (
                <div style={{
                  background: '#141414', border: '1px solid #1E1E1E', borderRadius: 14,
                  padding: 16, marginBottom: 12,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#F57C00', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Rozcvička
                  </div>
                  {generatedWorkout.warmup.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleWarmup(idx)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: 6,
                        border: `2px solid ${warmupChecked[idx] ? '#F57C00' : '#333'}`,
                        background: warmupChecked[idx] ? '#F57C00' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.2s ease',
                      }}>
                        {warmupChecked[idx] && <Icons.Check size={14} color="#fff" />}
                      </div>
                      <span style={{
                        fontSize: 14, color: warmupChecked[idx] ? '#666' : '#ccc',
                        textDecoration: warmupChecked[idx] ? 'line-through' : 'none',
                        transition: 'all 0.2s ease',
                      }}>
                        {item}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Exercises */}
              {generatedWorkout.exercises.map((ex, idx) => (
                <div key={idx} style={{
                  background: '#141414', border: '1px solid #1E1E1E', borderRadius: 14,
                  padding: 16, marginBottom: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{ex.name}</div>
                      {ex.note && (
                        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{ex.note}</div>
                      )}
                    </div>
                    <div style={{
                      fontSize: 11, color: '#666', background: '#1E1E1E',
                      padding: '3px 8px', borderRadius: 6, fontWeight: 500,
                    }}>
                      #{idx + 1}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                    <div style={{ background: '#1A1A1A', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#F57C00' }}>{ex.sets}</div>
                      <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>Sets</div>
                    </div>
                    <div style={{ background: '#1A1A1A', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{ex.reps}</div>
                      <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>Reps</div>
                    </div>
                    <div style={{ background: '#1A1A1A', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#10B981' }}>{ex.rir}</div>
                      <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>RIR</div>
                    </div>
                    <div style={{ background: '#1A1A1A', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#3B82F6' }}>{ex.rest}s</div>
                      <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>Rest</div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Recovery tips */}
              {generatedWorkout.recovery && generatedWorkout.recovery.length > 0 && (
                <div style={{
                  background: '#141414', border: '1px solid #1E1E1E', borderRadius: 14,
                  padding: 16, marginBottom: 16,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#8B5CF6', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Regenerácia
                  </div>
                  {generatedWorkout.recovery.map((tip, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: idx < generatedWorkout.recovery!.length - 1 ? 8 : 0,
                    }}>
                      <Icons.Heart size={14} color="#8B5CF6" className="" />
                      <span style={{ fontSize: 13, color: '#ccc', lineHeight: 1.4 }}>{tip}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <button
                  onClick={useWorkout}
                  style={{
                    flex: 2, padding: '14px 16px', borderRadius: 12,
                    background: 'linear-gradient(135deg, #F57C00, #FF9800)',
                    border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 8,
                  }}
                >
                  <Icons.Dumbbell size={18} color="#fff" />
                  Použiť tréning
                </button>
                <button
                  onClick={() => { setGeneratedWorkout(null); setWarmupChecked({}); generateWorkout(); }}
                  style={{
                    flex: 1, padding: '14px 12px', borderRadius: 12,
                    background: '#1A1A1A', border: '1px solid #2A2A2A',
                    color: '#ccc', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 6,
                  }}
                >
                  <Icons.Zap size={16} color="#F57C00" />
                  Znova
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
