import { describe, expect, it, vi } from "vitest";
import { OFF_TOPIC_ANSWER, createAnswerer } from "../lib/answer";
import type { SemanticCache } from "../lib/cache/types";

function setup(isRelevant?: (q: string) => Promise<boolean>) {
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
  return {
    llm,
    ...createAnswerer({ llm, embed, semantic, threshold: 0.85, isRelevant }),
  };
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
    expect(stats).toEqual({ requests: 2, hits: 1, llmCalls: 1, offTopic: 0 });
  });

  it("off-topic: refuses without calling the llm or caching", async () => {
    const { ask, llm, semantic } = setup(async (q) => !q.includes("gta"));
    const r = await ask("how can I play gta 6", "semantic");
    expect(r).toMatchObject({ source: "off_topic", answer: OFF_TOPIC_ANSWER });
    expect(llm).not.toHaveBeenCalled();
    expect(await semantic.search([0])).toBeNull();
  });

  it("relevant miss is answered as llm, then hits next time", async () => {
    const { ask } = setup(async () => true);
    expect((await ask("reset my pin", "semantic")).source).toBe("llm");
    expect((await ask("reset my pin", "semantic")).source).toBe("semantic");
  });
});
