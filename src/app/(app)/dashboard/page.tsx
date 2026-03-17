'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Icons } from '@/components/Icons';
import { WORKOUT_LABELS, WORKOUT_COLORS, DAYS_SK } from '@/lib/constants';
import { todayStr, daysAgo, getDayOfWeek, formatDuration, formatDate } from '@/lib/date-utils';
import { computeRecoveryScore, getRecoveryColor, getRecoveryLabel } from '@/lib/scoring';
import { computeStreak } from '@/lib/analytics';
import type { Workout, UserProfile, UserSchedule, HealthLog, WorkoutType } from '@/types';

/* ─── Constants ──────────────────────────────────────────────── */
const DAYS_FULL = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota', 'Nedeľa'];
const BG = '#0A0A0A';
const CARD_BG = '#111111';
const CARD_BORDER = 'rgba(255,255,255,0.06)';
const ACCENT = '#F57C00';
const TEXT_DIM = 'rgba(255,255,255,0.35)';
const TEXT_MUTED = 'rgba(255,255,255,0.5)';

/* ─── Circular Progress Ring ─────────────────────────────────── */
const CircularProgress = ({ value, color, size = 52 }: { value: number; color: string; size?: number }) => {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  );
};

/* ─── Animated Shimmer Keyframes ─────────────────────────────── */
const globalStyles = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-glow {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes breathe {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.15); opacity: 0.8; }
  }
