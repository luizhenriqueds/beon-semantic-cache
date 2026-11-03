import { describe, expect, it, vi } from "vitest";
import { createAnswerer } from "../lib/answer";
import type { SemanticCache } from "../lib/cache/types";

function setup() {
  const entries: { v: number[]; answer: string }[] = [];
  const semantic: SemanticCache = {
    async search(v) {
      const e = entries[0];
      return e ? { answer: e.answer, score: v[0] === e.v[0] ? 0.95 : 0.2 } : null;
    },
    async add(_q, answer, v) {
      entries.push({ v, answer });
    },
    async clear() {
      entries.length = 0;
    },
  };
  const llm = vi.fn(async (q: string) => `answer:${q}`);
  const embed = vi.fn(async (t: string[]) => t.map((s) => [s.includes("pin") ? 1 : 0]));
  return { llm, ...createAnswerer({ llm, embed, semantic, threshold: 0.85 }) };
}

describe("answerer", () => {
  it("none: always calls the llm", async () => {
    const { ask, llm } = setup();
    await ask("reset my pin", "none");
    await ask("reset my pin", "none");
    expect(llm).toHaveBeenCalledTimes(2);
  });

  it("exact: hits only on identical text", async () => {
    const { ask, llm } = setup();
    await ask("Reset my PIN", "exact");
    expect((await ask(" reset my pin ", "exact")).source).toBe("exact");
    expect((await ask("forgot my pin", "exact")).source).toBe("llm");
    expect(llm).toHaveBeenCalledTimes(2);
  });

  it("semantic: hits on similar text, misses on different intent", async () => {
    const { ask, llm } = setup();
    await ask("reset my pin", "semantic");
    expect((await ask("forgot my pin", "semantic")).source).toBe("semantic");
    expect((await ask("where is my card", "semantic")).source).toBe("llm");
    expect(llm).toHaveBeenCalledTimes(2);
  });

  it("tracks stats", async () => {
    const { ask, stats } = setup();
    await ask("reset my pin", "exact");
    await ask("reset my pin", "exact");
    expect(stats).toEqual({ requests: 2, hits: 1, llmCalls: 1 });
  });
});
