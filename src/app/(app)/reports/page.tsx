'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Icons } from '@/components/Icons';
import { WORKOUT_LABELS, WORKOUT_COLORS } from '@/lib/constants';
import { todayStr, daysAgo, formatDate, formatDuration, getDayOfWeek } from '@/lib/date-utils';
import { computeVolume, computeStreak, computePRs } from '@/lib/analytics';
import type { Workout, WorkoutSet, BodyMeasurement, WorkoutType } from '@/types';

/* ─── Design Tokens ──────────────────────────────────────────── */
const BG = '#0A0A0A';
const CARD_BG = '#111111';
const CARD_BORDER = 'rgba(255,255,255,0.06)';
const ACCENT = '#F57C00';
const ACCENT_DIM = 'rgba(245,124,0,0.15)';
const TEXT = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.5)';
const TEXT_DIM = 'rgba(255,255,255,0.3)';
const GREEN = '#10B981';
const RED = '#EF4444';

const DAYS_SK = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];

/* ─── Animations ─────────────────────────────────────────────── */
const globalStyles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-12px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.92); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes pulseGlow {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
`;

/* ─── Helper Components ──────────────────────────────────────── */
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    fontSize: 11, color: TEXT_DIM, textTransform: 'uppercase' as const,
    letterSpacing: 1.8, fontWeight: 700, marginBottom: 12, paddingLeft: 4,
  }}>
    {children}
  </div>
);

const Card = ({ children, style, delay = 0 }: { children: React.ReactNode; style?: React.CSSProperties; delay?: number }) => (
  <div style={{
    background: `linear-gradient(145deg, ${CARD_BG} 0%, #0D0D0D 100%)`,
    border: `1px solid ${CARD_BORDER}`,
    borderRadius: 16,
    padding: 20,
    animation: `fadeInUp 0.5s ease ${delay}s both`,
    ...style,
  }}>
    {children}
  </div>
);

const StatBox = ({ label, value, unit, icon, accent }: {
  label: string; value: string | number; unit?: string;
  icon?: React.ReactNode; accent?: boolean;
}) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '14px 8px', borderRadius: 12,
    background: accent ? ACCENT_DIM : 'rgba(255,255,255,0.03)',
    flex: 1, minWidth: 0,
  }}>
    {icon && <div style={{ marginBottom: 6, opacity: 0.7 }}>{icon}</div>}
    <div style={{
      fontSize: 22, fontWeight: 800, color: accent ? ACCENT : TEXT,
      fontVariantNumeric: 'tabular-nums',
    }}>
      {value}{unit && <span style={{ fontSize: 12, fontWeight: 500, color: TEXT_MUTED, marginLeft: 2 }}>{unit}</span>}
    </div>
    <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4, textAlign: 'center' }}>
      {label}
    </div>
  </div>
);

const ComparisonArrow = ({ current, previous, suffix = '%' }: { current: number; previous: number; suffix?: string }) => {
  if (previous === 0) return <span style={{ fontSize: 11, color: TEXT_DIM }}>--</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  const isUp = pct > 0;
  const isZero = pct === 0;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      color: isZero ? TEXT_DIM : isUp ? GREEN : RED,
      display: 'inline-flex', alignItems: 'center', gap: 2,
    }}>
      {!isZero && (isUp ? '\u2191' : '\u2193')}
      {isZero ? '=' : `${Math.abs(pct)}${suffix}`}
    </span>
  );
};

/* ─── Date Helpers ────────────────────────────────────────────── */
function getWeekRange(offset = 0): { start: string; end: string; label: string } {
  const now = new Date();
  const dayOfWeek = getDayOfWeek(now);
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const fmtShort = (d: Date) => d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' });
  return {
    start: fmt(monday),
    end: fmt(sunday),
    label: `${fmtShort(monday)} - ${fmtShort(sunday)}`,
  };
}

function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

function getMonthCalendarDays(): { date: string; dayNum: number; isToday: boolean; dayOfWeek: number }[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDate = todayStr();
  const days: { date: string; dayNum: number; isToday: boolean; dayOfWeek: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    const dateStr = dt.toISOString().slice(0, 10);
    days.push({
      date: dateStr,
      dayNum: d,
      isToday: dateStr === todayDate,
      dayOfWeek: (dt.getDay() + 6) % 7,
    });
  }
  return days;
}

