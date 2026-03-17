/* ═══════════════════════════════════════════════════════════════
   BEAST TRACKER — Recovery & Readiness Scoring
   ═══════════════════════════════════════════════════════════════ */

import type { ReadinessData } from '@/types';

export function computeRecoveryScore(r: ReadinessData): number {
  let score = 70; // baseline
  let factors = 0;

  // Sleep (35% weight)
  if (r.sleep != null) {
    const sleepScore = Math.min(100, (r.sleep / 8) * 100);
    score = score * 0.65 + sleepScore * 0.35;
    factors++;
  }
  if (r.sleepScore != null) {
    score = score * 0.65 + r.sleepScore * 0.35;
    factors++;
  }

  // HRV (25% weight) — higher is better
  if (r.hrv != null) {
    const hrvScore = Math.min(100, (r.hrv / 80) * 100);
    score = score * 0.75 + hrvScore * 0.25;
    factors++;
  }

  // RHR (20% weight) — lower is better
  if (r.rhr != null) {
    const rhrScore = Math.max(0, Math.min(100, (80 - r.rhr) * 2.5 + 50));
    score = score * 0.8 + rhrScore * 0.2;
    factors++;
  }

  // Body Battery (20% weight)
  if (r.bodyBattery != null) {
    score = score * 0.8 + r.bodyBattery * 0.2;
    factors++;
  }

  // Stress penalty
  if (r.stress != null && r.stress > 5) {
    score -= (r.stress - 5) * 3;
  }

  // Energy bonus
  if (r.energy != null) {
    score += (r.energy - 5) * 2;
  }

  // Pain penalties
  if (r.shoulder != null && r.shoulder > 3) score -= (r.shoulder - 3) * 2;
  if (r.back != null && r.back > 3) score -= (r.back - 3) * 2;

  return Math.max(0, Math.min(100, Math.round(factors > 0 ? score : 70)));
}

export function getRecoveryColor(score: number): string {
  if (score >= 75) return '#10B981'; // green
  if (score >= 50) return '#F59E0B'; // yellow
  return '#EF4444'; // red
}

export function getRecoveryLabel(score: number): string {
  if (score >= 80) return 'Výborný';
  if (score >= 65) return 'Dobrý';
  if (score >= 50) return 'Priemerný';
  if (score >= 35) return 'Slabý';
  return 'Odpočívaj';
}

export function shouldDeload(recentScores: number[]): boolean {
  if (recentScores.length < 5) return false;
  const last5 = recentScores.slice(-5);
  const avgRecovery = last5.reduce((a, b) => a + b, 0) / last5.length;
  return avgRecovery < 45;
}

export function computeTDEE(
  weight: number,
  height: number,
  age: number,
  gender: string,
  activityLevel: string
): number {
  // Mifflin-St Jeor
  let bmr = 10 * weight + 6.25 * height - 5 * age;
  bmr += gender === 'male' ? 5 : -161;

  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  return Math.round(bmr * (multipliers[activityLevel] || 1.55));
}

export function computeMacros(
  tdee: number,
  goal: string,
  weight: number
): { calories: number; protein: number; carbs: number; fat: number } {
  let calories = tdee;
  if (goal === 'gain') calories += 300;
  else if (goal === 'loss') calories -= 400;

  const protein = Math.round(weight * 2.2); // 2.2g/kg
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  return { calories, protein, carbs, fat };
}
