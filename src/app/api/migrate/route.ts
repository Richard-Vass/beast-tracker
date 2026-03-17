import { NextRequest, NextResponse } from 'next/server';

// One-time Firebase → Supabase migration endpoint
// POST with JSON body containing all Firebase data

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key');
    if (apiKey !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { user_id, data } = body;

    if (!user_id || !data) {
      return NextResponse.json({ error: 'Missing user_id or data' }, { status: 400 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const results: Record<string, { success: number; errors: number }> = {};

    const supaInsert = async (table: string, rows: unknown[]) => {
      if (rows.length === 0) return;
      results[table] = { success: 0, errors: 0 };

      // Batch insert in chunks of 100
      for (let i = 0; i < rows.length; i += 100) {
        const chunk = rows.slice(i, i + 100);
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY!,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(chunk),
        });

        if (res.ok) {
          results[table].success += chunk.length;
        } else {
          results[table].errors += chunk.length;
          const err = await res.json().catch(() => ({}));
          console.error(`Migration error for ${table}:`, err);
        }
      }
    }

    // Migrate workouts
    if (data.workouts_v1) {
      const workoutRows: unknown[] = [];
      const setRows: unknown[] = [];

      for (const w of data.workouts_v1) {
        const workoutId = crypto.randomUUID();
        workoutRows.push({
          id: workoutId,
          user_id,
          date: w.date || new Date().toISOString(),
          type: w.type || 'PUSH',
          duration: w.duration ? Math.round(w.duration * 60) : null,
          readiness: w.readiness || {},
          notes: w.notes || '',
        });

        if (w.data) {
          for (const [exId, sets] of Object.entries(w.data)) {
            const setsArr = sets as Array<{ weight?: number; reps?: number; rir?: string; done?: boolean }>;
            setsArr.forEach((s, i) => {
              if (s.done) {
                setRows.push({
                  workout_id: workoutId,
                  exercise_id: exId,
                  exercise_name: exId.replace(/_/g, ' '),
                  set_number: i + 1,
                  weight: s.weight || null,
                  reps: s.reps || null,
                  rir: s.rir || '',
                  done: true,
                });
              }
            });
          }
        }
      }

      await supaInsert('workouts', workoutRows);
      await supaInsert('workout_sets', setRows);
    }

    // Migrate health logs
    if (data.health_logs_v1) {
      const rows = Object.entries(data.health_logs_v1).map(([date, d]: [string, unknown]) => {
        const log = d as Record<string, unknown>;
        return {
          user_id,
          date,
          weight: log.weight || null,
          sleep_hours: log.sleepHours || null,
          sleep_score: log.sleepScore || null,
          body_battery: log.bodyBattery || null,
          hrv: log.hrv || null,
          rhr: log.rhr || null,
          steps: log.steps || null,
          active_energy: log.activeEnergy || null,
          stress: log.stress || null,
          energy: log.energy || null,
          source: (log.source as string) || 'import',
        };
      });
      await supaInsert('health_logs', rows);
    }

    // Migrate food diary
    if (data.food_diary_v1) {
      const rows: unknown[] = [];
      for (const [date, dayData] of Object.entries(data.food_diary_v1)) {
        const day = dayData as { meals?: Record<string, Array<{ name: string; cal: number; p: number; c: number; f: number; portion?: number; unit?: string }>> };
        if (day.meals) {
          for (const [meal, foods] of Object.entries(day.meals)) {
            for (const food of foods) {
              rows.push({
                user_id,
                date,
                meal,
                food_name: food.name,
                portion: food.portion || 100,
                unit: food.unit || 'g',
                calories: food.cal || 0,
                protein: food.p || 0,
                carbs: food.c || 0,
                fat: food.f || 0,
              });
            }
          }
        }
      }
      await supaInsert('food_diary', rows);
    }

    // Migrate body measurements
    if (data.body_measurements_v1) {
      const rows = Object.entries(data.body_measurements_v1).map(([date, d]: [string, unknown]) => {
        const m = d as Record<string, number>;
        return { user_id, date, ...m };
      });
      await supaInsert('body_measurements', rows);
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
