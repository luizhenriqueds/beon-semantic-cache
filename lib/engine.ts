import { createAnswerer } from "./answer";
import { createSemanticCache } from "./cache";
import { embed, generateAnswer, isBankingQuestion } from "./llm";

export const createEngine = (
  threshold = Number(process.env.SIMILARITY_THRESHOLD ?? 0.9),
) =>
  createAnswerer({
    llm: generateAnswer,
    embed,
    semantic: createSemanticCache(),
    threshold,
    isRelevant: isBankingQuestion,
  });

const g = globalThis as unknown as { engine?: ReturnType<typeof createEngine> };
export const engine = (g.engine ??= createEngine());
