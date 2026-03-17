'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { db } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useRestTimer } from '@/hooks/useRestTimer';
import { Icons } from '@/components/Icons';
import { DEFAULT_WORKOUTS, WORKOUT_LABELS, WORKOUT_COLORS } from '@/lib/constants';
import { todayStr, formatTime, formatDuration, getDayOfWeek } from '@/lib/date-utils';
import { computeRecoveryScore, getRecoveryColor, getRecoveryLabel } from '@/lib/scoring';
import { getSmartRest, isCompoundExercise, getWeightSuggestion } from '@/lib/suggestions';
import type { WorkoutType, ReadinessData, ExerciseTemplate, WorkoutSetData, UserSchedule, CustomWorkout, Workout } from '@/types';

type Screen = 'select' | 'readiness' | 'workout' | 'summary';

export default function TrainingPage() {
  const { user } = useAuth();
  const timer = useRestTimer();
  const [screen, setScreen] = useState<Screen>('select');
  const [activeType, setActiveType] = useState<WorkoutType>('PUSH');
  const [readiness, setReadiness] = useState<ReadinessData>({});
  const [exercises, setExercises] = useState<ExerciseTemplate[]>([]);
  const [warmup, setWarmup] = useState<string[]>([]);
  const [warmupChecked, setWarmupChecked] = useState<Record<string, boolean>>({});
  const [workoutData, setWorkoutData] = useState<Record<string, WorkoutSetData[]>>({});
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [schedule, setSchedule] = useState<UserSchedule | null>(null);
  const [customWorkouts, setCustomWorkouts] = useState<CustomWorkout[]>([]);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const activeExRef = useRef<string | null>(null);

  // Load schedule & custom workouts
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

  const todaysType = schedule?.schedule?.find(s => s.d === getDayOfWeek())?.t as WorkoutType | undefined;

  // Initialize workout data for exercises
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
  }, [customWorkouts]);

  const startWorkout = useCallback((type: WorkoutType) => {
    setActiveType(type);
    initWorkout(type);
    setScreen('readiness');
  }, [initWorkout]);

  const confirmReadiness = useCallback(() => {
    setStartTime(new Date());
    setScreen('workout');
  }, []);

  // Update set data
  const updateSet = useCallback((exId: string, setIdx: number, field: keyof WorkoutSetData, value: unknown) => {
    setWorkoutData(prev => {
      const copy = { ...prev };
      copy[exId] = [...(copy[exId] || [])];
      copy[exId][setIdx] = { ...copy[exId][setIdx], [field]: value };
      return copy;
    });
  }, []);

  // Mark set as done & start rest timer
  const completeSet = useCallback((exId: string, setIdx: number) => {
    updateSet(exId, setIdx, 'done', true);
    const set = workoutData[exId]?.[setIdx];
    const weight = parseFloat(String(set?.weight)) || 0;
    const rir = parseFloat(String(set?.rir)) || 2;
    const rest = getSmartRest(rir, weight, isCompoundExercise(exId));
    timer.start(rest);
    activeExRef.current = exId;
  }, [workoutData, timer, updateSet]);

  // Compute progress
  const progress = useMemo(() => {
    let total = 0, done = 0;
    for (const sets of Object.values(workoutData)) {
      total += sets.length;
      done += sets.filter(s => s.done).length;
    }
    return total > 0 ? done / total : 0;
  }, [workoutData]);

  // Total volume
  const totalVolume = useMemo(() => {
    let vol = 0;
    for (const sets of Object.values(workoutData)) {
      for (const s of sets) {
        if (s.done) vol += (parseFloat(String(s.weight)) || 0) * (parseFloat(String(s.reps)) || 0);
      }
    }
    return vol;
  }, [workoutData]);

  // Save workout
  const saveWorkout = useCallback(async () => {
    if (!user || saving) return;
    setSaving(true);

    try {
      const duration = startTime ? Math.round((Date.now() - startTime.getTime()) / 1000) : 0;

      // Create workout
      const { data: workout } = await db.workouts.create({
        user_id: user.id,
        date: new Date().toISOString(),
        type: activeType,
        duration,
        readiness,
        notes,
      });

      if (workout) {
        // Create sets
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

        // Save health log with readiness
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

  // ─── SELECT SCREEN ─────────────────────────────────────────
  if (screen === 'select') {
    return (
      <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Tréning</h1>

        {todaysType && todaysType !== 'REST' && (
          <button
            onClick={() => startWorkout(todaysType)}
            style={{
              width: '100%', padding: 20, marginBottom: 20,
              background: `linear-gradient(135deg, ${WORKOUT_COLORS[todaysType]}, ${WORKOUT_COLORS[todaysType]}88)`,
              borderRadius: 20, color: '#fff', textAlign: 'left',
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>
              Dnešný plán
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>
              {WORKOUT_LABELS[todaysType]}
            </div>
            <div style={{ fontSize: 13, marginTop: 4, opacity: 0.8 }}>
              Tap pre začatie →
            </div>
          </button>
        )}

        <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
          Vyber tréning
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {(['PUSH', 'PULL', 'LEGS', 'UPPER', 'LOWER', 'FULL'] as WorkoutType[]).map(type => (
            <button
              key={type}
              onClick={() => startWorkout(type)}
              style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: 16, color: '#fff', textAlign: 'left',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: 4, background: WORKOUT_COLORS[type], marginBottom: 8 }} />
              <div style={{ fontSize: 16, fontWeight: 600 }}>{WORKOUT_LABELS[type]}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {DEFAULT_WORKOUTS[type]?.subtitle || ''}
              </div>
            </button>
          ))}
        </div>

        {/* Z2 Cardio */}
        <button
          onClick={() => startWorkout('Z2')}
          style={{
            width: '100%', marginTop: 12, background: 'var(--card)',
            border: '1px solid var(--border)', borderRadius: 16,
            padding: 16, color: '#fff', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <Icons.Heart size={20} color="var(--blue)" />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Cardio Z2</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Low-intensity steady state</div>
          </div>
        </button>
      </div>
    );
  }

  // ─── READINESS SCREEN ──────────────────────────────────────
  if (screen === 'readiness') {
    const fields = [
      { key: 'weight', label: 'Váha (kg)', type: 'number', step: '0.1' },
      { key: 'sleep', label: 'Spánok (h)', type: 'number', step: '0.5' },
      { key: 'stress', label: 'Stres (1-10)', type: 'range', min: 1, max: 10 },
      { key: 'energy', label: 'Energia (1-10)', type: 'range', min: 1, max: 10 },
      { key: 'shoulder', label: 'Rameno (0-10)', type: 'range', min: 0, max: 10 },
      { key: 'back', label: 'Chrbát (0-10)', type: 'range', min: 0, max: 10 },
      { key: 'sleepScore', label: 'Sleep Score', type: 'number' },
      { key: 'bodyBattery', label: 'Body Battery', type: 'number' },
      { key: 'hrv', label: 'HRV (ms)', type: 'number' },
      { key: 'rhr', label: 'RHR (bpm)', type: 'number' },
    ];

    return (
      <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setScreen('select')} style={{ background: 'none', color: 'var(--muted)' }}>
            <Icons.ChevronLeft size={24} />
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Readiness Check</h1>
        </div>

        {/* Recovery Score */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 20, padding: 20, marginBottom: 20, textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: getRecoveryColor(recoveryScore) }}>
            {recoveryScore}%
          </div>
          <div style={{ color: getRecoveryColor(recoveryScore), fontSize: 14 }}>
            {getRecoveryLabel(recoveryScore)}
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {fields.map(f => (
            <div key={f.key} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 14, color: 'var(--soft)' }}>{f.label}</label>
                {f.type === 'range' ? (
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--orange)', minWidth: 30, textAlign: 'right' }}>
                    {String((readiness as unknown as Record<string, unknown>)[f.key] || f.min || 0)}
                  </span>
                ) : null}
              </div>
              {f.type === 'range' ? (
                <input
                  type="range"
                  min={f.min} max={f.max}
                  value={String((readiness as unknown as Record<string, unknown>)[f.key] || f.min || 0)}
                  onChange={e => setReadiness(p => ({ ...p, [f.key]: parseInt(e.target.value) }))}
                  style={{ width: '100%', accentColor: 'var(--orange)', marginTop: 8 }}
                />
              ) : (
                <input
                  type="number"
                  step={f.step}
                  value={String((readiness as unknown as Record<string, unknown>)[f.key] || '')}
                  onChange={e => setReadiness(p => ({ ...p, [f.key]: parseFloat(e.target.value) || undefined }))}
                  placeholder="—"
                  style={{ marginTop: 4, padding: '8px 0', background: 'transparent', border: 'none', fontSize: 18, fontWeight: 600 }}
                />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={confirmReadiness}
          style={{
            width: '100%', padding: 16, background: 'var(--orange)',
            borderRadius: 16, color: '#fff', fontSize: 16, fontWeight: 600,
          }}
        >
          Začať {WORKOUT_LABELS[activeType]} →
        </button>
      </div>
    );
  }

  // ─── WORKOUT SCREEN ────────────────────────────────────────
  if (screen === 'workout') {
    const elapsed = startTime ? Math.round((Date.now() - startTime.getTime()) / 1000) : 0;

    return (
      <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
          position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10, padding: '8px 0',
        }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: WORKOUT_COLORS[activeType] }}>
              {WORKOUT_LABELS[activeType]}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {formatDuration(elapsed)} · {Math.round(progress * 100)}%
            </div>
          </div>
          <button
            onClick={saveWorkout}
            disabled={saving}
            style={{
              background: progress >= 0.8 ? 'var(--green)' : 'var(--card)',
              border: '1px solid var(--border)', borderRadius: 12,
              padding: '8px 16px', color: '#fff', fontSize: 14, fontWeight: 600,
            }}
          >
            {saving ? '...' : 'Dokončiť'}
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: WORKOUT_COLORS[activeType],
            width: `${progress * 100}%`, transition: 'width 0.3s',
            borderRadius: 2,
          }} />
        </div>

        {/* Rest Timer */}
        {timer.isRunning && (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--orange)',
            borderRadius: 16, padding: 16, marginBottom: 16, textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>REST</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--orange)', fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(timer.timeLeft)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}>
              <button onClick={() => timer.addTime(15)} style={{
                background: 'var(--border)', borderRadius: 8, padding: '6px 12px',
                color: 'var(--soft)', fontSize: 12,
              }}>+15s</button>
              <button onClick={() => timer.stop()} style={{
                background: 'var(--border)', borderRadius: 8, padding: '6px 12px',
                color: 'var(--soft)', fontSize: 12,
              }}>Skip</button>
            </div>
          </div>
        )}

        {/* Warmup */}
        {warmup.length > 0 && (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 16, marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
              Rozcvička
            </div>
            {warmup.map((w, i) => (
              <label key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                color: warmupChecked[`w${i}`] ? 'var(--green)' : 'var(--soft)', fontSize: 14,
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={warmupChecked[`w${i}`] || false}
                  onChange={() => setWarmupChecked(p => ({ ...p, [`w${i}`]: !p[`w${i}`] }))}
                  style={{ accentColor: 'var(--green)' }}
                />
                <span style={{ textDecoration: warmupChecked[`w${i}`] ? 'line-through' : 'none' }}>{w}</span>
              </label>
            ))}
          </div>
        )}

        {/* Exercises */}
        {exercises.map(ex => {
          const sets = workoutData[ex.id] || [];
          const allDone = sets.every(s => s.done);

          return (
            <div key={ex.id} style={{
              background: 'var(--card)', border: `1px solid ${allDone ? 'var(--green)' : 'var(--border)'}`,
              borderRadius: 16, padding: 16, marginBottom: 12,
              opacity: allDone ? 0.7 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{ex.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {ex.sets}×{ex.reps} · RIR {ex.rir} · {ex.rest}s rest
                  </div>
                </div>
                {allDone && <Icons.Check size={20} color="var(--green)" />}
              </div>

              {/* Set header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '28px 1fr 1fr 60px 44px',
                gap: 8, marginBottom: 6, padding: '0 4px',
              }}>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>Set</span>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>Kg</span>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>Reps</span>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>RIR</span>
                <span />
              </div>

              {/* Sets */}
              {sets.map((set, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '28px 1fr 1fr 60px 44px',
                  gap: 8, marginBottom: 6, alignItems: 'center', padding: '0 4px',
                  opacity: set.done ? 0.5 : 1,
                }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{i + 1}</span>
                  <input
                    type="number"
                    step="2.5"
                    value={String(set.weight)}
                    onChange={e => updateSet(ex.id, i, 'weight', e.target.value)}
                    disabled={set.done}
                    placeholder="—"
                    style={{ padding: '8px 6px', fontSize: 15, fontWeight: 600, borderRadius: 8, textAlign: 'center' }}
                  />
                  <input
                    type="number"
                    value={String(set.reps)}
                    onChange={e => updateSet(ex.id, i, 'reps', e.target.value)}
                    disabled={set.done}
                    placeholder="—"
                    style={{ padding: '8px 6px', fontSize: 15, fontWeight: 600, borderRadius: 8, textAlign: 'center' }}
                  />
                  <input
                    type="text"
                    value={set.rir}
                    onChange={e => updateSet(ex.id, i, 'rir', e.target.value)}
                    disabled={set.done}
                    style={{ padding: '8px 4px', fontSize: 13, borderRadius: 8, textAlign: 'center' }}
                  />
                  <button
                    onClick={() => set.done ? null : completeSet(ex.id, i)}
                    disabled={set.done}
                    style={{
                      background: set.done ? 'var(--green)' : 'var(--border)',
                      borderRadius: 10, padding: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icons.Check size={18} color={set.done ? '#fff' : 'var(--muted)'} />
                  </button>
                </div>
              ))}
            </div>
          );
        })}

        {/* Notes */}
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Poznámky k tréningu..."
          rows={3}
          style={{ marginTop: 12, borderRadius: 12 }}
        />

        {/* Bottom stats */}
        <div style={{
          display: 'flex', justifyContent: 'space-around', marginTop: 16,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 16,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{Math.round(totalVolume)}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Volume (kg)</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {Object.values(workoutData).flat().filter(s => s.done).length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Sets</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{formatDuration(elapsed)}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Čas</div>
          </div>
        </div>

        <div style={{ height: 100 }} /> {/* Bottom spacer */}
      </div>
    );
  }

  // ─── SUMMARY SCREEN ────────────────────────────────────────
  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 8 }}>🎉</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: WORKOUT_COLORS[activeType] }}>
        Tréning dokončený!
      </h1>
      <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
        {WORKOUT_LABELS[activeType]} · {startTime ? formatDuration(Math.round((Date.now() - startTime.getTime()) / 1000)) : ''}
      </div>

      {/* Summary stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24,
      }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{Math.round(totalVolume)}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Total Volume (kg)</div>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {Object.values(workoutData).flat().filter(s => s.done).length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Sets completed</div>
        </div>
      </div>

      {/* Exercise summary */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 16, marginBottom: 24, textAlign: 'left',
      }}>
        {exercises.map(ex => {
          const sets = (workoutData[ex.id] || []).filter(s => s.done);
          if (sets.length === 0) return null;
          const topSet = sets.reduce<{ weight: string | number; reps: string | number; vol: number }>((best, s) => {
            const vol = (parseFloat(String(s.weight)) || 0) * (parseFloat(String(s.reps)) || 0);
            return vol > best.vol ? { weight: s.weight, reps: s.reps, vol } : best;
          }, { weight: 0, reps: 0, vol: 0 });
          return (
            <div key={ex.id} style={{
              display: 'flex', justifyContent: 'space-between', padding: '8px 0',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 14 }}>{ex.name}</span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                {sets.length}×{topSet.weight}kg
              </span>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => {
          setScreen('select');
          setWorkoutData({});
          setExercises([]);
          setNotes('');
        }}
        style={{
          width: '100%', padding: 16, background: 'var(--orange)',
          borderRadius: 16, color: '#fff', fontSize: 16, fontWeight: 600,
        }}
      >
        Hotovo
      </button>
    </div>
  );
}
