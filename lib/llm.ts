import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateAnswer(query: string): Promise<string> {
  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `You are a bank support agent. Answer in 2-3 sentences, no greeting.\n\nCustomer: ${query}`,
  });
  return res.text!.trim();
}

export async function isBankingQuestion(query: string): Promise<boolean> {
  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    config: { temperature: 0, maxOutputTokens: 5, thinkingConfig: { thinkingBudget: 0 } },
    contents: `You screen messages for a retail bank's customer support chat. Reply with exactly YES if the message is a question or request a bank support agent could answer (cards, PINs, transfers, top-ups, exchange rates, fees, limits, declined payments, accounts, identity verification). Reply with exactly NO for anything else (games, trivia, coding, general chit-chat, other companies' products).\n\nMessage: ${JSON.stringify(query)}`,
  });
  return res.text?.trim().toUpperCase().startsWith("YES") ?? false;
}

export async function embed(texts: string[]): Promise<number[][]> {
  const res = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: texts,
    config: { outputDimensionality: 768, taskType: "SEMANTIC_SIMILARITY" },
  });
  return res.embeddings!.map((e) => e.values!);
}
