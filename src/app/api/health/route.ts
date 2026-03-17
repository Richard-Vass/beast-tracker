import { NextRequest, NextResponse } from 'next/server';

/* ═══════════════════════════════════════════════════════════════
   BEAST TRACKER — Apple Health / HealthKit Bridge

   iOS/watchOS app sends health data via POST.
   Web app fetches via GET.
   Supports single-day and bulk multi-day sync (like Livity).
   ═══════════════════════════════════════════════════════════════ */

const getSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, key };
};

const supaFetch = async (path: string, options: { method?: string; body?: unknown; key: string; url: string }) => {
  const res = await fetch(`${options.url}/rest/v1${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'apikey': options.key,
      'Authorization': `Bearer ${options.key}`,
      ...(options.method === 'POST' ? { 'Prefer': 'return=representation,resolution=merge-duplicates' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return res;
};

function mapHealthData(userId: string, data: Record<string, unknown>, date?: string) {
  return {
    user_id: userId,
    date: date || (data.date as string) || new Date().toISOString().slice(0, 10),
    weight: data.weight ?? data.bodyMass ?? null,
    sleep_hours: data.sleepHours ?? data.sleepDuration ?? null,
    sleep_score: data.sleepScore ?? null,
    body_battery: data.bodyBattery ?? null,
    hrv: data.hrv ?? data.heartRateVariability ?? null,
    rhr: data.rhr ?? data.restingHeartRate ?? null,
    steps: data.steps ?? data.stepCount ?? null,
    active_energy: data.activeEnergy ?? data.activeEnergyBurned ?? null,
    basal_energy: data.basalEnergy ?? data.basalEnergyBurned ?? null,
    spo2: data.spO2 ?? data.oxygenSaturation ?? null,
    respiratory_rate: data.respiratoryRate ?? null,
    vo2_max: data.vo2Max ?? null,
    walking_distance: data.walkingDistance ?? data.distanceWalkingRunning ?? null,
    flights_climbed: data.flightsClimbed ?? null,
    stand_hours: data.standHours ?? data.appleStandHour ?? null,
    hr_max: data.hrMax ?? data.heartRateMax ?? null,
    hr_avg: data.hrAvg ?? data.heartRateAvg ?? null,
    stress: data.stress ?? null,
    energy: data.energy ?? null,
    source: (data.source as string) || 'apple-watch',
  };
}

// ─── POST: Sync health data from iOS/watchOS ────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, key } = getSupabaseConfig();

    if (!url || !key) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    // Support both single and bulk sync
    // Single: { user_id, data: { weight, hrv, ... } }
    // Bulk:   { user_id, days: [ { date: "2026-03-17", weight, hrv, ... }, ... ] }
    // Livity-style: { user_id, healthData: { "2026-03-17": { ... }, "2026-03-16": { ... } } }

    const userId = body.user_id;
    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    let rows: Record<string, unknown>[] = [];

    if (body.healthData && typeof body.healthData === 'object') {
      // Livity-style: keyed by date
      for (const [date, dayData] of Object.entries(body.healthData)) {
        rows.push(mapHealthData(userId, dayData as Record<string, unknown>, date));
      }
    } else if (Array.isArray(body.days)) {
      // Bulk array
      rows = body.days.map((d: Record<string, unknown>) =>
        mapHealthData(userId, d, d.date as string)
      );
    } else if (body.data) {
      // Single day
      rows = [mapHealthData(userId, body.data)];
    } else {
      // Direct fields on body
      rows = [mapHealthData(userId, body)];
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No health data provided' }, { status: 400 });
    }

    // Upsert all rows (on_conflict = user_id, date)
    const res = await supaFetch('/health_logs?on_conflict=user_id,date', {
      method: 'POST',
      body: rows,
      key,
      url,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
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

    const { url, key } = getSupabaseConfig();
    if (!url || !key) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    let query = `/health_logs?user_id=eq.${userId}&select=*&order=date.desc`;

    if (date) {
      // Single day
      query += `&date=eq.${date}`;
    } else if (from && to) {
      // Date range
      query += `&date=gte.${from}&date=lte.${to}`;
    } else {
      // Last N days
      query += `&limit=${limit}`;
    }

    const res = await supaFetch(query, { key, url });
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
