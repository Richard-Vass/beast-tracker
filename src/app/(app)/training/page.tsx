'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { db } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useRestTimer } from '@/hooks/useRestTimer';
import { Icons } from '@/components/Icons';
import { DEFAULT_WORKOUTS, WORKOUT_LABELS, WORKOUT_COLORS } from '@/lib/constants';
import { todayStr, formatTime, formatDuration, getDayOfWeek } from '@/lib/date-utils';
import { computeRecoveryScore, getRecoveryColor, getRecoveryLabel } from '@/lib/scoring';
import { getSmartRest, isCompoundExercise } from '@/lib/suggestions';
import type { WorkoutType, ReadinessData, ExerciseTemplate, WorkoutSetData, UserSchedule, CustomWorkout } from '@/types';

type Screen = 'select' | 'readiness' | 'workout' | 'summary';

/* ═══════════════════════════════════════════════════════════════
   THEME CONSTANTS
   ═══════════════════════════════════════════════════════════════ */
const T = {
  bg: '#0A0A0A',
  card: '#141414',
  cardHover: '#1A1A1A',
  border: '#1E1E1E',
  borderLight: '#2A2A2A',
  orange: '#F57C00',
  orangeLight: '#FF9800',
  orangeDim: 'rgba(245, 124, 0, 0.15)',
  orangeGlow: 'rgba(245, 124, 0, 0.3)',
  green: '#22C55E',
  greenDim: 'rgba(34, 197, 94, 0.15)',
  red: '#EF4444',
  redDim: 'rgba(239, 68, 68, 0.15)',
  yellow: '#F59E0B',
  yellowDim: 'rgba(245, 158, 11, 0.15)',
  white: '#FFFFFF',
  text: '#E5E5E5',
  textSoft: '#A0A0A0',
  textMuted: '#666666',
  radius: 16,
  radiusSm: 10,
  radiusXs: 8,
};

