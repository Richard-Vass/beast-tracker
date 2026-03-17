/* ═══════════════════════════════════════════════════════════════
   BEAST TRACKER — Analytics & PR Detection
   ═══════════════════════════════════════════════════════════════ */

import type { WorkoutSet } from '@/types';

export interface PRRecord {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  date: string;
  estimated1RM: number;
}

// Epley formula for estimated 1RM
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

// Detect new PRs from current workout sets vs history
export function detectNewPRs(
  currentSets: WorkoutSet[],
  historicalPRs: Map<string, PRRecord>
): PRRecord[] {
  const newPRs: PRRecord[] = [];

  for (const set of currentSets) {
    if (!set.done || !set.weight || !set.reps) continue;
    const e1rm = estimate1RM(set.weight, set.reps);
    const existing = historicalPRs.get(set.exercise_id);
    if (!existing || e1rm > existing.estimated1RM) {
      newPRs.push({
        exerciseId: set.exercise_id,
        exerciseName: set.exercise_name,
        weight: set.weight,
        reps: set.reps,
        date: new Date().toISOString().slice(0, 10),
        estimated1RM: e1rm,
      });
    }
  }

  return newPRs;
}

// Compute all-time PRs from workout sets
export function computePRs(allSets: WorkoutSet[]): Map<string, PRRecord> {
  const prs = new Map<string, PRRecord>();
  for (const set of allSets) {
    if (!set.done || !set.weight || !set.reps) continue;
    const e1rm = estimate1RM(set.weight, set.reps);
    const existing = prs.get(set.exercise_id);
    if (!existing || e1rm > existing.estimated1RM) {
      prs.set(set.exercise_id, {
        exerciseId: set.exercise_id,
        exerciseName: set.exercise_name,
        weight: set.weight,
        reps: set.reps,
        date: set.created_at?.slice(0, 10) || '',
        estimated1RM: e1rm,
      });
    }
  }
  return prs;
}

// Count workout streak (consecutive days with workouts)
export function computeStreak(workoutDates: string[]): number {
  if (workoutDates.length === 0) return 0;
  const sorted = Array.from(new Set(workoutDates)).sort().reverse();
  const today = new Date().toISOString().slice(0, 10);

  // Must include today or yesterday
  if (sorted[0] !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (sorted[0] !== yesterday.toISOString().slice(0, 10)) return 0;
  }

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (diff <= 2) streak++; // allow 1 rest day
    else break;
  }
  return streak;
}

// Compute total volume for a set of workout sets
export function computeVolume(sets: WorkoutSet[]): number {
  return sets.reduce((vol, s) => {
    if (s.done && s.weight && s.reps) return vol + s.weight * s.reps;
    return vol;
  }, 0);
}

// Compute weekly volume per exercise
export function weeklyVolumeByExercise(
  sets: WorkoutSet[]
): Record<string, { name: string; volume: number; sets: number }> {
  const result: Record<string, { name: string; volume: number; sets: number }> = {};
  for (const s of sets) {
    if (!s.done) continue;
    if (!result[s.exercise_id]) {
      result[s.exercise_id] = { name: s.exercise_name, volume: 0, sets: 0 };
    }
    result[s.exercise_id].volume += (s.weight || 0) * (s.reps || 0);
    result[s.exercise_id].sets++;
  }
  return result;
}
