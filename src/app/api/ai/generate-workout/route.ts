import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { type, context, history } = await req.json();

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API kľúč nie je nastavený.' }, { status: 500 });
    }

    const systemPrompt = `Si fitness tréner AI. Generuješ tréningové plány vo formáte JSON.

Používateľ: ${context?.name || 'Unknown'}, ${context?.age || '?'}r, ${context?.height || '?'}cm, ${context?.weight || '?'}kg
Cieľ: ${context?.goal || 'maintain'}, Skúsenosti: ${context?.experience || 'intermediate'}

${history ? `Posledné tréningy: ${JSON.stringify(history.slice(0, 5))}` : ''}

Vráť JSON v tomto formáte:
{
  "name": "názov tréningu",
  "warmup": ["rozcvička 1", "rozcvička 2"],
  "exercises": [
    {
      "id": "exercise_id",
      "name": "Názov cviku",
      "sets": 3,
      "reps": "8-12",
      "rir": "1-2",
      "tempo": "3-0-1-0",
      "rest": 90,
      "note": "poznámka"
    }
  ],
  "recovery": ["tip 1", "tip 2"]
}

Pravidlá:
- Prispôsob objem a intenzitu skúsenostiam
- Compound cviky na začiatok, izolačné na koniec
- Vždy zahrň rozcvičku
- 5-7 cvikov na tréning
- Reálne váhové odporúčania`;

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
        messages: [{ role: 'user', content: `Vygeneruj ${type || 'PUSH'} tréning.` }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `AI error: ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const workout = JSON.parse(jsonMatch[0]);
      return NextResponse.json(workout);
    }

    return NextResponse.json({ error: 'Nepodarilo sa parsovať odpoveď.' }, { status: 500 });
  } catch (error) {
    console.error('AI generate error:', error);
    return NextResponse.json({ error: 'Chyba generovania.' }, { status: 500 });
  }
}
