import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { editorTools } from "./tools";

const toolDeclarations = editorTools.map((tool) => ({
  name: tool.name,
  description: tool.description,
  parameters: { type: SchemaType.OBJECT, properties: {}, required: [] },
}));

export async function runGeminiAgent(prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");

  const client = new GoogleGenerativeAI(key);
  const model = client.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    tools: [{ functionDeclarations: toolDeclarations }],
    systemInstruction: "You are Resit's creative agent. Prefer deterministic editor and publishing tools over directly rewriting application state. Explain actions briefly and ask for confirmation before irreversible publishing actions.",
  });

  const result = await model.generateContent(prompt);
  return result.response;
}
