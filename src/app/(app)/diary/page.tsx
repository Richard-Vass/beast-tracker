'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import { Icons } from '@/components/Icons';
import { WORKOUT_LABELS, WORKOUT_COLORS } from '@/lib/constants';
import { formatDate, formatDuration, daysAgo } from '@/lib/date-utils';
import { computeVolume } from '@/lib/analytics';
import type { Workout, WorkoutSet } from '@/types';

export default function DiaryPage() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [workoutSets, setWorkoutSets] = useState<WorkoutSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  // Edit/delete state
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    setEditingNotes(false);
    setNotesValue(workout.notes || '');
    setShowDeleteConfirm(false);
    const { data } = await db.getWorkoutSets(workout.id);
    if (data) setWorkoutSets(data);
  };

  const handleSaveNotes = useCallback(async () => {
    if (!selectedWorkout || savingNotes) return;
    setSavingNotes(true);
    try {
      await db.workouts.update(selectedWorkout.id, { notes: notesValue });
      setSelectedWorkout({ ...selectedWorkout, notes: notesValue });
      setWorkouts(prev => prev.map(w => w.id === selectedWorkout.id ? { ...w, notes: notesValue } : w));
      setEditingNotes(false);
    } finally {
      setSavingNotes(false);
    }
  }, [selectedWorkout, notesValue, savingNotes]);

  const handleDelete = useCallback(async () => {
    if (!selectedWorkout || deleting) return;
    setDeleting(true);
    try {
      // Delete sets first, then workout
      await db.workoutSets.deleteByQuery(`workout_id=eq.${selectedWorkout.id}`);
      await db.workouts.delete(selectedWorkout.id);
      setWorkouts(prev => prev.filter(w => w.id !== selectedWorkout.id));
      setSelectedWorkout(null);
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }, [selectedWorkout, deleting]);

  const handleCloneWorkout = useCallback(() => {
    if (!selectedWorkout || workoutSets.length === 0) return;

    const exerciseGroups = workoutSets.reduce((acc, s) => {
      if (!acc[s.exercise_id]) acc[s.exercise_id] = { name: s.exercise_name, sets: [] };
      acc[s.exercise_id].sets.push(s);
      return acc;
    }, {} as Record<string, { name: string; sets: WorkoutSet[] }>);

    const exercises = Object.entries(exerciseGroups).map(([exId, group]) => ({
      id: exId,
      name: group.name,
      sets: group.sets.length,
      reps: String(group.sets[0]?.reps || '8-12'),
      rir: group.sets[0]?.rir || '1-2',
      tempo: group.sets[0]?.tempo || '2-0-1-0',
      rest: 90,
      last: group.sets[0]?.weight || undefined,
    }));

    const planData = {
      type: selectedWorkout.type,
      name: WORKOUT_LABELS[selectedWorkout.type],
      warmup: [],
      exercises,
      source: 'clone',
    };

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('bt-ai-workout', JSON.stringify(planData));
    }
    router.push('/training');
  }, [selectedWorkout, workoutSets, router]);

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
          <div style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: 12, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{Math.round(volume)}</div>
            <div style={{ fontSize: 10, color: '#888' }}>Volume kg</div>
          </div>
          <div style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: 12, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{workoutSets.length}</div>
            <div style={{ fontSize: 10, color: '#888' }}>Sets</div>
          </div>
          <div style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: 12, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{Object.keys(exerciseGroups).length}</div>
            <div style={{ fontSize: 10, color: '#888' }}>Cviky</div>
          </div>
        </div>

        {/* Exercises */}
        {Object.entries(exerciseGroups).map(([exId, group]) => (
          <div key={exId} style={{
            background: '#141414', border: '1px solid #1E1E1E',
            borderRadius: 16, padding: 16, marginBottom: 12,
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{group.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 60px', gap: 4, fontSize: 12 }}>
              <span style={{ color: '#888' }}>Set</span>
              <span style={{ color: '#888' }}>Kg</span>
              <span style={{ color: '#888' }}>Reps</span>
              <span style={{ color: '#888' }}>RIR</span>
              {group.sets.map((s, i) => (
                <React.Fragment key={s.id}>
                  <span style={{ color: '#666' }}>{i + 1}</span>
                  <span style={{ fontWeight: 600 }}>{s.weight || '\u2014'}</span>
                  <span style={{ fontWeight: 600 }}>{s.reps || '\u2014'}</span>
                  <span style={{ color: '#888' }}>{s.rir || '\u2014'}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}

        {/* Notes — editable */}
        <div style={{
          background: '#141414', border: '1px solid #1E1E1E',
          borderRadius: 12, padding: 14, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Poznámky
            </span>
            {!editingNotes ? (
              <button
                onClick={() => { setEditingNotes(true); setNotesValue(selectedWorkout.notes || ''); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  color: '#F57C00', fontSize: 12, fontWeight: 500, padding: '2px 6px',
                }}
              >
                <Icons.Edit size={14} color="#F57C00" />
                Upraviť
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setEditingNotes(false)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#666', fontSize: 12, padding: '2px 6px',
                  }}
                >
                  Zrušiť
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  style={{
                    background: '#F57C00', border: 'none', borderRadius: 6,
                    cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600,
                    padding: '4px 10px', opacity: savingNotes ? 0.6 : 1,
                  }}
                >
                  {savingNotes ? 'Ukladám...' : 'Uložiť'}
                </button>
              </div>
            )}
          </div>
          {editingNotes ? (
            <textarea
              value={notesValue}
              onChange={e => setNotesValue(e.target.value)}
              placeholder="Pridaj poznámky k tréningu..."
              rows={3}
              style={{
                width: '100%', background: '#0D0D0D', border: '1px solid #2A2A2A',
                borderRadius: 8, padding: 10, color: '#ccc', fontSize: 14,
                resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
                outline: 'none',
              }}
            />
          ) : (
            <div style={{ fontSize: 14, color: selectedWorkout.notes ? '#ccc' : '#555', lineHeight: 1.5 }}>
              {selectedWorkout.notes || 'Žiadne poznámky'}
            </div>
          )}
        </div>

        {/* Clone workout button */}
        <button
          onClick={handleCloneWorkout}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 12,
            background: '#141414', border: '1px solid #1E1E1E',
            color: '#F57C00', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 8, marginBottom: 12,
          }}
        >
          <Icons.Zap size={18} color="#F57C00" />
          Zopakovať tréning
        </button>

        {/* Delete button */}
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 12,
              background: '#1A0A0A', border: '1px solid #3D1515',
              color: '#FF4444', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8, marginBottom: 20,
            }}
          >
            <Icons.Trash size={18} color="#FF4444" />
            Zmazať tréning
          </button>
        ) : (
          /* Delete confirmation */
          <div style={{
            background: '#1A0A0A', border: '1px solid #3D1515', borderRadius: 14,
            padding: 16, marginBottom: 20,
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#FF4444', marginBottom: 8, textAlign: 'center' }}>
              Naozaj chceš zmazať tento tréning?
            </div>
            <div style={{ fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 14 }}>
              Tréning a všetky jeho sety budú natrvalo vymazané.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  background: '#1E1E1E', border: '1px solid #2A2A2A',
                  color: '#ccc', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Zrušiť
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  background: '#FF4444', border: 'none',
                  color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  opacity: deleting ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Icons.Trash size={16} color="#fff" />
                {deleting ? 'Mažem...' : 'Zmazať'}
              </button>
            </div>
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
              background: filter === f ? '#F57C00' : '#141414',
              border: `1px solid ${filter === f ? '#F57C00' : '#1E1E1E'}`,
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
          <div style={{ fontSize: 14, fontWeight: 600, color: '#888', marginBottom: 8 }}>
            {new Date(month + '-01').toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })}
            <span style={{ color: '#666', fontWeight: 400 }}> · {wks.length} tréningov</span>
          </div>
          {wks.map(w => (
            <button
              key={w.id}
              onClick={() => loadWorkoutDetail(w)}
              style={{
                width: '100%', textAlign: 'left',
                background: '#141414', border: '1px solid #1E1E1E',
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
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {formatDate(w.date)}
                    {w.duration ? ` · ${formatDuration(w.duration)}` : ''}
                  </div>
                </div>
              </div>
              <Icons.ChevronRight size={16} color="#888" />
            </button>
          ))}
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
          Žiadne tréningy
        </div>
      )}
    </div>
  );
}
