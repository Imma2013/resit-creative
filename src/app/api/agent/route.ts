import { NextResponse } from "next/server";
import { runGeminiAgent } from "@/lib/ai/gemini";

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    if (!prompt || typeof prompt !== "string") return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    const response = await runGeminiAgent(prompt);
    return NextResponse.json({ text: response.text(), candidates: response.candidates ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
