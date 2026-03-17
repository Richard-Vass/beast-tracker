import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json();

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ reply: 'API kľúč nie je nastavený.' }, { status: 500 });
    }

    const systemPrompt = `Si Beast Tracker AI tréner — osobný fitness asistent. Komunikuješ po slovensky.

Kontext používateľa:
- Meno: ${context?.name || 'Unknown'}
- Vek: ${context?.age || '?'} rokov
- Výška: ${context?.height || '?'} cm
- Váha: ${context?.weight || '?'} kg
- Cieľ: ${context?.goal || 'maintain'}
- Skúsenosti: ${context?.experience || 'intermediate'}

Tvoje schopnosti:
1. Odporúčania k tréningu — výber cvikov, zostavy, objemy, intenzity
2. Výživa — makrá, kalórie, timing jedla
3. Regenerácia — spánok, stres management, deload
4. Suplementácia — dávkovanie, timing
5. Analýza progresu — čo funguje, čo zmeniť

Pravidlá:
- Buď stručný ale informatívny
- Prispôsob odporúčania profilu používateľa
- Ak nemáš dosť informácií, pýtaj sa
- Používaj metrické jednotky (kg, cm)
- Ak sa pýtajú na niečo medicínske, odporuč lekára`;

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
        messages: messages.slice(-20), // Keep last 20 messages for context
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ reply: `AI chyba: ${err.error?.message || res.status}` }, { status: 500 });
    }

    const data = await res.json();
    const reply = data.content?.[0]?.text || 'Prázdna odpoveď';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json({ reply: 'Chyba pripojenia k AI.' }, { status: 500 });
  }
}