const WORKOUT_SUBTITLES: Record<string, string> = {
  PUSH: 'Chest, Shoulders, Triceps',
  PULL: 'Back, Biceps, Rear Delts',
  LEGS: 'Quads, Hamstrings, Glutes',
  UPPER: 'Chest, Back, Shoulders, Arms',
  LOWER: 'Quads, Hamstrings, Calves',
  FULL: 'All Major Muscle Groups',
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function TrainingPage() {
  const { user } = useAuth();
  const timer = useRestTimer();
  const [screen, setScreen] = useState<Screen>('select');
  const [activeType, setActiveType] = useState<WorkoutType>('PUSH');
  const [readiness, setReadiness] = useState<ReadinessData>({});
  const [exercises, setExercises] = useState<ExerciseTemplate[]>([]);
  const [warmup, setWarmup] = useState<string[]>([]);
  const [warmupChecked, setWarmupChecked] = useState<Record<string, boolean>>({});
  const [warmupOpen, setWarmupOpen] = useState(true);
  const [workoutData, setWorkoutData] = useState<Record<string, WorkoutSetData[]>>({});
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [schedule, setSchedule] = useState<UserSchedule | null>(null);
  const [customWorkouts, setCustomWorkouts] = useState<CustomWorkout[]>([]);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [pressedCard, setPressedCard] = useState<string | null>(null);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const activeExRef = useRef<string | null>(null);

  // ─── Elapsed Timer (ticks every second) ──────────────────
  useEffect(() => {
    if (screen !== 'workout' || !startTime) return;
    const iv = setInterval(() => {
      setElapsed(Math.round((Date.now() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [screen, startTime]);

  // ─── Load schedule & custom workouts ─────────────────────
  useEffect(() => {
    async function load() {
      const [sRes, cwRes] = await Promise.all([
        db.schedule.get(),
        db.customWorkouts.getAll(),
      ]);
      if (sRes.data) setSchedule(sRes.data);
      if (cwRes.data) setCustomWorkouts(cwRes.data);
    }
    load();
  }, []);

  // ─── Summary animation trigger ───────────────────────────
  useEffect(() => {
    if (screen === 'summary') {
      const t = setTimeout(() => setSummaryVisible(true), 50);
      return () => clearTimeout(t);
    }
    setSummaryVisible(false);
  }, [screen]);

  const todaysType = schedule?.schedule?.find(s => s.d === getDayOfWeek())?.t as WorkoutType | undefined;

  // ─── Initialize workout data for exercises ───────────────
  const initWorkout = useCallback((type: WorkoutType) => {
    const custom = customWorkouts.find(c => c.workout_key === type);
    const template = custom || DEFAULT_WORKOUTS[type];
    if (!template) return;

    const exs = custom ? custom.exercises : (template as typeof DEFAULT_WORKOUTS.PUSH).exercises;
    setExercises(exs);
    setWarmup(custom ? custom.warmup : (template as typeof DEFAULT_WORKOUTS.PUSH).warmup);

    const data: Record<string, WorkoutSetData[]> = {};
    for (const ex of exs) {
      data[ex.id] = Array.from({ length: ex.sets }, () => ({
        weight: ex.last || '',
        reps: '',
        rir: ex.rir || '1-2',
        done: false,
      }));
    }
    setWorkoutData(data);
    setWarmupChecked({});
    setWarmupOpen(true);
  }, [customWorkouts]);

  const startWorkout = useCallback((type: WorkoutType) => {
    setActiveType(type);
    initWorkout(type);
    setScreen('readiness');
  }, [initWorkout]);

  const confirmReadiness = useCallback(() => {
    setStartTime(new Date());
    setElapsed(0);
    setScreen('workout');
  }, []);

  // ─── Update set data ────────────────────────────────────
  const updateSet = useCallback((exId: string, setIdx: number, field: keyof WorkoutSetData, value: unknown) => {
    setWorkoutData(prev => {
      const copy = { ...prev };
      copy[exId] = [...(copy[exId] || [])];
      copy[exId][setIdx] = { ...copy[exId][setIdx], [field]: value };
      return copy;
    });
  }, []);

  // ─── Mark set as done & start rest timer ─────────────────
  const completeSet = useCallback((exId: string, setIdx: number) => {
    updateSet(exId, setIdx, 'done', true);
    const set = workoutData[exId]?.[setIdx];
    const weight = parseFloat(String(set?.weight)) || 0;
    const rir = parseFloat(String(set?.rir)) || 2;
    const rest = getSmartRest(rir, weight, isCompoundExercise(exId));
    timer.start(rest);
    activeExRef.current = exId;
  }, [workoutData, timer, updateSet]);

  // ─── Undo set ────────────────────────────────────────────
  const undoSet = useCallback((exId: string, setIdx: number) => {
    updateSet(exId, setIdx, 'done', false);
  }, [updateSet]);

  // ─── Compute progress ───────────────────────────────────
  const progress = useMemo(() => {
    let total = 0, done = 0;
    for (const sets of Object.values(workoutData)) {
      total += sets.length;
      done += sets.filter(s => s.done).length;
    }
    return total > 0 ? done / total : 0;
  }, [workoutData]);

  const completedSets = useMemo(() =>
    Object.values(workoutData).flat().filter(s => s.done).length,
  [workoutData]);

  const totalSets = useMemo(() =>
    Object.values(workoutData).flat().length,
  [workoutData]);

  // ─── Total volume ───────────────────────────────────────
  const totalVolume = useMemo(() => {
    let vol = 0;
    for (const sets of Object.values(workoutData)) {
      for (const s of sets) {
        if (s.done) vol += (parseFloat(String(s.weight)) || 0) * (parseFloat(String(s.reps)) || 0);
      }
    }
    return vol;
  }, [workoutData]);

  // ─── Save workout ───────────────────────────────────────
  const saveWorkout = useCallback(async () => {
    if (!user || saving) return;
    setSaving(true);

    try {
      const duration = startTime ? Math.round((Date.now() - startTime.getTime()) / 1000) : 0;

      const { data: workout } = await db.workouts.create({
        user_id: user.id,
        date: new Date().toISOString(),
        type: activeType,
        duration,
        readiness,
        notes,
      });

      if (workout) {
        const sets = [];
        for (const ex of exercises) {
          const exSets = workoutData[ex.id] || [];
          for (let i = 0; i < exSets.length; i++) {
            const s = exSets[i];
            if (s.done) {
              sets.push({
                workout_id: workout.id,
                exercise_id: ex.id,
                exercise_name: ex.name,
                set_number: i + 1,
                weight: parseFloat(String(s.weight)) || null,
                reps: parseInt(String(s.reps)) || null,
                rir: String(s.rir || ''),
                tempo: s.tempo || '',
                done: true,
              });
            }
          }
        }

        if (sets.length > 0) {
          await db.workoutSets.createMany(sets);
        }

        if (readiness.weight || readiness.sleep) {
          await db.healthLogs.upsert({
            user_id: user.id,
            date: todayStr(),
            weight: readiness.weight || null,
            sleep_hours: readiness.sleep || null,
            stress: readiness.stress || null,
            energy: readiness.energy || null,
            hrv: readiness.hrv || null,
            rhr: readiness.rhr || null,
            body_battery: readiness.bodyBattery || null,
            sleep_score: readiness.sleepScore || null,
            steps: readiness.steps || null,
            source: 'manual',
          }, 'user_id,date');
        }
      }

      setScreen('summary');
    } catch (err) {
      console.error('Failed to save workout:', err);
    } finally {
      setSaving(false);
    }
  }, [user, saving, startTime, activeType, readiness, notes, exercises, workoutData]);

  const recoveryScore = useMemo(() => computeRecoveryScore(readiness), [readiness]);

  /* ═══════════════════════════════════════════════════════════
     SCREEN 1: SELECT
     ═══════════════════════════════════════════════════════════ */
  if (screen === 'select') {
    const workoutTypes: WorkoutType[] = ['PUSH', 'PULL', 'LEGS', 'UPPER', 'LOWER', 'FULL'];

    return (
      <div style={{
        minHeight: '100vh',
        background: T.bg,
        padding: '0 16px 100px',
        maxWidth: 480,
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 0 8px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
            Beast Tracker
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: T.white, margin: 0, letterSpacing: -0.5 }}>
            Start Training
          </h1>
        </div>

        {/* Today's Recommended */}
        {todaysType && todaysType !== 'REST' && (
          <button
            onClick={() => startWorkout(todaysType)}
            onPointerDown={() => setPressedCard('today')}
            onPointerUp={() => setPressedCard(null)}
            onPointerLeave={() => setPressedCard(null)}
            style={{
              width: '100%',
              padding: 0,
              marginTop: 20,
              marginBottom: 8,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              transform: pressedCard === 'today' ? 'scale(0.98)' : 'scale(1)',
              transition: 'transform 0.15s ease',
            }}
          >
            <div style={{
              background: `linear-gradient(135deg, ${WORKOUT_COLORS[todaysType]}22 0%, ${WORKOUT_COLORS[todaysType]}08 100%)`,
              border: `1px solid ${WORKOUT_COLORS[todaysType]}40`,
              borderRadius: T.radius,
              padding: '20px 20px',
              textAlign: 'left',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Accent glow */}
              <div style={{
                position: 'absolute',
                top: -40,
                right: -40,
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${WORKOUT_COLORS[todaysType]}20 0%, transparent 70%)`,
              }} />
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: WORKOUT_COLORS[todaysType],
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <Icons.Zap size={12} color={WORKOUT_COLORS[todaysType]} />
                Today&apos;s Recommended
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.white, marginBottom: 4 }}>
                {WORKOUT_LABELS[todaysType]}
              </div>
              <div style={{ fontSize: 13, color: T.textSoft }}>
                {WORKOUT_SUBTITLES[todaysType] || DEFAULT_WORKOUTS[todaysType]?.subtitle || ''}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 12,
                fontSize: 13,
                fontWeight: 600,
                color: WORKOUT_COLORS[todaysType],
              }}>
                Start workout
                <Icons.ChevronRight size={16} color={WORKOUT_COLORS[todaysType]} />
              </div>
            </div>
          </button>
        )}

        {/* Section Label */}
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: T.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          marginTop: 24,
          marginBottom: 12,
          paddingLeft: 4,
        }}>
          Choose Workout
        </div>

        {/* Workout Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {workoutTypes.map(type => {
            const exCount = DEFAULT_WORKOUTS[type]?.exercises?.length || 0;
            const isPressed = pressedCard === type;
            return (
              <button
                key={type}
                onClick={() => startWorkout(type)}
                onPointerDown={() => setPressedCard(type)}
                onPointerUp={() => setPressedCard(null)}
                onPointerLeave={() => setPressedCard(null)}
                style={{
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  borderRadius: T.radius,
                  padding: '18px 16px',
                  color: T.white,
                  textAlign: 'left',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  position: 'relative',
                  overflow: 'hidden',
                  transform: isPressed ? 'scale(0.96)' : 'scale(1)',
                  transition: 'transform 0.15s ease, border-color 0.2s ease',
                  borderLeft: `3px solid ${WORKOUT_COLORS[type]}`,
                }}
              >
                <div style={{
                  fontSize: 17,
                  fontWeight: 700,
                  marginBottom: 4,
                  color: T.white,
                }}>
                  {WORKOUT_LABELS[type]}
                </div>
                <div style={{
                  fontSize: 11,
                  color: T.textMuted,
                  lineHeight: 1.3,
                  marginBottom: 10,
                }}>
                  {WORKOUT_SUBTITLES[type] || ''}
                </div>
                <div style={{
                  fontSize: 11,
                  color: T.textSoft,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <Icons.Dumbbell size={12} color={T.textMuted} />
                  {exCount} exercises
                </div>
              </button>
            );
          })}
        </div>

        {/* Z2 Cardio */}
        <button
          onClick={() => startWorkout('Z2')}
          onPointerDown={() => setPressedCard('Z2')}
          onPointerUp={() => setPressedCard(null)}
          onPointerLeave={() => setPressedCard(null)}
          style={{
            width: '100%',
            marginTop: 12,
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: T.radius,
            padding: '16px 20px',
            color: T.white,
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            transform: pressedCard === 'Z2' ? 'scale(0.98)' : 'scale(1)',
            transition: 'transform 0.15s ease',
            borderLeft: `3px solid ${WORKOUT_COLORS.Z2}`,
          }}
        >
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: `${WORKOUT_COLORS.Z2}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icons.Heart size={20} color={WORKOUT_COLORS.Z2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Zone 2 Cardio</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>Low-intensity steady state</div>
          </div>
          <Icons.ChevronRight size={18} color={T.textMuted} />
        </button>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     SCREEN 2: READINESS CHECK
     ═══════════════════════════════════════════════════════════ */
  if (screen === 'readiness') {
    const recoveryColor = getRecoveryColor(recoveryScore);
    const recoveryLabel = getRecoveryLabel(recoveryScore);
    const circumference = 2 * Math.PI * 54;
    const dashOffset = circumference - (circumference * recoveryScore) / 100;

    const primaryFields = [
      { key: 'weight', label: 'Weight', unit: 'kg', type: 'number' as const, step: '0.1', icon: Icons.Activity },
      { key: 'sleep', label: 'Sleep', unit: 'hours', type: 'number' as const, step: '0.5', icon: Icons.Moon },
    ];

    const sliderFields = [
      { key: 'stress', label: 'Stress Level', min: 1, max: 10, icon: Icons.Zap },
      { key: 'energy', label: 'Energy Level', min: 1, max: 10, icon: Icons.Flame },
    ];

    const optionalFields = [
      { key: 'hrv', label: 'HRV', unit: 'ms', icon: Icons.Activity },
      { key: 'rhr', label: 'RHR', unit: 'bpm', icon: Icons.Heart },
      { key: 'bodyBattery', label: 'Body Battery', unit: '', icon: Icons.Zap },
      { key: 'sleepScore', label: 'Sleep Score', unit: '', icon: Icons.Moon },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: T.bg,
        padding: '0 16px 40px',
        maxWidth: 480,
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '20px 0 16px',
        }}>
          <button
            onClick={() => setScreen('select')}
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: T.radiusSm,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: T.textSoft,
            }}
          >
            <Icons.ChevronLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: T.white, margin: 0 }}>
              Readiness Check
            </h1>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
              Pre-workout health assessment
            </div>
          </div>
        </div>

        {/* Recovery Score Ring */}
        <div style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 20,
          padding: '28px 20px',
          marginBottom: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 12 }}>
            <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
              {/* Background ring */}
              <circle
                cx="70" cy="70" r="54"
                fill="none"
                stroke={T.border}
                strokeWidth="10"
              />
              {/* Progress ring */}
              <circle
                cx="70" cy="70" r="54"
                fill="none"
                stroke={recoveryColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 38,
                fontWeight: 800,
                color: recoveryColor,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {recoveryScore}
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                / 100
              </div>
            </div>
          </div>
          <div style={{
            fontSize: 15,
            fontWeight: 700,
            color: recoveryColor,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            {recoveryLabel}
          </div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>
            Recovery Score
          </div>
        </div>

        {/* Primary Fields */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          {primaryFields.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.key} style={{
                flex: 1,
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: T.radius,
                padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Icon size={14} color={T.orange} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.textSoft }}>{f.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <input
                    type="number"
                    step={f.step}
                    inputMode="decimal"
                    value={String((readiness as Record<string, unknown>)[f.key] || '')}
                    onChange={e => setReadiness(p => ({ ...p, [f.key]: parseFloat(e.target.value) || undefined }))}
                    placeholder="--"
                    style={{
                      width: '100%',
                      padding: '6px 0',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: `2px solid ${T.borderLight}`,
                      fontSize: 24,
                      fontWeight: 700,
                      color: T.white,
                      outline: 'none',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                  <span style={{ fontSize: 12, color: T.textMuted, flexShrink: 0 }}>{f.unit}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Slider Fields */}
        {sliderFields.map(f => {
          const val = (readiness as Record<string, unknown>)[f.key] as number || f.min;
          const Icon = f.icon;
          const pct = ((val - f.min) / (f.max - f.min)) * 100;
          return (
            <div key={f.key} style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: T.radius,
              padding: '14px 16px',
              marginBottom: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={14} color={T.orange} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.textSoft }}>{f.label}</span>
                </div>
                <span style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: T.orange,
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: 30,
                  textAlign: 'right',
                }}>
                  {val}
                </span>
              </div>
              <div style={{ position: 'relative', height: 32, display: 'flex', alignItems: 'center' }}>
                <div style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: 6,
                  background: T.border,
                  borderRadius: 3,
                }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${T.orange}, ${T.orangeLight})`,
                    borderRadius: 3,
                    transition: 'width 0.15s ease',
                  }} />
                </div>
                <input
                  type="range"
                  min={f.min}
                  max={f.max}
                  value={val}
                  onChange={e => setReadiness(p => ({ ...p, [f.key]: parseInt(e.target.value) }))}
                  style={{
                    width: '100%',
                    height: 32,
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: 1,
                    margin: 0,
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* Optional Fields */}
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: T.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          marginTop: 16,
          marginBottom: 10,
          paddingLeft: 4,
        }}>
          Optional Metrics
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {optionalFields.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.key} style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: T.radius,
                padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Icon size={12} color={T.textMuted} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted }}>{f.label}</span>
                  {f.unit && <span style={{ fontSize: 10, color: T.textMuted }}>({f.unit})</span>}
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  value={String((readiness as Record<string, unknown>)[f.key] || '')}
                  onChange={e => setReadiness(p => ({ ...p, [f.key]: parseFloat(e.target.value) || undefined }))}
                  placeholder="--"
                  style={{
                    width: '100%',
                    padding: '4px 0',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${T.borderLight}`,
                    fontSize: 20,
                    fontWeight: 700,
                    color: T.white,
                    outline: 'none',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Start Button */}
        <button
          onClick={confirmReadiness}
          style={{
            width: '100%',
            padding: '18px 24px',
            background: `linear-gradient(135deg, ${T.orange}, ${T.orangeLight})`,
            border: 'none',
            borderRadius: T.radius,
            color: T.white,
            fontSize: 17,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: `0 4px 24px ${T.orangeGlow}`,
            WebkitTapHighlightColor: 'transparent',
            letterSpacing: 0.3,
          }}
        >
          Start {WORKOUT_LABELS[activeType]}
          <Icons.ChevronRight size={20} color={T.white} />
        </button>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     SCREEN 3: WORKOUT (The Core Experience)
     ═══════════════════════════════════════════════════════════ */
  if (screen === 'workout') {
    const accentColor = WORKOUT_COLORS[activeType] || T.orange;
    const timerCircumference = 2 * Math.PI * 44;
    const timerDashOffset = timerCircumference - (timerCircumference * timer.progress);

    return (
      <div style={{
        minHeight: '100vh',
        background: T.bg,
        paddingBottom: 120,
      }}>
        {/* ─── Sticky Top Bar ─────────────────────────────── */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: `${T.bg}F0`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${T.border}`,
        }}>
          <div style={{
            maxWidth: 480,
            margin: '0 auto',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 8,
                height: 32,
                borderRadius: 4,
                background: accentColor,
              }} />
              <div>
                <div style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: T.white,
                  letterSpacing: -0.3,
                }}>
                  {WORKOUT_LABELS[activeType]}
                </div>
                <div style={{
                  fontSize: 13,
                  color: T.textSoft,
                  fontVariantNumeric: 'tabular-nums',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Icons.Timer size={12} color={T.textMuted} />
                    {formatDuration(elapsed)}
                  </span>
                  <span style={{ color: T.textMuted }}>|</span>
                  <span>{Math.round(progress * 100)}% done</span>
                </div>
              </div>
            </div>
            <button
              onClick={saveWorkout}
              disabled={saving}
              style={{
                background: progress >= 0.8 ? T.green : T.card,
                border: `1px solid ${progress >= 0.8 ? T.green : T.border}`,
                borderRadius: T.radiusSm,
                padding: '10px 20px',
                color: T.white,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.3s ease',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Finish'}
            </button>
          </div>

          {/* ─── Progress Bar ─────────────────────────────── */}
          <div style={{
            height: 3,
            background: T.border,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              background: `linear-gradient(90deg, ${accentColor}, ${accentColor}CC)`,
              width: `${progress * 100}%`,
              transition: 'width 0.4s ease',
              boxShadow: `0 0 8px ${accentColor}60`,
            }} />
          </div>
        </div>

        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px' }}>

          {/* ─── Rest Timer ─────────────────────────────────── */}
          {timer.isRunning && (
            <div style={{
              background: T.card,
              border: `1px solid ${T.orange}50`,
              borderRadius: 20,
              padding: '24px 20px',
              marginTop: 16,
              marginBottom: 8,
              textAlign: 'center',
              boxShadow: `0 0 40px ${T.orangeDim}`,
              animation: 'restPulse 2s ease-in-out infinite',
            }}>
              <style>{`
                @keyframes restPulse {
                  0%, 100% { box-shadow: 0 0 20px ${T.orangeDim}; }
                  50% { box-shadow: 0 0 40px ${T.orangeGlow}; }
                }
                @keyframes timerSpin {
                  from { transform: rotate(-90deg); }
                }
              `}</style>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: T.orange,
                textTransform: 'uppercase',
                letterSpacing: 2,
                marginBottom: 16,
              }}>
                Rest Timer
              </div>

              {/* Circular progress */}
              <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 16px' }}>
                <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="55" cy="55" r="44" fill="none" stroke={T.border} strokeWidth="6" />
                  <circle
                    cx="55" cy="55" r="44"
                    fill="none"
                    stroke={T.orange}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={timerCircumference}
                    strokeDashoffset={timerDashOffset}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}>
                  <div style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: T.white,
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                  }}>
                    {formatTime(timer.timeLeft)}
                  </div>
                </div>
              </div>

              {/* Timer controls */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                <button
                  onClick={() => timer.addTime(-15)}
                  style={{
                    background: T.border,
                    border: 'none',
                    borderRadius: T.radiusXs,
                    padding: '10px 16px',
                    color: T.textSoft,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  -15s
                </button>
                <button
                  onClick={() => timer.stop()}
                  style={{
                    background: T.orange,
                    border: 'none',
                    borderRadius: T.radiusXs,
                    padding: '10px 24px',
                    color: T.white,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Skip
                </button>
                <button
                  onClick={() => timer.addTime(15)}
                  style={{
                    background: T.border,
                    border: 'none',
                    borderRadius: T.radiusXs,
                    padding: '10px 16px',
                    color: T.textSoft,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  +15s
                </button>
              </div>
            </div>
          )}

          {/* ─── Warmup Section ──────────────────────────────── */}
          {warmup.length > 0 && (
            <div style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: T.radius,
              marginTop: 16,
              marginBottom: 8,
              overflow: 'hidden',
            }}>
              <button
                onClick={() => setWarmupOpen(o => !o)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  color: T.textSoft,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icons.Flame size={14} color={T.yellow} />
                  <span style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: T.textSoft,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}>
                    Warm-up
                  </span>
                  <span style={{
                    fontSize: 11,
                    color: T.textMuted,
                    background: T.border,
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontWeight: 600,
                  }}>
                    {Object.values(warmupChecked).filter(Boolean).length}/{warmup.length}
                  </span>
                </div>
                <div style={{
                  transform: warmupOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}>
                  <Icons.ChevronDown size={16} color={T.textMuted} />
                </div>
              </button>

              {warmupOpen && (
                <div style={{ padding: '0 16px 14px' }}>
                  {warmup.map((w, i) => {
                    const checked = warmupChecked[`w${i}`] || false;
                    return (
                      <label key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 0',
                        borderTop: i > 0 ? `1px solid ${T.border}` : 'none',
                        cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent',
                      }}>
                        <div style={{
                          width: 24,
                          height: 24,
                          borderRadius: 7,
                          border: checked ? 'none' : `2px solid ${T.borderLight}`,
                          background: checked ? T.green : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.2s ease',
                        }}>
                          {checked && <Icons.Check size={14} color={T.white} />}
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setWarmupChecked(p => ({ ...p, [`w${i}`]: !p[`w${i}`] }))}
                          style={{ display: 'none' }}
                        />
                        <span style={{
                          fontSize: 14,
                          color: checked ? T.textMuted : T.text,
                          textDecoration: checked ? 'line-through' : 'none',
                          transition: 'all 0.2s ease',
                        }}>
                          {w}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── Exercise Cards ───────────────────────────────── */}
          {exercises.map((ex, exIdx) => {
            const sets = workoutData[ex.id] || [];
            const allDone = sets.length > 0 && sets.every(s => s.done);
            const doneSets = sets.filter(s => s.done).length;

            return (
              <div key={ex.id} style={{
                background: T.card,
                border: `1px solid ${allDone ? `${T.green}60` : T.border}`,
                borderRadius: T.radius,
                marginTop: 12,
                overflow: 'hidden',
                transition: 'border-color 0.4s ease',
              }}>
                {/* Exercise Header */}
                <div style={{
                  padding: '16px 16px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 4,
                    }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: accentColor,
                        background: `${accentColor}18`,
                        borderRadius: 5,
                        padding: '2px 7px',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {exIdx + 1}
                      </span>
                      <span style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: allDone ? T.textMuted : T.white,
                        transition: 'color 0.3s ease',
                      }}>
                        {ex.name}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: T.textMuted,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      paddingLeft: 2,
                    }}>
                      <span>{ex.sets} x {ex.reps}</span>
                      <span style={{ opacity: 0.4 }}>|</span>
                      <span>RIR {ex.rir}</span>
                      <span style={{ opacity: 0.4 }}>|</span>
                      <span>{ex.rest}s rest</span>
                    </div>
                  </div>
                  {allDone && (
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      background: T.greenDim,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icons.Check size={16} color={T.green} />
                    </div>
                  )}
                  {!allDone && doneSets > 0 && (
                    <span style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: T.textMuted,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {doneSets}/{sets.length}
                    </span>
                  )}
                </div>

                {/* Set Table Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr 1fr 56px 48px',
                  gap: 6,
                  padding: '0 16px 8px',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', textAlign: 'center' }}>Set</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', textAlign: 'center' }}>Weight</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', textAlign: 'center' }}>Reps</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', textAlign: 'center' }}>RIR</span>
                  <span />
                </div>

                {/* Set Rows */}
                {sets.map((set, i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 1fr 1fr 56px 48px',
                    gap: 6,
                    padding: '4px 16px',
                    alignItems: 'center',
                    opacity: set.done ? 0.45 : 1,
                    transition: 'opacity 0.3s ease',
                    background: set.done ? `${T.green}06` : 'transparent',
                  }}>
                    {/* Set number */}
                    <div style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: set.done ? T.green : T.textMuted,
                      textAlign: 'center',
                    }}>
                      {set.done ? (
                        <Icons.Check size={16} color={T.green} />
                      ) : (
                        i + 1
                      )}
                    </div>

                    {/* Weight input */}
                    <input
                      type="number"
                      inputMode="decimal"
                      step="2.5"
                      value={String(set.weight)}
                      onChange={e => updateSet(ex.id, i, 'weight', e.target.value)}
                      disabled={set.done}
                      placeholder={ex.last ? String(ex.last) : '--'}
                      style={{
                        padding: '10px 6px',
                        fontSize: 16,
                        fontWeight: 700,
                        color: T.white,
                        background: set.done ? 'transparent' : T.bg,
                        border: set.done ? 'none' : `1px solid ${T.border}`,
                        borderRadius: T.radiusXs,
                        textAlign: 'center',
                        outline: 'none',
                        fontVariantNumeric: 'tabular-nums',
                        width: '100%',
                        boxSizing: 'border-box',
                        WebkitAppearance: 'none',
                        MozAppearance: 'textfield' as unknown as string,
                      }}
                    />

                    {/* Reps input */}
                    <input
                      type="number"
                      inputMode="numeric"
                      value={String(set.reps)}
                      onChange={e => updateSet(ex.id, i, 'reps', e.target.value)}
                      disabled={set.done}
                      placeholder={ex.reps?.split('-')[0] || '--'}
                      style={{
                        padding: '10px 6px',
                        fontSize: 16,
                        fontWeight: 700,
                        color: T.white,
                        background: set.done ? 'transparent' : T.bg,
                        border: set.done ? 'none' : `1px solid ${T.border}`,
                        borderRadius: T.radiusXs,
                        textAlign: 'center',
                        outline: 'none',
                        fontVariantNumeric: 'tabular-nums',
                        width: '100%',
                        boxSizing: 'border-box',
                        WebkitAppearance: 'none',
                        MozAppearance: 'textfield' as unknown as string,
                      }}
                    />

                    {/* RIR input */}
                    <input
                      type="text"
                      inputMode="numeric"
                      value={set.rir}
                      onChange={e => updateSet(ex.id, i, 'rir', e.target.value)}
                      disabled={set.done}
                      placeholder={ex.rir || '--'}
                      style={{
                        padding: '10px 4px',
                        fontSize: 14,
                        fontWeight: 600,
                        color: T.textSoft,
                        background: set.done ? 'transparent' : T.bg,
                        border: set.done ? 'none' : `1px solid ${T.border}`,
                        borderRadius: T.radiusXs,
                        textAlign: 'center',
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    />

                    {/* Done / Undo button */}
                    <button
                      onClick={() => set.done ? undoSet(ex.id, i) : completeSet(ex.id, i)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: T.radiusSm,
                        border: 'none',
                        background: set.done
                          ? T.green
                          : T.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent',
                        transition: 'all 0.2s ease',
                        boxShadow: set.done ? `0 2px 8px ${T.green}40` : 'none',
                      }}
                    >
                      <Icons.Check size={20} color={set.done ? T.white : T.textMuted} />
                    </button>
                  </div>
                ))}

                {/* Spacer after last set row */}
                <div style={{ height: 12 }} />
              </div>
            );
          })}

          {/* ─── Notes ──────────────────────────────────────── */}
          <div style={{ marginTop: 16 }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 8,
              paddingLeft: 4,
            }}>
              Workout Notes
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="How did the workout feel? Any adjustments needed..."
              rows={3}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: T.radius,
                color: T.text,
                fontSize: 14,
                lineHeight: 1.5,
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* ─── Bottom Stats Bar ───────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 10,
            marginTop: 16,
          }}>
            {[
              { value: `${Math.round(totalVolume).toLocaleString()}`, label: 'Volume (kg)', icon: Icons.BarChart },
              { value: `${completedSets}/${totalSets}`, label: 'Sets', icon: Icons.Check },
              { value: formatDuration(elapsed), label: 'Duration', icon: Icons.Timer },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} style={{
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  borderRadius: T.radius,
                  padding: '16px 12px',
                  textAlign: 'center',
                }}>
                  <Icon size={14} color={T.textMuted} />
                  <div style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: T.white,
                    marginTop: 6,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     SCREEN 4: SUMMARY
     ═══════════════════════════════════════════════════════════ */
  const finalDuration = startTime ? Math.round((Date.now() - startTime.getTime()) / 1000) : elapsed;
  const exerciseSummaries = exercises.map(ex => {
    const sets = (workoutData[ex.id] || []).filter(s => s.done);
    if (sets.length === 0) return null;
    const topSet = sets.reduce<{ weight: number; reps: number; vol: number }>((best, s) => {
      const w = parseFloat(String(s.weight)) || 0;
      const r = parseFloat(String(s.reps)) || 0;
      const vol = w * r;
      return vol > best.vol ? { weight: w, reps: r, vol } : best;
    }, { weight: 0, reps: 0, vol: 0 });
    return { name: ex.name, sets: sets.length, topSet };
  }).filter(Boolean);

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      padding: '0 16px 40px',
      maxWidth: 480,
      margin: '0 auto',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* CSS confetti animation */}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes fadeSlideUp {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      {/* Confetti particles */}
      {summaryVisible && Array.from({ length: 24 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: 0,
          left: `${(i * 17 + 7) % 100}%`,
          width: i % 3 === 0 ? 8 : 6,
          height: i % 3 === 0 ? 8 : 6,
          borderRadius: i % 2 === 0 ? '50%' : 2,
          background: [T.orange, T.green, T.yellow, '#3B82F6', '#EC4899', '#8B5CF6'][i % 6],
          animation: `confettiFall ${2 + (i % 3) * 0.8}s ${i * 0.1}s ease-out forwards`,
          opacity: 0.8,
          zIndex: 0,
        }} />
      ))}

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        paddingTop: 60,
        opacity: summaryVisible ? 1 : 0,
        transform: summaryVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.6s ease',
      }}>
        {/* Trophy icon */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          background: `linear-gradient(135deg, ${WORKOUT_COLORS[activeType]}30, ${WORKOUT_COLORS[activeType]}10)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          border: `1px solid ${WORKOUT_COLORS[activeType]}40`,
          animation: summaryVisible ? 'scaleIn 0.4s 0.2s ease both' : 'none',
        }}>
          <Icons.Trophy size={36} color={WORKOUT_COLORS[activeType]} />
        </div>

        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          color: T.white,
          margin: '0 0 6px',
          textAlign: 'center',
          letterSpacing: -0.5,
        }}>
          Workout Complete!
        </h1>
        <div style={{
          fontSize: 14,
          color: T.textSoft,
          textAlign: 'center',
          marginBottom: 32,
        }}>
          {WORKOUT_LABELS[activeType]} &middot; {formatDuration(finalDuration)}
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginBottom: 24,
        }}>
          {[
            { value: formatDuration(finalDuration), label: 'Duration', icon: Icons.Timer },
            { value: `${Math.round(totalVolume).toLocaleString()}`, label: 'Volume (kg)', icon: Icons.BarChart },
            { value: String(completedSets), label: 'Sets Done', icon: Icons.Check },
            { value: String(exerciseSummaries.length), label: 'Exercises', icon: Icons.Dumbbell },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: T.radius,
                padding: '20px 16px',
                textAlign: 'center',
                animation: summaryVisible ? `fadeSlideUp 0.4s ${0.3 + i * 0.1}s ease both` : 'none',
              }}>
                <Icon size={16} color={T.textMuted} />
                <div style={{
                  fontSize: 26,
                  fontWeight: 800,
                  color: T.white,
                  marginTop: 8,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Exercise Breakdown */}
        <div style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          overflow: 'hidden',
          marginBottom: 24,
          animation: summaryVisible ? 'fadeSlideUp 0.4s 0.7s ease both' : 'none',
        }}>
          <div style={{
            padding: '14px 16px 10px',
            fontSize: 11,
            fontWeight: 700,
            color: T.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
          }}>
            Exercise Breakdown
          </div>
          {exerciseSummaries.map((ex, i) => {
            if (!ex) return null;
            return (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderTop: `1px solid ${T.border}`,
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
                    {ex.name}
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                    {ex.sets} sets completed
                  </div>
                </div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: T.orange,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {ex.topSet.weight} x {ex.topSet.reps}
                </div>
              </div>
            );
          })}
        </div>

        {/* Done Button */}
        <button
          onClick={() => {
            setScreen('select');
            setWorkoutData({});
            setExercises([]);
            setNotes('');
            setReadiness({});
          }}
          style={{
            width: '100%',
            padding: '18px 24px',
            background: `linear-gradient(135deg, ${T.orange}, ${T.orangeLight})`,
            border: 'none',
            borderRadius: T.radius,
            color: T.white,
            fontSize: 17,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: `0 4px 24px ${T.orangeGlow}`,
            WebkitTapHighlightColor: 'transparent',
            animation: summaryVisible ? 'fadeSlideUp 0.4s 0.9s ease both' : 'none',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
