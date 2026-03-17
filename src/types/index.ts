/* ═══════════════════════════════════════════════════════════════
   BEAST TRACKER — TypeScript Types
   ═══════════════════════════════════════════════════════════════ */

// ─── Training Types ───────────────────────────────────────────
export type WorkoutType = 'PUSH' | 'PULL' | 'LEGS' | 'UPPER' | 'LOWER' | 'FULL' | 'Z2' | 'DOPL' | 'REST';
export type ScheduleMode = 'ppl' | 'upper_lower' | 'fullbody' | 'custom';
export type Goal = 'gain' | 'loss' | 'maintain' | 'recomp';
export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type SupplementGroup = 'morning' | 'pre' | 'during' | 'post' | 'evening';

// ─── User Profile ─────────────────────────────────────────────
export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  age: number | null;
  height: number | null;
  current_weight: number | null;
  goal: Goal;
  experience: Experience;
  created_at: string;
  updated_at: string;
}

// ─── Readiness / Health ───────────────────────────────────────
export interface ReadinessData {
  weight?: number;
  sleep?: number;
  stress?: number;
  energy?: number;
  shoulder?: number;
  back?: number;
  sleepScore?: number;
  bodyBattery?: number;
  hrv?: number;
  rhr?: number;
  steps?: number;
  strain?: number;
}

export interface HealthLog {
  id: string;
  user_id: string;
  date: string;
  weight: number | null;
  sleep_hours: number | null;
  sleep_score: number | null;
  body_battery: number | null;
  hrv: number | null;
  rhr: number | null;
  steps: number | null;
  active_energy: number | null;
  basal_energy: number | null;
  spo2: number | null;
  respiratory_rate: number | null;
  vo2_max: number | null;
  walking_distance: number | null;
  flights_climbed: number | null;
  stand_hours: number | null;
  hr_max: number | null;
  hr_avg: number | null;
  stress: number | null;
  energy: number | null;
  source: 'manual' | 'apple-watch' | 'import';
  created_at: string;
}

// ─── Workouts ─────────────────────────────────────────────────
export interface Workout {
  id: string;
  user_id: string;
  date: string;
  type: WorkoutType;
  duration: number | null;
  readiness: ReadinessData;
  notes: string;
  created_at: string;
}

export interface WorkoutSet {
  id: string;
  workout_id: string;
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rir: string;
  tempo: string;
  done: boolean;
  created_at: string;
}

// ─── Exercise Template ────────────────────────────────────────
export interface ExerciseTemplate {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rir: string;
  tempo: string;
  rest: number;
  last?: number;
  note?: string;
}

export interface WorkoutTemplate {
  name: string;
  subtitle: string;
  color: string;
  warmup: string[];
  exercises: ExerciseTemplate[];
}

export interface CustomWorkout {
  id: string;
  user_id: string;
  workout_key: WorkoutType;
  name: string;
  subtitle: string;
  color: string;
  warmup: string[];
  exercises: ExerciseTemplate[];
  created_at: string;
  updated_at: string;
}

// ─── Schedule ─────────────────────────────────────────────────
export interface ScheduleDay {
  d: number;
  t: WorkoutType;
}

export interface UserSchedule {
  user_id: string;
  mode: ScheduleMode;
  schedule: ScheduleDay[];
  updated_at: string;
}

// ─── Nutrition ────────────────────────────────────────────────
export interface FoodEntry {
  id: string;
  user_id: string;
  date: string;
  meal: MealType;
  food_name: string;
  portion: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
}

export interface WaterLog {
  id: string;
  user_id: string;
  date: string;
  amount_ml: number;
  updated_at: string;
}

export interface NutritionSettings {
  user_id: string;
  gender: string;
  activity_level: ActivityLevel;
  goal: Goal;
  custom_calories: number | null;
  custom_protein: number | null;
  custom_carbs: number | null;
  custom_fat: number | null;
  updated_at: string;
}

export interface FoodItem {
  id: string;
  name: string;
  cat: string;
  cal: number;
  p: number;
  c: number;
  f: number;
  serving?: number;
  unit?: string;
}

export interface CustomFood {
  id: string;
  user_id: string;
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: number;
  unit: string;
  created_at: string;
}

// ─── Supplements ──────────────────────────────────────────────
export interface CustomSupplement {
  id: string;
  user_id: string;
  group_key: SupplementGroup;
  supplement_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface SupplementLog {
  id: string;
  user_id: string;
  date: string;
  supplement_id: string;
  taken: boolean;
  created_at: string;
}

// ─── Body Measurements ───────────────────────────────────────
export interface BodyMeasurement {
  id: string;
  user_id: string;
  date: string;
  weight: number | null;
  body_fat: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  biceps: number | null;
  thigh: number | null;
  calf: number | null;
  neck: number | null;
  shoulders: number | null;
  created_at: string;
}

// ─── AI ───────────────────────────────────────────────────────
export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  ts?: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  title: string;
  messages: AIMessage[];
  created_at: string;
  updated_at: string;
}

export interface AITraining {
  id: string;
  user_id: string;
  date: string;
  plan_type: string;
  content: Record<string, unknown>;
  created_at: string;
}

// ─── Progress Photos ──────────────────────────────────────────
export interface ProgressPhoto {
  id: string;
  user_id: string;
  date: string;
  photo_url: string;
  weight: number | null;
  body_fat: number | null;
  notes: string;
  created_at: string;
}

// ─── Active Session ───────────────────────────────────────────
export interface ActiveSession {
  user_id: string;
  session_data: {
    screen: string;
    activeType: WorkoutType;
    workoutData: Record<string, WorkoutSetData[]>;
    warmupChecked: Record<string, boolean>;
    startTime: string;
    readiness?: ReadinessData;
  };
  updated_at: string;
}

export interface WorkoutSetData {
  weight: number | string;
  reps: number | string;
  rir: string;
  done: boolean;
  rest?: number;
  tempo?: string;
  note?: string;
}

// ─── Exercise Info ────────────────────────────────────────────
export interface ExerciseInfo {
  id: string;
  name: string;
  muscles: string[];
  cues: string[];
  mistakes?: string[];
  breathing?: string;
  proTip?: string;
  tempo?: string;
  imageUrl?: string;
}
