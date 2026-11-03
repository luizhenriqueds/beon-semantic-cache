import { GoogleGenAI } from "@google/genai";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fetchSplit } from "../lib/banking77";

const FILE = "data/answers.json";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const answers: Record<string, string> = existsSync(FILE)
  ? JSON.parse(readFileSync(FILE, "utf8"))
  : {};

const train = await fetchSplit("train");
const intents = [...new Set(train.map((r) => r.intent))].sort();

for (const intent of intents) {
  if (answers[intent]) continue;
  const examples = train
    .filter((r) => r.intent === intent)
    .slice(0, 4)
    .map((r) => `- ${r.text}`);
  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `You are a bank support agent. Customers ask questions like:\n${examples.join("\n")}\n\nWrite one helpful answer of 2-3 sentences that covers this topic. No greeting, no placeholders.`,
  });
  answers[intent] = res.text!.trim();
  writeFileSync(FILE, JSON.stringify(answers, null, 2) + "\n");
  console.log(`${Object.keys(answers).length}/${intents.length} ${intent}`);
}
