import { NextRequest, NextResponse } from 'next/server';

/* Health history endpoint — returns aggregated health data for charts */

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id');
    const days = parseInt(req.nextUrl.searchParams.get('days') || '30');
    const metric = req.nextUrl.searchParams.get('metric'); // weight, hrv, rhr, sleep_hours, steps

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromStr = fromDate.toISOString().slice(0, 10);
    const toStr = new Date().toISOString().slice(0, 10);

    const fields = metric
      ? `date,${metric}`
      : 'date,weight,sleep_hours,hrv,rhr,steps,active_energy,body_battery,sleep_score,spo2,vo2_max,hr_avg,hr_max,stress,energy,source';

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/health_logs?user_id=eq.${userId}&date=gte.${fromStr}&date=lte.${toStr}&select=${fields}&order=date.asc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await res.json();

    return NextResponse.json({
      data: data || [],
      from: fromStr,
      to: toStr,
      count: Array.isArray(data) ? data.length : 0,
    });
  } catch (error) {
    console.error('Health history error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
