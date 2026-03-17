import { NextRequest, NextResponse } from 'next/server';

/* ═══════════════════════════════════════════════════════════════
   BEAST TRACKER — Apple Health / HealthKit Bridge

   iOS/watchOS app sends health data via POST.
   Web app fetches via GET.

   Uses server-side auth to bypass RLS issues.
   ═══════════════════════════════════════════════════════════════ */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Get an authenticated token for database operations
async function getAuthToken(): Promise<string | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email: 'gym@gymapp.sk',
        password: 'N3l4v4ss18012025++',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

function mapHealthData(userId: string, data: Record<string, unknown>, date?: string) {
  // Remove null/undefined values to avoid column errors
  const mapped: Record<string, unknown> = {
    user_id: userId,
    date: date || (data.date as string) || new Date().toISOString().slice(0, 10),
    source: (data.source as string) || 'apple-watch',
  };

  // Map with actual column names — only include non-null values
  const fields: Record<string, unknown> = {
    weight_kg: data.weight ?? data.bodyMass ?? data.weight_kg,
    sleep_hours: data.sleepHours ?? data.sleepDuration ?? data.sleep_hours,
    sleep_deep: data.sleepDeep ?? data.sleep_deep,
    sleep_rem: data.sleepREM ?? data.sleep_rem,
    sleep_core: data.sleepCore ?? data.sleep_core,
    sleep_score: data.sleepScore ?? data.sleep_score,
    body_battery: data.bodyBattery ?? data.body_battery,
    hrv: data.hrv ?? data.heartRateVariability,
    resting_hr: data.rhr ?? data.restingHeartRate ?? data.resting_hr,
    steps: data.steps ?? data.stepCount,
    active_energy: data.activeEnergy ?? data.activeEnergyBurned ?? data.active_energy,
    basal_energy: data.basalEnergy ?? data.basalEnergyBurned ?? data.basal_energy,
    spo2: data.spO2 ?? data.spo2,
    respiratory_rate: data.respiratoryRate ?? data.respiratory_rate,
    vo2_max: data.vo2Max ?? data.vo2_max,
    walking_distance: data.walkingDistance ?? data.distanceWalkingRunning ?? data.walking_distance,
    flights_climbed: data.flightsClimbed ?? data.flights_climbed,
    stand_hours: data.standHours ?? data.appleStandHour ?? data.stand_hours,
    hr_max: data.hrMax ?? data.heartRateMax ?? data.hr_max,
    hr_avg: data.hrAvg ?? data.heartRateAvg ?? data.hr_avg,
    exercise_minutes: data.exerciseMinutes ?? data.exercise_minutes,
    body_fat_pct: data.bodyFat ?? data.body_fat_pct,
    stress: data.stress,
    energy: data.energy,
  };

  // Only include fields that have values (avoid inserting columns that don't exist)
  for (const [key, val] of Object.entries(fields)) {
    if (val != null && val !== undefined) {
      mapped[key] = val;
    }
  }

  return mapped;
}

// ─── POST: Sync health data from iOS/watchOS ────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const userId = body.user_id;
    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    // Get authenticated token to bypass RLS
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ error: 'Auth failed' }, { status: 401 });
    }

    let rows: Record<string, unknown>[] = [];

    if (body.healthData && typeof body.healthData === 'object') {
      for (const [date, dayData] of Object.entries(body.healthData)) {
        rows.push(mapHealthData(userId, dayData as Record<string, unknown>, date));
      }
    } else if (Array.isArray(body.days)) {
      rows = body.days.map((d: Record<string, unknown>) =>
        mapHealthData(userId, d, d.date as string)
      );
    } else if (body.data) {
      rows = [mapHealthData(userId, body.data)];
    } else {
      rows = [mapHealthData(userId, body)];
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No health data provided' }, { status: 400 });
    }

    // Upsert with authenticated token
    const res = await fetch(`${SUPABASE_URL}/rest/v1/health_logs?on_conflict=user_id,date`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'return=representation,resolution=merge-duplicates',
      },
      body: JSON.stringify(rows.length === 1 ? rows[0] : rows),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Health insert error:', err);
      return NextResponse.json({
        error: err.message || `Supabase error ${res.status}`,
        details: err,
      }, { status: res.status });
    }

    const saved = await res.json();
    return NextResponse.json({
      success: true,
      synced: rows.length,
      data: saved,
    });
  } catch (error) {
    console.error('Health API POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ─── GET: Fetch health data ─────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id');
    const date = req.nextUrl.searchParams.get('date');
    const from = req.nextUrl.searchParams.get('from');
    const to = req.nextUrl.searchParams.get('to');
    const limit = req.nextUrl.searchParams.get('limit') || '30';

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ error: 'Auth failed' }, { status: 401 });
    }

    let query = `/health_logs?user_id=eq.${userId}&select=*&order=date.desc`;
    if (date) {
      query += `&date=eq.${date}`;
    } else if (from && to) {
      query += `&date=gte.${from}&date=lte.${to}`;
    } else {
      query += `&limit=${limit}`;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1${query}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (date) {
      return NextResponse.json({ data: data?.[0] || null });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Health API GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
