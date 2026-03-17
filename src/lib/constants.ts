/* ═══════════════════════════════════════════════════════════════
   BEAST TRACKER — Constants & Default Data
   ═══════════════════════════════════════════════════════════════ */

import type { WorkoutType, WorkoutTemplate, ScheduleDay, SupplementGroup } from '@/types';

// ─── Training Type Labels ────────────────────────────────────
export const WORKOUT_LABELS: Record<WorkoutType, string> = {
  PUSH: 'Push',
  PULL: 'Pull',
  LEGS: 'Legs',
  UPPER: 'Upper',
  LOWER: 'Lower',
  FULL: 'Full Body',
  Z2: 'Cardio Z2',
  DOPL: 'Doplnky',
  REST: 'Rest',
};

export const WORKOUT_COLORS: Record<WorkoutType, string> = {
  PUSH: '#FF6B00',
  PULL: '#3B82F6',
  LEGS: '#10B981',
  UPPER: '#F59E0B',
  LOWER: '#8B5CF6',
  FULL: '#EC4899',
  Z2: '#06B6D4',
  DOPL: '#6366F1',
  REST: '#6B7280',
};

// ─── Schedule Presets ────────────────────────────────────────
export const SCHEDULE_PRESETS: Record<string, { label: string; schedule: ScheduleDay[] }> = {
  ppl: {
    label: 'Push/Pull/Legs',
    schedule: [
      { d: 0, t: 'PUSH' }, { d: 1, t: 'PULL' }, { d: 2, t: 'Z2' },
      { d: 3, t: 'LEGS' }, { d: 4, t: 'PUSH' }, { d: 5, t: 'Z2' }, { d: 6, t: 'REST' },
    ],
  },
  upper_lower: {
    label: 'Upper/Lower',
    schedule: [
      { d: 0, t: 'UPPER' }, { d: 1, t: 'LOWER' }, { d: 2, t: 'Z2' },
      { d: 3, t: 'UPPER' }, { d: 4, t: 'LOWER' }, { d: 5, t: 'Z2' }, { d: 6, t: 'REST' },
    ],
  },
  fullbody: {
    label: 'Full Body 3×',
    schedule: [
      { d: 0, t: 'FULL' }, { d: 1, t: 'Z2' }, { d: 2, t: 'FULL' },
      { d: 3, t: 'REST' }, { d: 4, t: 'FULL' }, { d: 5, t: 'Z2' }, { d: 6, t: 'REST' },
    ],
  },
};

