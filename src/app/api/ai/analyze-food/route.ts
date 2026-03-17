import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json(); // base64 image

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API kľúč nie je nastavený.' }, { status: 500 });
    }

    // Extract base64 data and media type
    const match = image?.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Neplatný formát obrázka.' }, { status: 400 });
    }

    const mediaType = match[1];
    const base64Data = match[2];

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            {
              type: 'text',
              text: `Analyzuj toto jedlo na obrázku. Identifikuj jednotlivé položky a odhadni ich nutričné hodnoty.
Vráť JSON array:
[{"name": "názov jedla (slovensky)", "portion": 100, "unit": "g", "cal": 0, "p": 0, "c": 0, "f": 0}]
Buď čo najpresnejší v odhadoch porcií a makier.`,
            },
          ],
        }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `AI error: ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return NextResponse.json({ foods: JSON.parse(jsonMatch[0]) });
    }

    return NextResponse.json({ foods: [], description: text });
  } catch (error) {
    console.error('Analyze food error:', error);
    return NextResponse.json({ error: 'Chyba analýzy.' }, { status: 500 });
  }
}
