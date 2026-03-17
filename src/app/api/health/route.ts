import { NextRequest, NextResponse } from 'next/server';

// Apple Watch / HealthKit bridge endpoint
// iOS app sends health data via POST, web app fetches via GET

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, data } = body;

    if (!user_id || !data) {
      return NextResponse.json({ error: 'Missing user_id or data' }, { status: 400 });
    }

    // Forward to Supabase
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const today = new Date().toISOString().slice(0, 10);

    const healthData = {
      user_id,
      date: data.date || today,
      weight: data.weight || null,
      sleep_hours: data.sleepHours || null,
      sleep_score: data.sleepScore || null,
      body_battery: data.bodyBattery || null,
      hrv: data.hrv || null,
      rhr: data.rhr || null,
      steps: data.steps || null,
      active_energy: data.activeEnergy || null,
      basal_energy: data.basalEnergy || null,
      spo2: data.spO2 || null,
      respiratory_rate: data.respiratoryRate || null,
      vo2_max: data.vo2Max || null,
      walking_distance: data.walkingDistance || null,
      flights_climbed: data.flightsClimbed || null,
      stand_hours: data.standHours || null,
      hr_max: data.hrMax || null,
      hr_avg: data.hrAvg || null,
      source: data.source || 'apple-watch',
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/health_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation,resolution=merge-duplicates',
      },
      body: JSON.stringify(healthData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.message || 'Failed to save' }, { status: res.status });
    }

    const saved = await res.json();
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Health API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id');
  const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10);

  if (!userId) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/health_logs?user_id=eq.${userId}&date=eq.${date}&select=*`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    }
  );

  const data = await res.json();
  return NextResponse.json({ data: data?.[0] || null });
}
