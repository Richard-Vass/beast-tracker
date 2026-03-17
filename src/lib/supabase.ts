/* ═══════════════════════════════════════════════════════════════
   BEAST TRACKER — Supabase Client (fetch-based, no SDK)
   ═══════════════════════════════════════════════════════════════ */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ─── Session Management ──────────────────────────────────────
let accessToken: string | null = null;
let refreshToken: string | null = null;

function setSession(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  if (typeof window !== 'undefined') {
    localStorage.setItem('bt-access-token', access);
    localStorage.setItem('bt-refresh-token', refresh);
    document.cookie = `sb-access-token=${access}; path=/; max-age=${7 * 86400}; SameSite=Lax`;
  }
}

function getSession() {
  if (!accessToken && typeof window !== 'undefined') {
    accessToken = localStorage.getItem('bt-access-token');
    refreshToken = localStorage.getItem('bt-refresh-token');
  }
  return { accessToken, refreshToken };
}

function clearSession() {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('bt-access-token');
    localStorage.removeItem('bt-refresh-token');
    document.cookie = 'sb-access-token=; path=/; max-age=0';
  }
}

// ─── Core Fetch Helper ──────────────────────────────────────
async function supaFetch<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    isAuth?: boolean;
  } = {}
): Promise<{ data: T | null; error: string | null }> {
  const { method = 'GET', body, headers = {}, isAuth = false } = options;
  const baseUrl = isAuth ? `${SUPABASE_URL}/auth/v1` : `${SUPABASE_URL}/rest/v1`;
  const session = getSession();

  const reqHeaders: Record<string, string> = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...headers,
  };

  if (session.accessToken && !isAuth) {
    reqHeaders['Authorization'] = `Bearer ${session.accessToken}`;
  }

  if ((method === 'POST' || method === 'PATCH') && !isAuth) {
    reqHeaders['Prefer'] = headers['Prefer'] || 'return=representation';
  }

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { data: null, error: errBody.message || errBody.error_description || errBody.msg || `Error ${res.status}` };
    }

    if (res.status === 204) return { data: null, error: null };

    const data = await res.json();
    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Network error' };
  }
}

