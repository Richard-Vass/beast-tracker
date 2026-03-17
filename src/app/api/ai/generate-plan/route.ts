import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { context, healthData, recentWorkouts, schedule } = await req.json();

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API kľúč nie je nastavený.' }, { status: 500 });
    }

    const systemPrompt = `Si AI tréner. Analyzuj dnešné zdravotné dáta a navrhni optimálny tréningový plán.

Používateľ: ${JSON.stringify(context || {})}
Dnešné zdravotné dáta: ${JSON.stringify(healthData || {})}
Posledné tréningy: ${JSON.stringify(recentWorkouts?.slice(0, 5) || [])}
Rozvrh: ${JSON.stringify(schedule || {})}

Vráť JSON:
{
  "recommendation": "train" | "light" | "rest",
  "reason": "stručné vysvetlenie",
  "type": "PUSH" | "PULL" | "LEGS" | "UPPER" | "LOWER" | "FULL" | "Z2",
  "intensity": "high" | "moderate" | "low",
  "exercises": [...],
  "warmup": [...],
  "recovery_tips": [...]
}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: 'Aký tréning by som mal dnes robiť?' }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `AI error: ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return NextResponse.json(JSON.parse(jsonMatch[0]));
    }

    return NextResponse.json({ recommendation: 'train', reason: text.slice(0, 200) });
  } catch (error) {
    console.error('AI plan error:', error);
    return NextResponse.json({ error: 'Chyba generovania plánu.' }, { status: 500 });
  }
}
