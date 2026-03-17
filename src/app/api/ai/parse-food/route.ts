import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API kľúč nie je nastavený.' }, { status: 500 });
    }

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
        system: `Si nutričný AI asistent. Z textu extrahuj jedlá a ich nutričné hodnoty.
Vráť JSON array:
[{"name": "názov", "portion": 100, "unit": "g", "cal": 0, "p": 0, "c": 0, "f": 0}]
Odhadni makrá čo najpresnejšie. Použi slovenské názvy.`,
        messages: [{ role: 'user', content: text }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `AI error: ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    const responseText = data.content?.[0]?.text || '';
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return NextResponse.json({ foods: JSON.parse(jsonMatch[0]) });
    }

    return NextResponse.json({ foods: [], raw: responseText });
  } catch (error) {
    console.error('Parse food error:', error);
    return NextResponse.json({ error: 'Chyba parsovania.' }, { status: 500 });
  }
}
