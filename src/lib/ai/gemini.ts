import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { editorTools } from './tools';

const toSchema = (value: unknown): any => {
  if (!value || typeof value !== 'object') return { type: SchemaType.OBJECT, properties: {} };
  const schema: any = { ...(value as Record<string, unknown>) };
  const map: Record<string, SchemaType> = {
    OBJECT: SchemaType.OBJECT,
    STRING: SchemaType.STRING,
    NUMBER: SchemaType.NUMBER,
    BOOLEAN: SchemaType.BOOLEAN,
    ARRAY: SchemaType.ARRAY
  };
  if (typeof schema.type === 'string' && map[schema.type]) schema.type = map[schema.type];
  if (schema.properties) {
    for (const key of Object.keys(schema.properties)) schema.properties[key] = toSchema(schema.properties[key]);
  }
  return schema;
};

const toolDeclarations = editorTools.map((tool) => ({
  name: tool.name,
  description: tool.description,
  parameters: toSchema(tool.parameters)
}));

export async function runGeminiAgent(prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not configured');
  const client = new GoogleGenerativeAI(key);
  const model = client.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',
    tools: [{ functionDeclarations: toolDeclarations as any }],
    systemInstruction: `You are Resit, a creative production agent. Operate the same deterministic tools humans use. Prefer small explicit operations over rewriting application state. Never claim an edit happened unless you returned a tool call. For irreversible publishing actions, ask for confirmation.

Current task context:
${prompt}`
  });
  return model.generateContent(prompt);
}
