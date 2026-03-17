'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/supabase';
import { Icons } from '@/components/Icons';
import { WORKOUT_LABELS, WORKOUT_COLORS } from '@/lib/constants';
import { formatDate, formatDuration, daysAgo } from '@/lib/date-utils';
import { computeVolume } from '@/lib/analytics';
import type { Workout, WorkoutSet } from '@/types';

export default function DiaryPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [workoutSets, setWorkoutSets] = useState<WorkoutSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function load() {
      const { data } = await db.workouts.getByDateRange(daysAgo(90), new Date().toISOString().slice(0, 10));
      if (data) setWorkouts(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return workouts;
    return workouts.filter(w => w.type === filter);
  }, [workouts, filter]);

  // Group by month
  const grouped = useMemo(() => {
    const groups: Record<string, Workout[]> = {};
    filtered.forEach(w => {
      const month = w.date.slice(0, 7);
      if (!groups[month]) groups[month] = [];
      groups[month].push(w);
    });
    return groups;
  }, [filtered]);

  const loadWorkoutDetail = async (workout: Workout) => {
    setSelectedWorkout(workout);
    const { data } = await db.getWorkoutSets(workout.id);
    if (data) setWorkoutSets(data);
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80dvh' }}>
      <div style={{ color: 'var(--muted)' }}>Načítavam...</div>
    </div>;
  }

  // ─── Workout Detail ────────────────────────────────────────
  if (selectedWorkout) {
    const exerciseGroups = workoutSets.reduce((acc, s) => {
      if (!acc[s.exercise_id]) acc[s.exercise_id] = { name: s.exercise_name, sets: [] };
      acc[s.exercise_id].sets.push(s);
      return acc;
    }, {} as Record<string, { name: string; sets: WorkoutSet[] }>);

    const volume = computeVolume(workoutSets);

    return (
      <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setSelectedWorkout(null)} style={{ background: 'none', color: 'var(--muted)' }}>
            <Icons.ChevronLeft size={24} />
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: WORKOUT_COLORS[selectedWorkout.type] }}>
              {WORKOUT_LABELS[selectedWorkout.type]}
            </h1>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {formatDate(selectedWorkout.date)}
              {selectedWorkout.duration ? ` · ${formatDuration(selectedWorkout.duration)}` : ''}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{Math.round(volume)}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Volume kg</div>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{workoutSets.length}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Sets</div>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{Object.keys(exerciseGroups).length}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Cviky</div>
          </div>
        </div>

        {/* Exercises */}
        {Object.entries(exerciseGroups).map(([exId, group]) => (
          <div key={exId} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 16, marginBottom: 12,
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{group.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 60px', gap: 4, fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>Set</span>
              <span style={{ color: 'var(--muted)' }}>Kg</span>
              <span style={{ color: 'var(--muted)' }}>Reps</span>
              <span style={{ color: 'var(--muted)' }}>RIR</span>
              {group.sets.map((s, i) => (
                <React.Fragment key={s.id}>
                  <span style={{ color: 'var(--soft)' }}>{i + 1}</span>
                  <span style={{ fontWeight: 600 }}>{s.weight || '—'}</span>
                  <span style={{ fontWeight: 600 }}>{s.reps || '—'}</span>
                  <span style={{ color: 'var(--muted)' }}>{s.rir || '—'}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}

        {selectedWorkout.notes && (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 12, fontSize: 14, color: 'var(--soft)',
          }}>
            {selectedWorkout.notes}
          </div>
        )}
      </div>
    );
  }

  // ─── Workout List ──────────────────────────────────────────
  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Tréningový denník</h1>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {['all', 'PUSH', 'PULL', 'LEGS', 'UPPER', 'LOWER', 'FULL', 'Z2'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? 'var(--orange)' : 'var(--card)',
              border: `1px solid ${filter === f ? 'var(--orange)' : 'var(--border)'}`,
              borderRadius: 20, padding: '6px 14px', color: '#fff',
              fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
            }}
          >
            {f === 'all' ? 'Všetky' : WORKOUT_LABELS[f as keyof typeof WORKOUT_LABELS] || f}
          </button>
        ))}
      </div>

      {/* Grouped list */}
      {Object.entries(grouped).map(([month, wks]) => (
        <div key={month} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>
            {new Date(month + '-01').toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })}
            <span style={{ color: 'var(--soft)', fontWeight: 400 }}> · {wks.length} tréningov</span>
          </div>
          {wks.map(w => (
            <button
              key={w.id}
              onClick={() => loadWorkoutDetail(w)}
              style={{
                width: '100%', textAlign: 'left',
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 14, marginBottom: 8, color: '#fff',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: 4,
                  background: WORKOUT_COLORS[w.type],
                }} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{WORKOUT_LABELS[w.type]}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {formatDate(w.date)}
                    {w.duration ? ` · ${formatDuration(w.duration)}` : ''}
                  </div>
                </div>
              </div>
              <Icons.ChevronRight size={16} color="var(--muted)" />
            </button>
          ))}
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          Žiadne tréningy
        </div>
      )}
    </div>
  );
}