/* ═══════════════════════════════════════════════════════════════ */
export default function ReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'week' | 'month'>('week');

  // Data
  const [thisWeekWorkouts, setThisWeekWorkouts] = useState<Workout[]>([]);
  const [lastWeekWorkouts, setLastWeekWorkouts] = useState<Workout[]>([]);
  const [thisWeekSets, setThisWeekSets] = useState<WorkoutSet[]>([]);
  const [lastWeekSets, setLastWeekSets] = useState<WorkoutSet[]>([]);
  const [monthWorkouts, setMonthWorkouts] = useState<Workout[]>([]);
  const [monthSets, setMonthSets] = useState<WorkoutSet[]>([]);
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurement[]>([]);

  useEffect(() => {
    async function load() {
      const thisWeek = getWeekRange(0);
      const lastWeek = getWeekRange(-1);
      const monthRange = getMonthRange();

      const [twRes, lwRes, twsRes, lwsRes, mwRes, msRes, bmRes] = await Promise.all([
        db.workouts.getByDateRange(thisWeek.start, thisWeek.end),
        db.workouts.getByDateRange(lastWeek.start, lastWeek.end),
        db.workoutSets.getByDateRange(thisWeek.start, thisWeek.end),
        db.workoutSets.getByDateRange(lastWeek.start, lastWeek.end),
        db.workouts.getByDateRange(monthRange.start, monthRange.end),
        db.workoutSets.getByDateRange(monthRange.start, monthRange.end),
        db.bodyMeasurements.getByDateRange(daysAgo(60), todayStr()),
      ]);

      setThisWeekWorkouts(twRes.data || []);
      setLastWeekWorkouts(lwRes.data || []);
      setThisWeekSets(twsRes.data || []);
      setLastWeekSets(lwsRes.data || []);
      setMonthWorkouts(mwRes.data || []);
      setMonthSets(msRes.data || []);
      setBodyMeasurements(bmRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  /* ─── Derived: Weekly Stats ────────────────────────────────── */
  const weekRange = getWeekRange(0);

  const weeklyStats = useMemo(() => {
    const totalWorkouts = thisWeekWorkouts.filter(w => w.type !== 'REST').length;
    const totalVolume = computeVolume(thisWeekSets);
    const totalSets = thisWeekSets.filter(s => s.done).length;
    const totalDuration = thisWeekWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    const avgDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0;

    // Most trained muscle group (by workout type count)
    const typeCounts: Record<string, number> = {};
    thisWeekWorkouts.forEach(w => {
      if (w.type !== 'REST') {
        typeCounts[w.type] = (typeCounts[w.type] || 0) + 1;
      }
    });
    const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

    // Streak
    const allDates = [...thisWeekWorkouts, ...lastWeekWorkouts]
      .filter(w => w.type !== 'REST')
      .map(w => w.date.slice(0, 10));
    const streak = computeStreak(allDates);

    return { totalWorkouts, totalVolume, totalSets, totalDuration, avgDuration, topType, streak };
  }, [thisWeekWorkouts, thisWeekSets, lastWeekWorkouts]);

  const prevWeekStats = useMemo(() => {
    const totalWorkouts = lastWeekWorkouts.filter(w => w.type !== 'REST').length;
    const totalVolume = computeVolume(lastWeekSets);
    const totalSets = lastWeekSets.filter(s => s.done).length;
    const totalDuration = lastWeekWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    return { totalWorkouts, totalVolume, totalSets, totalDuration };
  }, [lastWeekWorkouts, lastWeekSets]);

  /* ─── Derived: Monthly Stats ───────────────────────────────── */
  const monthlyStats = useMemo(() => {
    const totalWorkouts = monthWorkouts.filter(w => w.type !== 'REST').length;
    const totalVolume = computeVolume(monthSets);
    const totalDuration = monthWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    const totalSets = monthSets.filter(s => s.done).length;

    // Best workout (highest volume)
    const workoutVolumes = monthWorkouts.map(w => {
      const sets = monthSets.filter(s => s.workout_id === w.id);
      return { workout: w, volume: computeVolume(sets) };
    }).sort((a, b) => b.volume - a.volume);
    const bestWorkout = workoutVolumes[0] || null;

    // PRs this month
    const prs = computePRs(monthSets);

    // Workout days for heatmap
    const workoutDaysSet = new Set(monthWorkouts.filter(w => w.type !== 'REST').map(w => w.date.slice(0, 10)));
    const workoutDayTypes: Record<string, WorkoutType> = {};
    monthWorkouts.forEach(w => {
      if (w.type !== 'REST') workoutDayTypes[w.date.slice(0, 10)] = w.type;
    });

    return { totalWorkouts, totalVolume, totalDuration, totalSets, bestWorkout, prs, workoutDaysSet, workoutDayTypes };
  }, [monthWorkouts, monthSets]);

  /* ─── Derived: Body Progress ───────────────────────────────── */
  const bodyProgress = useMemo(() => {
    if (bodyMeasurements.length === 0) return null;
    const sorted = [...bodyMeasurements].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    const monthRange = getMonthRange();
    const monthMeasurements = sorted.filter(m => m.date >= monthRange.start && m.date <= monthRange.end);
    const firstOfMonth = monthMeasurements[0];
    const lastOfMonth = monthMeasurements[monthMeasurements.length - 1];

    const weightChange = (firstOfMonth?.weight && lastOfMonth?.weight)
      ? lastOfMonth.weight - firstOfMonth.weight : null;

    const trends: { label: string; current: number | null; change: number | null }[] = [];
    const fields: { key: keyof BodyMeasurement; label: string }[] = [
      { key: 'chest', label: 'Hrudnik' },
      { key: 'waist', label: 'Pás' },
      { key: 'hips', label: 'Boky' },
      { key: 'biceps', label: 'Biceps' },
      { key: 'thigh', label: 'Stehno' },
    ];
    fields.forEach(({ key, label }) => {
      const val = latest[key] as number | null;
      const firstVal = firstOfMonth?.[key] as number | null;
      const lastVal = lastOfMonth?.[key] as number | null;
      if (val !== null) {
        trends.push({
          label,
          current: val,
          change: (firstVal !== null && lastVal !== null) ? lastVal - firstVal : null,
        });
      }
    });

    return { latest, weightChange, trends };
  }, [bodyMeasurements]);

  /* ─── Calendar Heatmap Data ────────────────────────────────── */
  const calendarDays = useMemo(() => getMonthCalendarDays(), []);

  /* ─── Loading State ────────────────────────────────────────── */
  if (loading) {
    return (
      <>
        <style>{globalStyles}</style>
        <div style={{
          minHeight: '100vh', background: BG, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 40, height: 40, border: `3px solid ${CARD_BORDER}`,
            borderTopColor: ACCENT, borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </>
    );
  }

  const monthName = new Date().toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' });

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{
        minHeight: '100vh', background: BG, color: TEXT,
        padding: '20px 16px 100px', maxWidth: 480, margin: '0 auto',
      }}>
        {/* ─── Header ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 24, animation: 'fadeInUp 0.4s ease both' }}>
          <h1 style={{
            fontSize: 28, fontWeight: 800, margin: 0,
            background: `linear-gradient(135deg, ${TEXT} 0%, ${ACCENT} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Reporty
          </h1>
          <p style={{ fontSize: 13, color: TEXT_MUTED, margin: '4px 0 0' }}>
            {tab === 'week' ? weekRange.label : monthName}
          </p>
        </div>

        {/* ─── Tab Switcher ──────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 4, padding: 4, borderRadius: 12,
          background: 'rgba(255,255,255,0.04)', marginBottom: 24,
          animation: 'fadeInUp 0.4s ease 0.05s both',
        }}>
          {(['week', 'month'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: tab === t ? ACCENT : 'transparent',
                color: tab === t ? '#000' : TEXT_MUTED,
                transition: 'all 0.2s ease',
              }}
            >
              {t === 'week' ? 'Tento Tyzdeh' : 'Mesiac'}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  WEEKLY VIEW                                           */}
        {/* ═══════════════════════════════════════════════════════ */}
        {tab === 'week' && (
          <div>
            {/* ─── Weekly Report Card ────────────────────────────── */}
            <SectionLabel>Tyzdenna karta</SectionLabel>
            <Card delay={0.1}>
              {/* Top stats row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <StatBox
                  label="Treningy"
                  value={weeklyStats.totalWorkouts}
                  icon={<Icons.Dumbbell size={16} color={ACCENT} />}
                  accent
                />
                <StatBox
                  label="Objem"
                  value={weeklyStats.totalVolume > 1000
                    ? `${(weeklyStats.totalVolume / 1000).toFixed(1)}`
                    : weeklyStats.totalVolume}
                  unit={weeklyStats.totalVolume > 1000 ? 't' : 'kg'}
                />
                <StatBox
                  label="Sety"
                  value={weeklyStats.totalSets}
                />
              </div>

              {/* Second row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <StatBox
                  label="Priem. dlzka"
                  value={weeklyStats.avgDuration > 0 ? formatDuration(weeklyStats.avgDuration) : '--'}
                  icon={<Icons.Timer size={16} color={TEXT_MUTED} />}
                />
                <StatBox
                  label="Top skupina"
                  value={weeklyStats.topType
                    ? WORKOUT_LABELS[weeklyStats.topType[0] as WorkoutType] || weeklyStats.topType[0]
                    : '--'}
                />
                <StatBox
                  label="Streak"
                  value={weeklyStats.streak}
                  icon={<Icons.Flame size={16} color={ACCENT} />}
                  accent
                />
              </div>

              {/* ─── vs. Previous Week ──────────────────────────── */}
              <div style={{
                borderTop: `1px solid ${CARD_BORDER}`, paddingTop: 16,
              }}>
                <div style={{
                  fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase',
                  letterSpacing: 1.2, fontWeight: 700, marginBottom: 12,
                }}>
                  vs. minuly tyzdeh
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Treningy', curr: weeklyStats.totalWorkouts, prev: prevWeekStats.totalWorkouts },
                    { label: 'Objem', curr: weeklyStats.totalVolume, prev: prevWeekStats.totalVolume },
                    { label: 'Sety', curr: weeklyStats.totalSets, prev: prevWeekStats.totalSets },
                    { label: 'Celkovy cas', curr: weeklyStats.totalDuration, prev: prevWeekStats.totalDuration },
                  ].map(item => (
                    <div key={item.label} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ fontSize: 13, color: TEXT_MUTED }}>{item.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {item.label === 'Objem'
                            ? `${(item.curr / 1000).toFixed(1)}t`
                            : item.label === 'Celkovy cas'
                              ? formatDuration(item.curr)
                              : item.curr}
                        </span>
                        <ComparisonArrow current={item.curr} previous={item.prev} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* ─── Week Day Breakdown ────────────────────────────── */}
            <div style={{ marginTop: 24 }}>
              <SectionLabel>Dni v tyzdni</SectionLabel>
              <Card delay={0.2}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {DAYS_SK.map((day, i) => {
                    const weekStart = new Date(weekRange.start);
                    const dayDate = new Date(weekStart);
                    dayDate.setDate(weekStart.getDate() + i);
                    const dateStr = dayDate.toISOString().slice(0, 10);
                    const workout = thisWeekWorkouts.find(w => w.date.slice(0, 10) === dateStr);
                    const isToday = dateStr === todayStr();
                    const hasWorkout = workout && workout.type !== 'REST';
                    const color = hasWorkout ? WORKOUT_COLORS[workout.type] || ACCENT : 'transparent';

                    return (
                      <div key={day} style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 8,
                      }}>
                        <div style={{
                          fontSize: 10, fontWeight: 600,
                          color: isToday ? ACCENT : TEXT_DIM,
                          textTransform: 'uppercase',
                        }}>
                          {day}
                        </div>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: hasWorkout ? `${color}20` : 'rgba(255,255,255,0.03)',
                          border: isToday ? `2px solid ${ACCENT}` : `1px solid ${CARD_BORDER}`,
                          transition: 'all 0.3s ease',
                        }}>
                          {hasWorkout ? (
                            <Icons.Check size={16} color={color} />
                          ) : (
                            <div style={{
                              width: 6, height: 6, borderRadius: 3,
                              background: 'rgba(255,255,255,0.1)',
                            }} />
                          )}
                        </div>
                        {hasWorkout && (
                          <div style={{
                            fontSize: 8, fontWeight: 600, color,
                            textTransform: 'uppercase', letterSpacing: 0.5,
                          }}>
                            {WORKOUT_LABELS[workout.type]?.slice(0, 4)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  MONTHLY VIEW                                          */}
        {/* ═══════════════════════════════════════════════════════ */}
        {tab === 'month' && (
          <div>
            {/* ─── Monthly Totals ────────────────────────────────── */}
            <SectionLabel>Mesacny prehlad</SectionLabel>
            <Card delay={0.1}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <StatBox label="Treningy" value={monthlyStats.totalWorkouts} accent />
                <StatBox
                  label="Objem"
                  value={monthlyStats.totalVolume > 1000
                    ? `${(monthlyStats.totalVolume / 1000).toFixed(1)}`
                    : monthlyStats.totalVolume}
                  unit={monthlyStats.totalVolume > 1000 ? 't' : 'kg'}
                />
                <StatBox label="Sety" value={monthlyStats.totalSets} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <StatBox
                  label="Celkovy cas"
                  value={formatDuration(monthlyStats.totalDuration)}
                  icon={<Icons.Timer size={16} color={TEXT_MUTED} />}
                />
                <StatBox
                  label="Priem. objem/trening"
                  value={monthlyStats.totalWorkouts > 0
                    ? `${(monthlyStats.totalVolume / monthlyStats.totalWorkouts / 1000).toFixed(1)}`
                    : '--'}
                  unit="t"
                />
              </div>
            </Card>

            {/* ─── Calendar Heatmap ──────────────────────────────── */}
            <div style={{ marginTop: 24 }}>
              <SectionLabel>Kalendar treningov</SectionLabel>
              <Card delay={0.2}>
                {/* Day headers */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 4, marginBottom: 8,
                }}>
                  {DAYS_SK.map(d => (
                    <div key={d} style={{
                      fontSize: 9, fontWeight: 700, color: TEXT_DIM,
                      textAlign: 'center', textTransform: 'uppercase',
                    }}>
                      {d}
                    </div>
                  ))}
                </div>
                {/* Calendar grid */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 4,
                }}>
                  {/* Empty cells for first week offset */}
                  {calendarDays[0] && Array.from({ length: calendarDays[0].dayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {calendarDays.map(day => {
                    const hasWorkout = monthlyStats.workoutDaysSet.has(day.date);
                    const workoutType = monthlyStats.workoutDayTypes[day.date];
                    const color = workoutType ? WORKOUT_COLORS[workoutType] || ACCENT : ACCENT;
                    return (
                      <div key={day.date} style={{
                        aspectRatio: '1', borderRadius: 8,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        background: hasWorkout ? `${color}20` : 'rgba(255,255,255,0.02)',
                        border: day.isToday ? `2px solid ${ACCENT}` : '1px solid transparent',
                        position: 'relative',
                        transition: 'all 0.2s ease',
                      }}>
                        <span style={{
                          fontSize: 11, fontWeight: day.isToday ? 700 : 500,
                          color: hasWorkout ? color : day.isToday ? ACCENT : TEXT_DIM,
                        }}>
                          {day.dayNum}
                        </span>
                        {hasWorkout && (
                          <div style={{
                            width: 4, height: 4, borderRadius: 2,
                            background: color, marginTop: 2,
                          }} />
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div style={{
                  display: 'flex', gap: 12, marginTop: 16, paddingTop: 12,
                  borderTop: `1px solid ${CARD_BORDER}`, flexWrap: 'wrap',
                }}>
                  {Object.entries(
                    monthWorkouts.reduce<Record<string, number>>((acc, w) => {
                      if (w.type !== 'REST') acc[w.type] = (acc[w.type] || 0) + 1;
                      return acc;
                    }, {})
                  ).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: 4,
                        background: WORKOUT_COLORS[type as WorkoutType] || ACCENT,
                      }} />
                      <span style={{ fontSize: 10, color: TEXT_MUTED }}>
                        {WORKOUT_LABELS[type as WorkoutType]} ({count})
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* ─── Best Workout ───────────────────────────────────── */}
            {monthlyStats.bestWorkout && monthlyStats.bestWorkout.volume > 0 && (
              <div style={{ marginTop: 24 }}>
                <SectionLabel>Najlepsi trening</SectionLabel>
                <Card delay={0.3} style={{
                  background: `linear-gradient(145deg, ${ACCENT}15 0%, ${CARD_BG} 100%)`,
                  border: `1px solid ${ACCENT}30`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 14,
                      background: `${ACCENT}20`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icons.Trophy size={24} color={ACCENT} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>
                        {WORKOUT_LABELS[monthlyStats.bestWorkout.workout.type]}
                      </div>
                      <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                        {formatDate(monthlyStats.bestWorkout.workout.date)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: ACCENT }}>
                        {(monthlyStats.bestWorkout.volume / 1000).toFixed(1)}
                        <span style={{ fontSize: 12, fontWeight: 500 }}>t</span>
                      </div>
                      <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase' }}>
                        Objem
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* ─── PRs This Month ─────────────────────────────────── */}
            {monthlyStats.prs.size > 0 && (
              <div style={{ marginTop: 24 }}>
                <SectionLabel>
                  Osobne rekordy ({monthlyStats.prs.size})
                </SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Array.from(monthlyStats.prs.values())
                    .sort((a, b) => b.estimated1RM - a.estimated1RM)
                    .slice(0, 8)
                    .map((pr, i) => (
                      <Card key={pr.exerciseId} delay={0.3 + i * 0.05} style={{ padding: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: `${ACCENT}15`, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: 14,
                          }}>
                            <Icons.Zap size={18} color={ACCENT} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{pr.exerciseName}</div>
                            <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
                              {pr.weight}kg x {pr.reps} reps
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: ACCENT }}>
                              {pr.estimated1RM}<span style={{ fontSize: 10, fontWeight: 500 }}>kg</span>
                            </div>
                            <div style={{ fontSize: 9, color: TEXT_DIM, textTransform: 'uppercase' }}>
                              Est. 1RM
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              </div>
            )}

            {/* ─── Body Progress ──────────────────────────────────── */}
            {bodyProgress && (
              <div style={{ marginTop: 24 }}>
                <SectionLabel>Telesny pokrok</SectionLabel>
                <Card delay={0.4}>
                  {/* Weight change */}
                  {bodyProgress.weightChange !== null && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginBottom: bodyProgress.trends.length > 0 ? 16 : 0,
                      paddingBottom: bodyProgress.trends.length > 0 ? 16 : 0,
                      borderBottom: bodyProgress.trends.length > 0 ? `1px solid ${CARD_BORDER}` : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 12,
                          background: 'rgba(255,255,255,0.04)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icons.Activity size={20} color={ACCENT} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>Hmotnost</div>
                          <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                            Aktualne: {bodyProgress.latest.weight ?? '--'}kg
                          </div>
                        </div>
                      </div>
                      <div style={{
                        fontSize: 16, fontWeight: 700,
                        color: bodyProgress.weightChange > 0 ? GREEN
                          : bodyProgress.weightChange < 0 ? RED : TEXT_MUTED,
                      }}>
                        {bodyProgress.weightChange > 0 ? '+' : ''}
                        {bodyProgress.weightChange.toFixed(1)}kg
                      </div>
                    </div>
                  )}

                  {/* Measurement trends */}
                  {bodyProgress.trends.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {bodyProgress.trends.map(trend => (
                        <div key={trend.label} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                          <span style={{ fontSize: 13, color: TEXT_MUTED }}>{trend.label}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>
                              {trend.current ?? '--'}<span style={{ fontSize: 10, color: TEXT_DIM }}>cm</span>
                            </span>
                            {trend.change !== null && (
                              <span style={{
                                fontSize: 11, fontWeight: 600,
                                color: trend.change > 0 ? GREEN : trend.change < 0 ? RED : TEXT_DIM,
                              }}>
                                {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ─── Empty State ───────────────────────────────────────── */}
        {!loading && tab === 'week' && weeklyStats.totalWorkouts === 0 && (
          <Card delay={0.2} style={{ textAlign: 'center', marginTop: 24, padding: 40 }}>
            <Icons.BarChart size={48} color={TEXT_DIM} />
            <div style={{ fontSize: 15, fontWeight: 600, color: TEXT_MUTED, marginTop: 16 }}>
              Ziadne treningy tento tyzdeh
            </div>
            <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 8 }}>
              Zacni trenovat a uvidis tu svoje statistiky
            </div>
          </Card>
        )}

        {!loading && tab === 'month' && monthlyStats.totalWorkouts === 0 && (
          <Card delay={0.2} style={{ textAlign: 'center', marginTop: 24, padding: 40 }}>
            <Icons.Calendar size={48} color={TEXT_DIM} />
            <div style={{ fontSize: 15, fontWeight: 600, color: TEXT_MUTED, marginTop: 16 }}>
              Ziadne treningy tento mesiac
            </div>
            <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 8 }}>
              Tvoje mesacne statistiky sa tu objavia
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
