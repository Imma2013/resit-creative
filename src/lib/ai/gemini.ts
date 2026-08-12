import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { editorTools } from './tools';

const toolDeclarations = editorTools.map((tool) => ({
  name: tool.name,
  description: tool.description,
  parameters: { type: SchemaType.OBJECT, properties: {}, required: [] },
}));

export async function runGeminiAgent(prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not configured');

  const client = new GoogleGenerativeAI(key);
  const model = client.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',
    tools: [{ functionDeclarations: toolDeclarations }],
    systemInstruction: `You are Resit, a creative production agent. You operate the same deterministic tools that human editors use. Prefer small, explicit tool operations over rewriting application state. Never claim an edit happened unless a tool confirms it. Ask for confirmation before irreversible publishing actions. Available tool namespaces: design, video, social, assets, generate.`,
  });

  return model.generateContent(prompt);
}
