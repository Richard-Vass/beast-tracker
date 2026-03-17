'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Icons } from '@/components/Icons';
import { WORKOUT_LABELS, WORKOUT_COLORS, DAYS_SK, DAYS_FULL_SK } from '@/lib/constants';
import { todayStr, daysAgo, getDayOfWeek, formatDuration } from '@/lib/date-utils';
import { computeRecoveryScore, getRecoveryColor, getRecoveryLabel } from '@/lib/scoring';
import { computeStreak } from '@/lib/analytics';
import type { Workout, UserProfile, UserSchedule, HealthLog, WorkoutType } from '@/types';

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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80dvh' }}>
        <div style={{ color: 'var(--muted)' }}>Načítavam...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>
          {DAYS_FULL_SK[today]}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: '4px 0' }}>
          Ahoj, {profile?.name?.split(' ')[0] || 'Beast'} 💪
        </h1>
      </div>

      {/* Today's Plan Card */}
      <div
        onClick={() => router.push('/training')}
        style={{
          background: todaysType ? `linear-gradient(135deg, ${WORKOUT_COLORS[todaysType]}22, var(--card))` : 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
              Dnešný plán
            </div>
            <div style={{
              fontSize: 24, fontWeight: 700, marginTop: 4,
              color: todaysType ? WORKOUT_COLORS[todaysType] : 'var(--muted)',
            }}>
              {todaysType ? WORKOUT_LABELS[todaysType] : 'Žiadny plán'}
            </div>
            {todayWorkout ? (
              <div style={{ color: 'var(--green)', fontSize: 13, marginTop: 4 }}>
                ✓ Hotovo {todayWorkout.duration ? `· ${formatDuration(todayWorkout.duration)}` : ''}
              </div>
            ) : todaysType && todaysType !== 'REST' ? (
              <div style={{ color: 'var(--orange)', fontSize: 13, marginTop: 4 }}>
                Tap pre začatie tréningu →
              </div>
            ) : null}
          </div>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: todaysType ? `${WORKOUT_COLORS[todaysType]}22` : 'var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icons.Dumbbell size={28} color={todaysType ? WORKOUT_COLORS[todaysType] : 'var(--muted)'} />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* Streak */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 16, textAlign: 'center',
        }}>
          <Icons.Flame size={20} color="var(--orange)" />
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--orange)', marginTop: 4 }}>{streak}</div>
          <div style={{ color: 'var(--muted)', fontSize: 11 }}>Streak</div>
        </div>

        {/* This Week */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 16, textAlign: 'center',
        }}>
          <Icons.Dumbbell size={20} color="var(--blue)" />
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--blue)', marginTop: 4 }}>{thisWeekWorkouts.length}</div>
          <div style={{ color: 'var(--muted)', fontSize: 11 }}>Tento týždeň</div>
        </div>

        {/* Recovery */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 16, textAlign: 'center',
        }}>
          <Icons.Heart size={20} color={recoveryScore ? getRecoveryColor(recoveryScore) : 'var(--muted)'} />
          <div style={{
            fontSize: 28, fontWeight: 700, marginTop: 4,
            color: recoveryScore ? getRecoveryColor(recoveryScore) : 'var(--muted)',
          }}>
            {recoveryScore ?? '—'}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 11 }}>
            {recoveryScore ? getRecoveryLabel(recoveryScore) : 'Recovery'}
          </div>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 16, marginBottom: 16,
      }}>
        <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
          Týždenný plán
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(schedule?.schedule || []).map((day, i) => {
            const isToday = i === today;
            const dayWorkout = workouts.find(w => {
              const wDay = (new Date(w.date).getDay() + 6) % 7;
              return wDay === i && w.date >= daysAgo(7);
            });
            return (
              <div key={i} style={{
                flex: 1, textAlign: 'center', padding: '8px 4px',
                borderRadius: 12,
                background: isToday ? 'var(--orange)' + '22' : 'transparent',
                border: isToday ? '1px solid var(--orange)' + '44' : '1px solid transparent',
              }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>{DAYS_SK[i]}</div>
                <div style={{
                  width: 8, height: 8, borderRadius: 4, margin: '0 auto',
                  background: dayWorkout ? 'var(--green)' : day.t === 'REST' ? 'var(--border)' : WORKOUT_COLORS[day.t] || 'var(--border)',
                  opacity: dayWorkout ? 1 : 0.5,
                }} />
                <div style={{ fontSize: 9, color: 'var(--soft)', marginTop: 4 }}>
                  {day.t === 'REST' ? '—' : day.t.slice(0, 2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16,
      }}>
        {[
          { label: 'AI Tréner', icon: Icons.Brain, path: '/ai', color: 'var(--purple)' },
          { label: 'Suplementy', icon: Icons.Pill, path: '/supplements', color: 'var(--green)' },
          { label: 'Body', icon: Icons.Activity, path: '/body', color: 'var(--blue)' },
          { label: 'Progress', icon: Icons.BarChart, path: '/progress', color: 'var(--yellow)' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: 16, color: '#fff',
                display: 'flex', alignItems: 'center', gap: 10,
                textAlign: 'left',
              }}
            >
              <Icon size={20} color={item.color} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Recent Workouts */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 16,
      }}>
        <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
          Posledné tréningy
        </div>
        {workouts.slice(0, 5).map(w => (
          <div key={w.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 8, height: 8, borderRadius: 4,
                background: WORKOUT_COLORS[w.type] || 'var(--muted)',
              }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{WORKOUT_LABELS[w.type]}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {new Date(w.date).toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' })}
                  {w.duration ? ` · ${formatDuration(w.duration)}` : ''}
                </div>
              </div>
            </div>
            <Icons.ChevronRight size={16} color="var(--muted)" />
          </div>
        ))}
        {workouts.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 14, textAlign: 'center', padding: 20 }}>
            Zatiaľ žiadne tréningy
          </div>
        )}
      </div>
    </div>
  );
}
