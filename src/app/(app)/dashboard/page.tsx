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

const DAYS_FULL = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota', 'Nedeľa'];

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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80dvh' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #F57C00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 16px 24px', maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, paddingTop: 8 }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
          {DAYS_FULL[today]} · {new Date().toLocaleDateString('sk-SK', { day: 'numeric', month: 'long' })}
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '2px 0 0', letterSpacing: -0.5 }}>
          Ahoj, <span style={{ color: '#F57C00' }}>{firstName}</span>
        </h1>
      </div>

      {/* Hero Card — Today's Plan */}
      <div
        onClick={() => router.push('/training')}
        style={{
          position: 'relative',
          background: todaysType && todaysType !== 'REST'
            ? `linear-gradient(135deg, ${WORKOUT_COLORS[todaysType]}15 0%, #0d0d0d 70%)`
            : 'linear-gradient(135deg, #161616, #0d0d0d)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 24,
          padding: '24px 20px',
          marginBottom: 14,
          cursor: 'pointer',
          overflow: 'hidden',
        }}
      >
        {todaysType && todaysType !== 'REST' && (
          <div style={{
            position: 'absolute', top: -30, right: -30, width: 100, height: 100,
            background: `radial-gradient(circle, ${WORKOUT_COLORS[todaysType]}20, transparent 70%)`,
            borderRadius: '50%', pointerEvents: 'none',
          }} />
        )}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
              Dnešný plán
            </div>
            <div style={{
              fontSize: 28, fontWeight: 800, marginTop: 6, letterSpacing: -0.5,
              color: todaysType && todaysType !== 'REST' ? WORKOUT_COLORS[todaysType] : 'rgba(255,255,255,0.2)',
            }}>
              {todaysType && todaysType !== 'REST' ? WORKOUT_LABELS[todaysType] : 'Rest Day'}
            </div>
            {todayWorkout ? (
              <div style={{ color: '#10B981', fontSize: 13, marginTop: 6, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: 3, background: '#10B981', display: 'inline-block', boxShadow: '0 0 6px #10B98180' }} />
                Hotovo {todayWorkout.duration ? `· ${formatDuration(todayWorkout.duration)}` : ''}
              </div>
            ) : todaysType && todaysType !== 'REST' ? (
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 6 }}>Začni tréning →</div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, marginTop: 6 }}>Regeneračný deň</div>
            )}
          </div>
          <div style={{
            width: 60, height: 60, borderRadius: 18,
            background: todaysType && todaysType !== 'REST' ? `${WORKOUT_COLORS[todaysType]}10` : 'rgba(255,255,255,0.03)',
            border: `1px solid ${todaysType && todaysType !== 'REST' ? WORKOUT_COLORS[todaysType] + '18' : 'rgba(255,255,255,0.04)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icons.Dumbbell size={26} color={todaysType && todaysType !== 'REST' ? WORKOUT_COLORS[todaysType] : 'rgba(255,255,255,0.12)'} />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          { value: streak, label: 'Streak', icon: Icons.Flame, color: '#F57C00', bg: '#1a1510' },
          { value: thisWeekWorkouts.length, label: 'Tento týždeň', icon: Icons.Dumbbell, color: '#3B82F6', bg: '#101520' },
          { value: recoveryScore ?? '—', label: recoveryScore ? getRecoveryLabel(recoveryScore) : 'Recovery', icon: Icons.Heart, color: recoveryScore ? getRecoveryColor(recoveryScore) : 'rgba(255,255,255,0.15)', bg: recoveryScore && recoveryScore >= 65 ? '#101a15' : '#151515' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} style={{
              background: `linear-gradient(180deg, ${stat.bg}, #0d0d0d)`,
              border: `1px solid ${stat.color}12`,
              borderRadius: 20, padding: '18px 10px', textAlign: 'center',
            }}>
              <Icon size={16} color={stat.color} />
              <div style={{ fontSize: 28, fontWeight: 800, color: stat.color, lineHeight: 1, marginTop: 6 }}>{stat.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 6, fontWeight: 600 }}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Weekly Schedule */}
      {schedule?.schedule && (
        <div style={{
          background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 20, padding: '14px 12px', marginBottom: 14,
        }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, paddingLeft: 4 }}>
            Týždenný plán
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {schedule.schedule.map((day, i) => {
              const isToday = i === today;
              const dayDone = workouts.some(w => {
                const wDay = (new Date(w.date).getDay() + 6) % 7;
                return wDay === i && w.date >= daysAgo(7);
              });
              const typeColor = day.t === 'REST' ? 'rgba(255,255,255,0.06)' : (WORKOUT_COLORS[day.t as WorkoutType] || 'rgba(255,255,255,0.06)');
              return (
                <div key={i} style={{
                  flex: 1, textAlign: 'center', padding: '10px 0',
                  borderRadius: 14,
                  background: isToday ? 'rgba(245,124,0,0.08)' : 'transparent',
                  border: isToday ? '1px solid rgba(245,124,0,0.2)' : '1px solid transparent',
                }}>
                  <div style={{ fontSize: 10, color: isToday ? '#F57C00' : 'rgba(255,255,255,0.25)', marginBottom: 8, fontWeight: 700 }}>
                    {DAYS_SK[i]}
                  </div>
                  <div style={{
                    width: 8, height: 8, borderRadius: 4, margin: '0 auto',
                    background: dayDone ? '#10B981' : typeColor,
                    opacity: dayDone ? 1 : 0.5,
                    boxShadow: dayDone ? '0 0 8px rgba(16,185,129,0.4)' : 'none',
                  }} />
                  <div style={{
                    fontSize: 8, marginTop: 6, fontWeight: 700, letterSpacing: 0.5,
                    color: isToday ? 'rgba(245,124,0,0.7)' : day.t === 'REST' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
                  }}>
                    {day.t === 'REST' ? '—' : day.t.slice(0, 3)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'AI Tréner', icon: Icons.Brain, path: '/ai', color: '#A855F7', bg: '#150f20' },
          { label: 'Suplementy', icon: Icons.Pill, path: '/supplements', color: '#10B981', bg: '#0d1a15' },
          { label: 'Merania', icon: Icons.Activity, path: '/body', color: '#3B82F6', bg: '#0d1520' },
          { label: 'Progress', icon: Icons.BarChart, path: '/progress', color: '#F59E0B', bg: '#1a1810' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                background: `linear-gradient(135deg, ${item.bg}, #0d0d0d)`,
                border: `1px solid ${item.color}10`,
                borderRadius: 18, padding: '14px 12px', color: '#fff',
                display: 'flex', alignItems: 'center', gap: 10,
                textAlign: 'left', cursor: 'pointer',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 11,
                background: `${item.color}12`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={16} color={item.color} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Recent Workouts */}
      <div style={{
        background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 20, padding: 16,
      }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
          Posledné tréningy
        </div>
        {workouts.length > 0 ? workouts.slice(0, 5).map((w, i) => (
          <div key={w.id} onClick={() => router.push('/diary')} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '11px 0', cursor: 'pointer',
            borderBottom: i < Math.min(workouts.length, 5) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 11,
                background: `${WORKOUT_COLORS[w.type]}0D`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 7, height: 7, borderRadius: 4, background: WORKOUT_COLORS[w.type], boxShadow: `0 0 6px ${WORKOUT_COLORS[w.type]}40` }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{WORKOUT_LABELS[w.type]}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>
                  {formatDate(w.date)}{w.duration ? ` · ${formatDuration(w.duration)}` : ''}
                </div>
              </div>
            </div>
            <Icons.ChevronRight size={14} color="rgba(255,255,255,0.12)" />
          </div>
        )) : (
          <div style={{ textAlign: 'center', padding: '30px 16px' }}>
            <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.2 }}>🏋️</div>
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14, marginBottom: 14 }}>Zatiaľ žiadne tréningy</div>
            <button onClick={() => router.push('/training')} style={{
              background: 'rgba(245,124,0,0.1)', border: '1px solid rgba(245,124,0,0.2)',
              borderRadius: 12, padding: '10px 24px', color: '#F57C00', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Začni prvý tréning
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
