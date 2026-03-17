/* ═══════════════════════════════════════════════════════════════
   BEAST TRACKER — Smart Suggestions
   ═══════════════════════════════════════════════════════════════ */

// Suggest weight for next set based on last workout
export function getWeightSuggestion(
  lastWeight: number,
  lastReps: number,
  lastRIR: string,
  targetReps: string
): number {
  const rir = parseFloat(lastRIR) || 2;
  const targetRep = parseInt(targetReps.split('-')[0]) || lastReps;

  // If last set was easy (high RIR), suggest increase
  if (rir >= 3 && lastReps >= targetRep) {
    return Math.round((lastWeight * 1.025) / 2.5) * 2.5; // round to 2.5kg
  }
  // If last set was hard (low RIR), keep or decrease
  if (rir <= 1 && lastReps < targetRep) {
    return Math.round((lastWeight * 0.95) / 2.5) * 2.5;
  }
  return lastWeight;
}

// Smart rest timer based on RIR, weight, and exercise type
export function getSmartRest(rir: number, weight: number, isCompound: boolean): number {
  let base = isCompound ? 120 : 60; // seconds

  // Lower RIR = harder set = more rest
  if (rir <= 1) base += 60;
  else if (rir <= 2) base += 30;

  // Heavier weight = more rest
  if (weight >= 100) base += 30;
  else if (weight >= 60) base += 15;

  return Math.min(300, base); // cap at 5 min
}

// Check if exercise is compound movement
export function isCompoundExercise(exerciseId: string): boolean {
  const compounds = [
    'bench_press', 'squat', 'deadlift', 'ohp', 'pullup',
    'barbell_row', 'rdl', 'leg_press', 'bulgarian_split',
    'incline_bench', 'dip', 'cable_row', 'pendlay_row',
    'front_squat', 'sumo_deadlift', 'hip_thrust',
  ];
  return compounds.includes(exerciseId);
}
