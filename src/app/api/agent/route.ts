import { NextResponse } from 'next/server';
import { runGeminiAgent } from '@/lib/ai/gemini';

export async function POST(request: Request) {
  try {
    const { prompt, context } = await request.json();
    if (!prompt || typeof prompt !== 'string') return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    const fullPrompt = `${prompt}

Active editor state:
${JSON.stringify(context ?? {}, null, 2)}`;
    const response = await runGeminiAgent(fullPrompt);
    const candidate = response.response.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const actions = parts.filter((part: any) => part.functionCall).map((part: any) => ({ name: part.functionCall.name, args: part.functionCall.args ?? {} }));
    const text = parts.filter((part: any) => part.text).map((part: any) => part.text).join('
').trim();
    return NextResponse.json({ text, actions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Agent request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