// ─── Default Workout Templates ───────────────────────────────
export const DEFAULT_WORKOUTS: Record<string, WorkoutTemplate> = {
  PUSH: {
    name: 'Push Day',
    subtitle: 'Chest · Shoulders · Triceps',
    color: '#FF6B00',
    warmup: ['Band pull-apart 2×15', 'Rotácia ramien 2×10', 'Push-ups 2×10'],
    exercises: [
      { id: 'bench_press', name: 'Bench Press', sets: 4, reps: '8-10', rir: '1-2', tempo: '3-0-1-0', rest: 120 },
      { id: 'ohp', name: 'Overhead Press', sets: 3, reps: '8-12', rir: '1-2', tempo: '2-0-1-0', rest: 90 },
      { id: 'incline_db', name: 'Incline DB Press', sets: 3, reps: '10-12', rir: '1-2', tempo: '3-0-1-0', rest: 90 },
      { id: 'lateral_raise', name: 'Lateral Raise', sets: 3, reps: '12-15', rir: '1-2', tempo: '2-0-1-0', rest: 60 },
      { id: 'tricep_pushdown', name: 'Tricep Pushdown', sets: 3, reps: '12-15', rir: '1-2', tempo: '2-0-1-0', rest: 60 },
      { id: 'cable_fly', name: 'Cable Fly', sets: 3, reps: '12-15', rir: '1-2', tempo: '3-0-1-0', rest: 60 },
    ],
  },
  PULL: {
    name: 'Pull Day',
    subtitle: 'Back · Biceps · Rear Delts',
    color: '#3B82F6',
    warmup: ['Band pull-apart 2×15', 'Cat-cow 2×10', 'Dead hang 30s'],
    exercises: [
      { id: 'deadlift', name: 'Deadlift', sets: 4, reps: '5-8', rir: '1-2', tempo: '2-0-1-0', rest: 180 },
      { id: 'pullup', name: 'Pull-ups', sets: 3, reps: '6-10', rir: '1-2', tempo: '2-0-1-0', rest: 120 },
      { id: 'cable_row', name: 'Cable Row', sets: 3, reps: '10-12', rir: '1-2', tempo: '2-1-1-0', rest: 90 },
      { id: 'face_pull', name: 'Face Pull', sets: 3, reps: '15-20', rir: '1-2', tempo: '2-1-1-0', rest: 60 },
      { id: 'barbell_curl', name: 'Barbell Curl', sets: 3, reps: '10-12', rir: '1-2', tempo: '2-0-1-0', rest: 60 },
      { id: 'hammer_curl', name: 'Hammer Curl', sets: 3, reps: '10-12', rir: '1-2', tempo: '2-0-1-0', rest: 60 },
    ],
  },
  LEGS: {
    name: 'Leg Day',
    subtitle: 'Quads · Hamstrings · Glutes · Calves',
    color: '#10B981',
    warmup: ['Bodyweight squats 2×15', 'Hip circles 2×10', 'Glute bridges 2×10'],
    exercises: [
      { id: 'squat', name: 'Squat', sets: 4, reps: '6-10', rir: '1-2', tempo: '3-0-1-0', rest: 180 },
      { id: 'rdl', name: 'Romanian Deadlift', sets: 3, reps: '10-12', rir: '1-2', tempo: '3-0-1-0', rest: 120 },
      { id: 'leg_press', name: 'Leg Press', sets: 3, reps: '10-15', rir: '1-2', tempo: '3-0-1-0', rest: 90 },
      { id: 'leg_curl', name: 'Leg Curl', sets: 3, reps: '12-15', rir: '1-2', tempo: '2-1-1-0', rest: 60 },
      { id: 'calf_raise', name: 'Calf Raise', sets: 4, reps: '12-15', rir: '1-2', tempo: '2-1-1-0', rest: 60 },
      { id: 'leg_extension', name: 'Leg Extension', sets: 3, reps: '12-15', rir: '1-2', tempo: '2-1-1-0', rest: 60 },
    ],
  },
  UPPER: {
    name: 'Upper Body',
    subtitle: 'Chest · Back · Shoulders · Arms',
    color: '#F59E0B',
    warmup: ['Band pull-apart 2×15', 'Arm circles 2×10', 'Push-ups 2×10'],
    exercises: [
      { id: 'bench_press', name: 'Bench Press', sets: 3, reps: '8-10', rir: '1-2', tempo: '3-0-1-0', rest: 120 },
      { id: 'cable_row', name: 'Cable Row', sets: 3, reps: '10-12', rir: '1-2', tempo: '2-1-1-0', rest: 90 },
      { id: 'ohp', name: 'Overhead Press', sets: 3, reps: '8-12', rir: '1-2', tempo: '2-0-1-0', rest: 90 },
      { id: 'pullup', name: 'Pull-ups', sets: 3, reps: '6-10', rir: '1-2', tempo: '2-0-1-0', rest: 90 },
      { id: 'lateral_raise', name: 'Lateral Raise', sets: 3, reps: '12-15', rir: '1-2', tempo: '2-0-1-0', rest: 60 },
      { id: 'tricep_pushdown', name: 'Tricep Pushdown', sets: 2, reps: '12-15', rir: '1-2', tempo: '2-0-1-0', rest: 60 },
      { id: 'barbell_curl', name: 'Barbell Curl', sets: 2, reps: '10-12', rir: '1-2', tempo: '2-0-1-0', rest: 60 },
    ],
  },
  LOWER: {
    name: 'Lower Body',
    subtitle: 'Quads · Hamstrings · Glutes · Calves',
    color: '#8B5CF6',
    warmup: ['Bodyweight squats 2×15', 'Hip circles 2×10', 'Leg swings 2×10'],
    exercises: [
      { id: 'squat', name: 'Squat', sets: 4, reps: '6-10', rir: '1-2', tempo: '3-0-1-0', rest: 180 },
      { id: 'rdl', name: 'Romanian Deadlift', sets: 3, reps: '10-12', rir: '1-2', tempo: '3-0-1-0', rest: 120 },
      { id: 'bulgarian_split', name: 'Bulgarian Split Squat', sets: 3, reps: '10-12', rir: '1-2', tempo: '2-0-1-0', rest: 90 },
      { id: 'leg_curl', name: 'Leg Curl', sets: 3, reps: '12-15', rir: '1-2', tempo: '2-1-1-0', rest: 60 },
      { id: 'calf_raise', name: 'Calf Raise', sets: 4, reps: '12-15', rir: '1-2', tempo: '2-1-1-0', rest: 60 },
    ],
  },
  FULL: {
    name: 'Full Body',
    subtitle: 'All Major Muscle Groups',
    color: '#EC4899',
    warmup: ['Jumping jacks 2×20', 'Hip circles 2×10', 'Push-ups 2×10'],
    exercises: [
      { id: 'squat', name: 'Squat', sets: 3, reps: '8-10', rir: '1-2', tempo: '3-0-1-0', rest: 120 },
      { id: 'bench_press', name: 'Bench Press', sets: 3, reps: '8-10', rir: '1-2', tempo: '3-0-1-0', rest: 120 },
      { id: 'cable_row', name: 'Cable Row', sets: 3, reps: '10-12', rir: '1-2', tempo: '2-1-1-0', rest: 90 },
      { id: 'ohp', name: 'Overhead Press', sets: 3, reps: '8-12', rir: '1-2', tempo: '2-0-1-0', rest: 90 },
      { id: 'rdl', name: 'Romanian Deadlift', sets: 3, reps: '10-12', rir: '1-2', tempo: '3-0-1-0', rest: 90 },
      { id: 'lateral_raise', name: 'Lateral Raise', sets: 2, reps: '12-15', rir: '1-2', tempo: '2-0-1-0', rest: 60 },
    ],
  },
};

