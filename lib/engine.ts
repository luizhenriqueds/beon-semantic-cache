import { createAnswerer } from "./answer";
import { createSemanticCache } from "./cache";
import { embed, generateAnswer } from "./llm";

export const createEngine = (
  threshold = Number(process.env.SIMILARITY_THRESHOLD ?? 0.85),
) =>
  createAnswerer({
    llm: generateAnswer,
    embed,
    semantic: createSemanticCache(),
    threshold,
  });

const g = globalThis as unknown as { engine?: ReturnType<typeof createEngine> };
export const engine = (g.engine ??= createEngine());