`;

/* ─── Section Label ──────────────────────────────────────────── */
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const,
    letterSpacing: 1.8, fontWeight: 700, marginBottom: 12, paddingLeft: 4,
  }}>
    {children}
  </div>
);

/* ═══════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [schedule, setSchedule] = useState<UserSchedule | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [healthLog, setHealthLog] = useState<HealthLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [profileRes, scheduleRes, workoutsRes, healthRes] = await Promise.all([
        db.profiles.getAll(),
        db.schedule.get(),
        db.workouts.getByDateRange(daysAgo(30), todayStr()),
        db.healthLogs.getByDate(todayStr()),
      ]);
      if (profileRes.data?.[0]) setProfile(profileRes.data[0]);
      if (scheduleRes.data) setSchedule(scheduleRes.data);
      if (workoutsRes.data) setWorkouts(workoutsRes.data);
      if (healthRes.data?.[0]) setHealthLog(healthRes.data[0]);
      setLoading(false);
    }
    load();
  }, []);

  /* ─── Derived Data ───────────────────────────────────────────── */
  const today = getDayOfWeek();
  const todaysType = schedule?.schedule?.find(s => s.d === today)?.t as WorkoutType | undefined;
  const streak = useMemo(() => computeStreak(workouts.map(w => w.date.slice(0, 10))), [workouts]);
  const thisWeekWorkouts = useMemo(() => {
    const weekAgo = daysAgo(7);
    return workouts.filter(w => w.date >= weekAgo && w.type !== 'REST');
  }, [workouts]);

  const recoveryScore = useMemo(() => {
    if (!healthLog) return null;
    return computeRecoveryScore({
      sleep: healthLog.sleep_hours || undefined,
      sleepScore: healthLog.sleep_score || undefined,
      bodyBattery: healthLog.body_battery || undefined,
      hrv: healthLog.hrv || undefined,
      rhr: healthLog.rhr || undefined,
      stress: healthLog.stress || undefined,
      energy: healthLog.energy || undefined,
    });
  }, [healthLog]);

  const todayWorkout = workouts.find(w => w.date.slice(0, 10) === todayStr());
  const firstName = profile?.name?.split(' ')[0] || 'Beast';
  const initial = firstName.charAt(0).toUpperCase();

  const isRestDay = !todaysType || todaysType === 'REST';
  const heroColor = isRestDay ? '#6B7280' : (WORKOUT_COLORS[todaysType!] || ACCENT);

  /* ─── Loading State ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100dvh', background: BG, gap: 16,
      }}>
        <style>{globalStyles}</style>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          border: `3px solid ${ACCENT}`, borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite',
        }} />
        <div style={{ color: TEXT_DIM, fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>
          Loading...
        </div>
      </div>
    );
  }

  /* ─── Greeting based on time ─────────────────────────────────── */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Dobr\u00e9 r\u00e1no' : hour < 18 ? 'Dobr\u00e9 poobedie' : 'Dobr\u00fd ve\u010der';

  return (
    <div style={{
      background: BG, minHeight: '100dvh', padding: '0 16px 100px',
      maxWidth: 480, margin: '0 auto',
    }}>
      <style>{globalStyles}</style>

      {/* ═══ 1. HEADER ═══════════════════════════════════════════ */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 20, marginBottom: 28,
        animation: 'fadeInUp 0.5s ease both',
      }}>
        <div>
          <div style={{
            fontSize: 13, color: TEXT_DIM, fontWeight: 600, letterSpacing: 0.3,
            marginBottom: 4,
          }}>
            {greeting} {' \u2022 '} {DAYS_FULL[today]}, {new Date().toLocaleDateString('sk-SK', { day: 'numeric', month: 'long' })}
          </div>
          <h1 style={{
            fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: -0.8,
            lineHeight: 1.1, color: '#FFFFFF',
          }}>
            {firstName} <span style={{ color: ACCENT }}>.</span>
          </h1>
        </div>
        <div
          onClick={() => router.push('/profile')}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: `linear-gradient(135deg, ${ACCENT}30, ${ACCENT}10)`,
            border: `2px solid ${ACCENT}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            fontSize: 17, fontWeight: 800, color: ACCENT,
            letterSpacing: -0.5,
          }}
        >
          {initial}
        </div>
      </div>

      {/* ═══ 2. TODAY'S WORKOUT — HERO CARD ══════════════════════ */}
      <div
        onClick={() => !todayWorkout && !isRestDay ? router.push('/training') : undefined}
        style={{
          position: 'relative', overflow: 'hidden',
          background: isRestDay
            ? `linear-gradient(145deg, #141418 0%, ${CARD_BG} 100%)`
            : `linear-gradient(145deg, ${heroColor}12 0%, ${CARD_BG} 50%, ${BG} 100%)`,
          border: `1px solid ${isRestDay ? CARD_BORDER : heroColor + '18'}`,
          borderRadius: 28, padding: '28px 24px',
          marginBottom: 16, cursor: isRestDay || todayWorkout ? 'default' : 'pointer',
          animation: 'fadeInUp 0.5s ease 0.05s both',
        }}
      >
        {/* Ambient glow */}
        {!isRestDay && (
          <>
            <div style={{
              position: 'absolute', top: -60, right: -60, width: 180, height: 180,
              background: `radial-gradient(circle, ${heroColor}18, transparent 70%)`,
              borderRadius: '50%', pointerEvents: 'none',
              animation: 'breathe 4s ease-in-out infinite',
            }} />
            <div style={{
              position: 'absolute', bottom: -40, left: -40, width: 120, height: 120,
              background: `radial-gradient(circle, ${heroColor}0A, transparent 70%)`,
              borderRadius: '50%', pointerEvents: 'none',
            }} />
          </>
        )}

        {/* Rest day moon glow */}
        {isRestDay && (
          <div style={{
            position: 'absolute', top: -30, right: -30, width: 120, height: 120,
            background: 'radial-gradient(circle, rgba(107,114,128,0.08), transparent 70%)',
            borderRadius: '50%', pointerEvents: 'none',
          }} />
        )}

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase' as const,
              letterSpacing: 2, fontWeight: 700, marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: 3,
                background: todayWorkout ? '#10B981' : (isRestDay ? '#6B7280' : heroColor),
                boxShadow: todayWorkout ? '0 0 8px rgba(16,185,129,0.5)' : 'none',
              }} />
              {isRestDay ? 'Dnes' : 'Dn\u0161n\u00fd tr\u00e9ning'}
            </div>

            <div style={{
              fontSize: 32, fontWeight: 800, letterSpacing: -1,
              color: isRestDay ? 'rgba(255,255,255,0.2)' : heroColor,
              lineHeight: 1.1, marginBottom: 10,
              textShadow: isRestDay ? 'none' : `0 0 40px ${heroColor}20`,
            }}>
              {isRestDay ? 'Rest Day' : WORKOUT_LABELS[todaysType!]}
            </div>

            {todayWorkout ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(16,185,129,0.08)', borderRadius: 100,
                padding: '6px 14px 6px 10px',
                border: '1px solid rgba(16,185,129,0.15)',
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 9,
                  background: 'rgba(16,185,129,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icons.Check size={10} color="#10B981" />
                </div>
                <span style={{ color: '#10B981', fontSize: 13, fontWeight: 600 }}>
                  Hotovo{todayWorkout.duration ? ` \u2022 ${formatDuration(todayWorkout.duration)}` : ''}
                </span>
              </div>
            ) : isRestDay ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                color: 'rgba(255,255,255,0.25)', fontSize: 14, fontWeight: 500,
              }}>
                <Icons.Moon size={15} color="rgba(255,255,255,0.2)" />
                Regener\u00e1cia & zotavenie
              </div>
            ) : (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: heroColor, fontSize: 14, fontWeight: 600,
                opacity: 0.8,
              }}>
                Za\u010dni tr\u00e9ning
                <Icons.ChevronRight size={14} color={heroColor} />
              </div>
            )}
          </div>

          {/* Hero Icon */}
          <div style={{
            width: 68, height: 68, borderRadius: 22,
            background: isRestDay
              ? 'rgba(255,255,255,0.03)'
              : `linear-gradient(135deg, ${heroColor}15, ${heroColor}08)`,
            border: `1px solid ${isRestDay ? 'rgba(255,255,255,0.04)' : heroColor + '20'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginLeft: 16,
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          }}>
            {isRestDay ? (
              <Icons.Moon size={28} color="rgba(255,255,255,0.15)" />
            ) : (
              <Icons.Dumbbell size={28} color={heroColor} />
            )}
          </div>
        </div>
      </div>

      {/* ═══ 3. STATS ROW ═══════════════════════════════════════ */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
        marginBottom: 16,
        animation: 'fadeInUp 0.5s ease 0.1s both',
      }}>
        {/* Streak */}
        <div style={{
          background: `linear-gradient(160deg, #1a150e 0%, ${CARD_BG} 100%)`,
          border: `1px solid ${ACCENT}12`,
          borderRadius: 22, padding: '20px 12px', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -20, right: -20, width: 60, height: 60,
            background: `radial-gradient(circle, ${ACCENT}10, transparent 70%)`,
            borderRadius: '50%', pointerEvents: 'none',
          }} />
          <Icons.Flame size={18} color={ACCENT} />
          <div style={{
            fontSize: 32, fontWeight: 800, color: ACCENT,
            lineHeight: 1, marginTop: 8, letterSpacing: -1,
          }}>
            {streak}
          </div>
          <div style={{
            color: TEXT_DIM, fontSize: 10, marginTop: 8, fontWeight: 700,
            textTransform: 'uppercase' as const, letterSpacing: 1,
          }}>
            Streak
          </div>
        </div>

        {/* This Week */}
        <div style={{
          background: `linear-gradient(160deg, #0e1320 0%, ${CARD_BG} 100%)`,
          border: '1px solid rgba(59,130,246,0.07)',
          borderRadius: 22, padding: '20px 12px', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -20, right: -20, width: 60, height: 60,
            background: 'radial-gradient(circle, rgba(59,130,246,0.08), transparent 70%)',
            borderRadius: '50%', pointerEvents: 'none',
          }} />
          <Icons.Dumbbell size={18} color="#3B82F6" />
          <div style={{
            fontSize: 32, fontWeight: 800, color: '#3B82F6',
            lineHeight: 1, marginTop: 8, letterSpacing: -1,
          }}>
            {thisWeekWorkouts.length}
          </div>
          <div style={{
            color: TEXT_DIM, fontSize: 10, marginTop: 8, fontWeight: 700,
            textTransform: 'uppercase' as const, letterSpacing: 1,
          }}>
            Tento t\u00fd\u017ede\u0148
          </div>
        </div>

        {/* Recovery Score */}
        <div style={{
          background: `linear-gradient(160deg, ${recoveryScore && recoveryScore >= 65 ? '#0e1a13' : recoveryScore && recoveryScore >= 50 ? '#1a1810' : '#1a1111'} 0%, ${CARD_BG} 100%)`,
          border: `1px solid ${recoveryScore ? getRecoveryColor(recoveryScore) + '12' : CARD_BORDER}`,
          borderRadius: 22, padding: '14px 12px', textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          {recoveryScore !== null ? (
            <>
              <div style={{ position: 'relative', width: 52, height: 52 }}>
                <CircularProgress value={recoveryScore} color={getRecoveryColor(recoveryScore)} size={52} />
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 800, color: getRecoveryColor(recoveryScore),
                  letterSpacing: -0.5,
                }}>
                  {recoveryScore}
                </div>
              </div>
              <div style={{
                color: TEXT_DIM, fontSize: 10, marginTop: 6, fontWeight: 700,
                textTransform: 'uppercase' as const, letterSpacing: 1,
              }}>
                {getRecoveryLabel(recoveryScore)}
              </div>
            </>
          ) : (
            <>
              <div style={{ marginTop: 4 }}>
                <Icons.Heart size={18} color="rgba(255,255,255,0.15)" />
              </div>
              <div style={{
                fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,0.12)',
                lineHeight: 1, marginTop: 8,
              }}>
                \u2014
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.2)', fontSize: 10, marginTop: 8, fontWeight: 700,
                textTransform: 'uppercase' as const, letterSpacing: 1,
              }}>
                Recovery
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══ 4. WEEKLY SCHEDULE ═════════════════════════════════ */}
      {schedule?.schedule && (
        <div style={{
          background: `linear-gradient(180deg, ${CARD_BG} 0%, ${BG} 100%)`,
          border: `1px solid ${CARD_BORDER}`,
          borderRadius: 24, padding: '18px 10px 14px',
          marginBottom: 16, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          animation: 'fadeInUp 0.5s ease 0.15s both',
        }}>
          <div style={{ paddingLeft: 8, marginBottom: 14 }}>
            <SectionLabel>T\u00fd\u017edenn\u00fd pl\u00e1n</SectionLabel>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {schedule.schedule.map((day, i) => {
              const isToday = i === today;
              const dayDone = workouts.some(w => {
                const wDay = (new Date(w.date).getDay() + 6) % 7;
                return wDay === i && w.date >= daysAgo(7);
              });
              const typeColor = day.t === 'REST'
                ? 'rgba(255,255,255,0.06)'
                : (WORKOUT_COLORS[day.t as WorkoutType] || 'rgba(255,255,255,0.06)');

              return (
                <div key={i} style={{
                  flex: 1, textAlign: 'center', padding: '12px 0 10px',
                  borderRadius: 16,
                  background: isToday
                    ? `linear-gradient(180deg, ${ACCENT}12, ${ACCENT}04)`
                    : 'transparent',
                  border: isToday
                    ? `1px solid ${ACCENT}25`
                    : '1px solid transparent',
                  transition: 'all 0.3s ease',
                }}>
                  {/* Day label */}
                  <div style={{
                    fontSize: 10, fontWeight: 700, marginBottom: 10,
                    color: isToday ? ACCENT : 'rgba(255,255,255,0.25)',
                    letterSpacing: 0.5,
                  }}>
                    {DAYS_SK[i]}
                  </div>

                  {/* Status dot */}
                  <div style={{
                    width: dayDone ? 10 : 8,
                    height: dayDone ? 10 : 8,
                    borderRadius: '50%', margin: '0 auto',
                    background: dayDone ? '#10B981' : typeColor,
                    opacity: dayDone ? 1 : (day.t === 'REST' ? 0.3 : 0.5),
                    boxShadow: dayDone
                      ? '0 0 10px rgba(16,185,129,0.5), 0 0 20px rgba(16,185,129,0.2)'
                      : isToday && day.t !== 'REST'
                        ? `0 0 8px ${typeColor}40`
                        : 'none',
                    transition: 'all 0.3s ease',
                  }} />

                  {/* Type abbreviation */}
                  <div style={{
                    fontSize: 8, marginTop: 8, fontWeight: 700, letterSpacing: 0.5,
                    color: isToday
                      ? `${ACCENT}B0`
                      : day.t === 'REST'
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(255,255,255,0.2)',
                  }}>
                    {day.t === 'REST' ? '\u2014' : day.t.slice(0, 3)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ 5. QUICK ACTIONS GRID ═════════════════════════════ */}
      <div style={{
        marginBottom: 16,
        animation: 'fadeInUp 0.5s ease 0.2s both',
      }}>
        <SectionLabel>R\u00fdchle akcie</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'AI Tr\u00e9ner', subtitle: 'Osobn\u00fd coach', icon: Icons.Brain, path: '/ai', color: '#A855F7', bg1: '#1a0f28', bg2: CARD_BG },
            { label: 'Suplementy', subtitle: 'Denn\u00fd checklist', icon: Icons.Pill, path: '/supplements', color: '#10B981', bg1: '#0d1f18', bg2: CARD_BG },
            { label: 'Merania', subtitle: 'Telo & metriky', icon: Icons.Activity, path: '/body', color: '#3B82F6', bg1: '#0d1528', bg2: CARD_BG },
            { label: 'Progress', subtitle: 'Grafy & \u0161tatistiky', icon: Icons.BarChart, path: '/progress', color: '#F59E0B', bg1: '#1f1a0d', bg2: CARD_BG },
          ].map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                style={{
                  background: `linear-gradient(145deg, ${item.bg1} 0%, ${item.bg2} 100%)`,
                  border: `1px solid ${item.color}10`,
                  borderRadius: 22, padding: '18px 16px',
                  color: '#fff', display: 'flex', flexDirection: 'column',
                  alignItems: 'flex-start', gap: 12,
                  textAlign: 'left', cursor: 'pointer',
                  position: 'relative', overflow: 'hidden',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {/* Subtle corner glow */}
                <div style={{
                  position: 'absolute', top: -20, right: -20, width: 60, height: 60,
                  background: `radial-gradient(circle, ${item.color}10, transparent 70%)`,
                  borderRadius: '50%', pointerEvents: 'none',
                }} />

                <div style={{
                  width: 40, height: 40, borderRadius: 14,
                  background: `linear-gradient(135deg, ${item.color}18, ${item.color}08)`,
                  border: `1px solid ${item.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} color={item.color} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2, fontWeight: 500 }}>{item.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ 6. RECENT WORKOUTS ═════════════════════════════════ */}
      <div style={{
        marginBottom: 16,
        animation: 'fadeInUp 0.5s ease 0.25s both',
      }}>
        <SectionLabel>Posledn\u00e9 tr\u00e9ningy</SectionLabel>
        <div style={{
          background: `linear-gradient(180deg, ${CARD_BG} 0%, ${BG} 100%)`,
          border: `1px solid ${CARD_BORDER}`,
          borderRadius: 24, padding: '6px 4px',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        }}>
          {workouts.length > 0 ? workouts.slice(0, 5).map((w, i) => {
            const wColor = WORKOUT_COLORS[w.type] || '#6B7280';
            return (
              <div
                key={w.id}
                onClick={() => router.push('/diary')}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 16px', cursor: 'pointer',
                  borderRadius: 18, margin: '2px 0',
                  transition: 'background 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Workout type indicator */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 14,
                    background: `linear-gradient(135deg, ${wColor}15, ${wColor}08)`,
                    border: `1px solid ${wColor}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: 4,
                      background: wColor,
                      boxShadow: `0 0 8px ${wColor}50`,
                    }} />
                  </div>
                  <div>
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: '#fff',
                      letterSpacing: -0.2,
                    }}>
                      {WORKOUT_LABELS[w.type]}
                    </div>
                    <div style={{
                      fontSize: 12, color: TEXT_DIM, marginTop: 2, fontWeight: 500,
                    }}>
                      {formatDate(w.date)}{w.duration ? ` \u2022 ${formatDuration(w.duration)}` : ''}
                    </div>
                  </div>
                </div>
                <Icons.ChevronRight size={14} color="rgba(255,255,255,0.12)" />
              </div>
            );
          }) : (
            /* Empty state */
            <div style={{
              textAlign: 'center', padding: '40px 20px',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 22, margin: '0 auto 16px',
                background: `linear-gradient(135deg, ${ACCENT}12, ${ACCENT}05)`,
                border: `1px solid ${ACCENT}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icons.Dumbbell size={28} color={`${ACCENT}60`} />
              </div>
              <div style={{
                color: TEXT_MUTED, fontSize: 16, fontWeight: 700,
                marginBottom: 6, letterSpacing: -0.3,
              }}>
                Ka\u017ed\u00fd majster bol raz za\u010diato\u010dn\u00edk
              </div>
              <div style={{
                color: TEXT_DIM, fontSize: 13, marginBottom: 20,
                lineHeight: 1.5, maxWidth: 240, margin: '0 auto 20px',
              }}>
                Tv\u00e1 cesta za\u010d\u00edna jedn\u00fdm tr\u00e9ningom. Si pripraven\u00fd?
              </div>
              <button
                onClick={() => router.push('/training')}
                style={{
                  background: `linear-gradient(135deg, ${ACCENT}, #E86A00)`,
                  border: 'none', borderRadius: 14,
                  padding: '12px 28px', color: '#fff',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  boxShadow: `0 4px 20px ${ACCENT}40`,
                  letterSpacing: -0.2,
                }}
              >
                Za\u010dni prv\u00fd tr\u00e9ning
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ 7. HEALTH METRICS MINI CARD ═══════════════════════ */}
      {healthLog && (healthLog.weight || healthLog.sleep_hours || healthLog.hrv) && (
        <div style={{
          animation: 'fadeInUp 0.5s ease 0.3s both',
        }}>
          <SectionLabel>Dne\u0161n\u00e9 metriky</SectionLabel>
          <div style={{
            background: `linear-gradient(180deg, ${CARD_BG} 0%, ${BG} 100%)`,
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 24, padding: '18px 20px',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            display: 'flex', justifyContent: 'space-around', alignItems: 'center',
          }}>
            {healthLog.weight && (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 10, color: TEXT_DIM, fontWeight: 700,
                  textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6,
                }}>
                  Hmotnos\u0165
                </div>
                <div style={{
                  fontSize: 22, fontWeight: 800, color: '#fff',
                  letterSpacing: -0.5, lineHeight: 1,
                }}>
                  {healthLog.weight}
                  <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_DIM, marginLeft: 2 }}>kg</span>
                </div>
              </div>
            )}

            {healthLog.weight && healthLog.sleep_hours && (
              <div style={{ width: 1, height: 32, background: CARD_BORDER }} />
            )}

            {healthLog.sleep_hours && (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 10, color: TEXT_DIM, fontWeight: 700,
                  textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6,
                }}>
                  Sp\u00e1nok
                </div>
                <div style={{
                  fontSize: 22, fontWeight: 800,
                  color: healthLog.sleep_hours >= 7 ? '#10B981' : healthLog.sleep_hours >= 6 ? '#F59E0B' : '#EF4444',
                  letterSpacing: -0.5, lineHeight: 1,
                }}>
                  {healthLog.sleep_hours}
                  <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_DIM, marginLeft: 2 }}>h</span>
                </div>
              </div>
            )}

            {((healthLog.weight || healthLog.sleep_hours) && healthLog.hrv) && (
              <div style={{ width: 1, height: 32, background: CARD_BORDER }} />
            )}

            {healthLog.hrv && (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 10, color: TEXT_DIM, fontWeight: 700,
                  textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6,
                }}>
                  HRV
                </div>
                <div style={{
                  fontSize: 22, fontWeight: 800,
                  color: healthLog.hrv >= 50 ? '#10B981' : healthLog.hrv >= 30 ? '#F59E0B' : '#EF4444',
                  letterSpacing: -0.5, lineHeight: 1,
                }}>
                  {healthLog.hrv}
                  <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_DIM, marginLeft: 2 }}>ms</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