// ─── Auth ────────────────────────────────────────────────────
export const auth = {
  async signUp(email: string, password: string) {
    const result = await supaFetch<{ access_token: string; refresh_token: string; user: { id: string; email: string } }>('/signup', {
      method: 'POST',
      body: { email, password },
      isAuth: true,
    });
    if (result.data?.access_token) {
      setSession(result.data.access_token, result.data.refresh_token);
    }
    return result;
  },

  async signIn(email: string, password: string) {
    const result = await supaFetch<{ access_token: string; refresh_token: string; user: { id: string; email: string } }>(
      '/token?grant_type=password',
      { method: 'POST', body: { email, password }, isAuth: true }
    );
    if (result.data?.access_token) {
      setSession(result.data.access_token, result.data.refresh_token);
    }
    return result;
  },

  async signOut() {
    const session = getSession();
    if (session.accessToken) {
      await supaFetch('/logout', {
        method: 'POST',
        isAuth: true,
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
    }
    clearSession();
  },

  async refreshSession() {
    const session = getSession();
    if (!session.refreshToken) return { data: null, error: 'No refresh token' };
    const result = await supaFetch<{ access_token: string; refresh_token: string }>(
      '/token?grant_type=refresh_token',
      { method: 'POST', body: { refresh_token: session.refreshToken }, isAuth: true }
    );
    if (result.data?.access_token) {
      setSession(result.data.access_token, result.data.refresh_token);
    }
    return result;
  },

  async getUser() {
    const session = getSession();
    if (!session.accessToken) return { data: null, error: 'Not authenticated' };
    return supaFetch<{ id: string; email: string }>('/user', {
      isAuth: true,
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
  },

  isAuthenticated() {
    return !!getSession().accessToken;
  },
};

// ─── Database CRUD Factory ──────────────────────────────────
function createTable<T>(table: string) {
  return {
    async getAll(query = ''): Promise<{ data: T[] | null; error: string | null }> {
      return supaFetch<T[]>(`/${table}?select=*&order=created_at.desc${query ? '&' + query : ''}`);
    },

    async getById(id: string): Promise<{ data: T | null; error: string | null }> {
      const result = await supaFetch<T[]>(`/${table}?id=eq.${id}&select=*`);
      return { data: result.data?.[0] || null, error: result.error };
    },

    async getByDate(date: string, extraQuery = ''): Promise<{ data: T[] | null; error: string | null }> {
      return supaFetch<T[]>(`/${table}?date=eq.${date}&select=*${extraQuery ? '&' + extraQuery : ''}`);
    },

    async getByDateRange(from: string, to: string, extraQuery = ''): Promise<{ data: T[] | null; error: string | null }> {
      return supaFetch<T[]>(`/${table}?date=gte.${from}&date=lte.${to}&select=*&order=date.desc${extraQuery ? '&' + extraQuery : ''}`);
    },

    async create(data: Partial<T>): Promise<{ data: T | null; error: string | null }> {
      const result = await supaFetch<T[]>(`/${table}`, { method: 'POST', body: data });
      return { data: result.data?.[0] || null, error: result.error };
    },

    async createMany(data: Partial<T>[]): Promise<{ data: T[] | null; error: string | null }> {
      return supaFetch<T[]>(`/${table}`, { method: 'POST', body: data });
    },

    async update(id: string, data: Partial<T>): Promise<{ data: T | null; error: string | null }> {
      const result = await supaFetch<T[]>(`/${table}?id=eq.${id}`, { method: 'PATCH', body: data });
      return { data: result.data?.[0] || null, error: result.error };
    },

    async upsert(data: Partial<T>, onConflict = 'id'): Promise<{ data: T | null; error: string | null }> {
      const result = await supaFetch<T[]>(`/${table}?on_conflict=${onConflict}`, {
        method: 'POST',
        body: data,
        headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
      });
      return { data: result.data?.[0] || null, error: result.error };
    },

    async delete(id: string): Promise<{ error: string | null }> {
      return supaFetch(`/${table}?id=eq.${id}`, { method: 'DELETE' });
    },

    async deleteByQuery(query: string): Promise<{ error: string | null }> {
      return supaFetch(`/${table}?${query}`, { method: 'DELETE' });
    },

    async count(query = ''): Promise<number> {
      const result = await supaFetch<T[]>(`/${table}?select=id${query ? '&' + query : ''}`, {
        headers: { Prefer: 'count=exact' },
      });
      return Array.isArray(result.data) ? result.data.length : 0;
    },
  };
}

// ─── Typed Table Access ─────────────────────────────────────
import type {
  UserProfile, Workout, WorkoutSet, CustomWorkout, HealthLog,
  FoodEntry, WaterLog, BodyMeasurement, AIConversation, AITraining,
  ProgressPhoto, CustomSupplement, SupplementLog, CustomFood,
} from '@/types';

export const db = {
  profiles: createTable<UserProfile>('user_profiles'),
  workouts: createTable<Workout>('workouts'),
  workoutSets: createTable<WorkoutSet>('workout_sets'),
  customWorkouts: createTable<CustomWorkout>('custom_workouts'),
  healthLogs: createTable<HealthLog>('health_logs'),
  foodDiary: createTable<FoodEntry>('food_diary'),
  waterLogs: createTable<WaterLog>('water_logs'),
  bodyMeasurements: createTable<BodyMeasurement>('body_measurements'),
  aiConversations: createTable<AIConversation>('ai_conversations'),
  aiTrainings: createTable<AITraining>('ai_trainings'),
  progressPhotos: createTable<ProgressPhoto>('progress_photos'),
  customSupplements: createTable<CustomSupplement>('custom_supplements'),
  supplementLogs: createTable<SupplementLog>('supplement_logs'),
  customFoods: createTable<CustomFood>('custom_foods'),

  // ─── Singleton tables (keyed by user_id) ──────────────────
  schedule: {
    async get(): Promise<{ data: import('@/types').UserSchedule | null; error: string | null }> {
      const result = await supaFetch<import('@/types').UserSchedule[]>('/user_schedules?select=*');
      return { data: result.data?.[0] || null, error: result.error };
    },
    async upsert(data: Partial<import('@/types').UserSchedule>): Promise<{ data: import('@/types').UserSchedule | null; error: string | null }> {
      const result = await supaFetch<import('@/types').UserSchedule[]>('/user_schedules', {
        method: 'POST',
        body: data,
        headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
      });
      return { data: result.data?.[0] || null, error: result.error };
    },
  },

  nutritionSettings: {
    async get(): Promise<{ data: import('@/types').NutritionSettings | null; error: string | null }> {
      const result = await supaFetch<import('@/types').NutritionSettings[]>('/nutrition_settings?select=*');
      return { data: result.data?.[0] || null, error: result.error };
    },
    async upsert(data: Partial<import('@/types').NutritionSettings>): Promise<{ data: import('@/types').NutritionSettings | null; error: string | null }> {
      const result = await supaFetch<import('@/types').NutritionSettings[]>('/nutrition_settings', {
        method: 'POST',
        body: data,
        headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
      });
      return { data: result.data?.[0] || null, error: result.error };
    },
  },

  activeSession: {
    async get(): Promise<{ data: import('@/types').ActiveSession | null; error: string | null }> {
      const result = await supaFetch<import('@/types').ActiveSession[]>('/active_sessions?select=*');
      return { data: result.data?.[0] || null, error: result.error };
    },
    async upsert(data: Partial<import('@/types').ActiveSession>): Promise<{ data: import('@/types').ActiveSession | null; error: string | null }> {
      const result = await supaFetch<import('@/types').ActiveSession[]>('/active_sessions', {
        method: 'POST',
        body: data,
        headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
      });
      return { data: result.data?.[0] || null, error: result.error };
    },
    async clear(): Promise<{ error: string | null }> {
      return supaFetch('/active_sessions', { method: 'DELETE' });
    },
  },

  // ─── Workout Sets by workout ──────────────────────────────
  async getWorkoutSets(workoutId: string) {
    return supaFetch<WorkoutSet[]>(`/workout_sets?workout_id=eq.${workoutId}&select=*&order=exercise_id,set_number`);
  },
};

// ─── Polling Subscription ────────────────────────────────────
export function subscribeToTable(
  table: string,
  callback: (event: { type: string; record: unknown }) => void
) {
  let lastCheck = new Date().toISOString();
  let active = true;

  const poll = async () => {
    if (!active || !auth.isAuthenticated()) return;
    try {
      const result = await supaFetch<Array<{ id: string; updated_at: string }>>(`/${table}?updated_at=gt.${lastCheck}&select=id,updated_at&order=updated_at.desc&limit=20`);
      if (result.data && result.data.length > 0) {
        lastCheck = new Date().toISOString();
        result.data.forEach(record => callback({ type: 'UPDATE', record }));
      }
    } catch { /* ignore polling errors */ }
    if (active) setTimeout(poll, 5000);
  };

  setTimeout(poll, 5000);
  return () => { active = false; };
}

export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}
