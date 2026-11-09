import { ExactCache } from "./cache/exact";
import type { SemanticCache } from "./cache/types";

export type Strategy = "none" | "exact" | "semantic";
export type Source = "llm" | "exact" | "semantic" | "off_topic";

export const OFF_TOPIC_ANSWER =
  "Sorry, I can only help with banking questions such as cards, transfers, exchange rates and fees.";

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
  /** Returns false for questions unrelated to banking support. Defaults to always true. */
  isRelevant?: (query: string) => Promise<boolean>;
};

export function createAnswerer({
  llm,
  embed,
  semantic,
  threshold,
  isRelevant = async () => true,
}: Deps) {
  const exact = new ExactCache();
  const stats = { requests: 0, hits: 0, llmCalls: 0, offTopic: 0 };

  async function ask(query: string, strategy: Strategy): Promise<Result> {
    const start = performance.now();
    const done = (r: Omit<Result, "latencyMs">): Result => {
      stats.requests++;
      if (r.source === "llm") stats.llmCalls++;
      else if (r.source === "off_topic") stats.offTopic++;
      else stats.hits++;
      return { ...r, latencyMs: performance.now() - start };
    };

    if (strategy === "exact") {
      const cached = exact.get(query);
      if (cached) return done({ answer: cached, source: "exact" });
      if (!(await isRelevant(query))) {
        return done({ answer: OFF_TOPIC_ANSWER, source: "off_topic" });
      }
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
      // Miss: only answer (and cache) questions that are about banking.
      if (!(await isRelevant(query))) {
        return done({ answer: OFF_TOPIC_ANSWER, source: "off_topic", score: hit?.score });
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
    Object.assign(stats, { requests: 0, hits: 0, llmCalls: 0, offTopic: 0 });
  }

  return { ask, reset, stats, exact, semantic };
}
