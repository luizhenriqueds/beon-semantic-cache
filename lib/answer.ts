import { ExactCache } from "./cache/exact";
import type { SemanticCache } from "./cache/types";

export type Strategy = "none" | "exact" | "semantic";
export type Source = "llm" | "exact" | "semantic";

export type Result = {
  answer: string;
  source: Source;
  latencyMs: number;
  score?: number;
};

type Deps = {
  llm: (query: string) => Promise<string>;
  embed: (texts: string[]) => Promise<number[][]>;
  semantic: SemanticCache;
  threshold: number;
};

export function createAnswerer({ llm, embed, semantic, threshold }: Deps) {
  const exact = new ExactCache();
  const stats = { requests: 0, hits: 0, llmCalls: 0 };

  async function ask(query: string, strategy: Strategy): Promise<Result> {
    const start = performance.now();
    const done = (r: Omit<Result, "latencyMs">): Result => {
      stats.requests++;
      r.source === "llm" ? stats.llmCalls++ : stats.hits++;
      return { ...r, latencyMs: performance.now() - start };
    };

    if (strategy === "exact") {
      const cached = exact.get(query);
      if (cached) return done({ answer: cached, source: "exact" });
      const answer = await llm(query);
      exact.set(query, answer);
      return done({ answer, source: "llm" });
    }

    if (strategy === "semantic") {
      const [vector] = await embed([query]);
      const hit = await semantic.search(vector);
      if (hit && hit.score >= threshold) {
        return done({ answer: hit.answer, source: "semantic", score: hit.score });
      }
      const answer = await llm(query);
      await semantic.add(query, answer, vector);
      return done({ answer, source: "llm", score: hit?.score });
    }

    return done({ answer: await llm(query), source: "llm" });
  }

  async function reset() {
    exact.clear();
    await semantic.clear();
    Object.assign(stats, { requests: 0, hits: 0, llmCalls: 0 });
  }

  return { ask, reset, stats, exact, semantic };
}
