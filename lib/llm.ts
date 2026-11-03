import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateAnswer(query: string): Promise<string> {
  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `You are a bank support agent. Answer in 2-3 sentences, no greeting.\n\nCustomer: ${query}`,
  });
  return res.text!.trim();
}

export async function embed(texts: string[]): Promise<number[][]> {
  const res = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: texts,
    config: { outputDimensionality: 768, taskType: "SEMANTIC_SIMILARITY" },
  });
  return res.embeddings!.map((e) => e.values!);
}