// ─── Default Supplements ─────────────────────────────────────
export const DEFAULT_SUPPLEMENTS: Record<SupplementGroup, { id: string; name: string }[]> = {
  morning: [
    { id: 'multivitamin', name: 'Multivitamín' },
    { id: 'omega3_am', name: 'Omega-3' },
    { id: 'collagen', name: 'Kolagén' },
    { id: 'creatine', name: 'Kreatín 5g' },
  ],
  pre: [
    { id: 'citrulline', name: 'Citrulín 8g' },
    { id: 'glycerol', name: 'Glycerol' },
    { id: 'water_pre', name: 'Voda 500ml' },
  ],
  during: [
    { id: 'eaa', name: 'EAA' },
    { id: 'electrolytes', name: 'Elektrolyty' },
  ],
  post: [
    { id: 'whey', name: 'Whey Protein' },
  ],
  evening: [
    { id: 'omega3_pm', name: 'Omega-3' },
    { id: 'zinc', name: 'Zinok' },
    { id: 'ashwagandha', name: 'Ashwagandha' },
    { id: 'magnesium', name: 'Horčík' },
    { id: 'casein', name: 'Casein' },
  ],
};

export const SUPPLEMENT_GROUP_LABELS: Record<SupplementGroup, string> = {
  morning: 'Ráno',
  pre: 'Pre-Workout',
  during: 'Počas',
  post: 'Post-Workout',
  evening: 'Večer',
};

// ─── Days of Week ────────────────────────────────────────────
export const DAYS_SK = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];
export const DAYS_FULL_SK = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota', 'Nedeľa'];
