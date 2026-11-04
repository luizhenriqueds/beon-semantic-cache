import { describe, expect, it } from "vitest";
import { percentile, summarize, sweep } from "../bench/metrics";

describe("metrics", () => {
  it("percentile", () => {
    expect(percentile([10, 20, 30, 40], 50)).toBe(20);
    expect(percentile([10, 20, 30, 40], 95)).toBe(40);
  });

  it("summarize: hit rate, precision, recall", () => {
    const r = (intent: string, source: "llm" | "semantic", correct = true) => ({
      intent,
      source,
      correct,
      latencyMs: 100,
    });
    const s = summarize(
      [r("a", "semantic"), r("a", "semantic", false), r("b", "llm"), r("c", "llm")],
      new Set(["a"]),
    );
    expect(s).toMatchObject({ requests: 4, llmCalls: 2, hitRate: 0.5, precision: 0.5 });
    expect(s.recall).toBeCloseTo(1 / 2); // answerable: a, a
  });

  it("sweep: higher threshold trades recall for precision", () => {
    const probes = [
      { intent: "a", hitIntent: "a", score: 0.9 },
      { intent: "a", hitIntent: "b", score: 0.7 },
      { intent: "c", hitIntent: "a", score: 0.6 },
    ];
    const [low, high] = sweep(probes, new Set(["a"]), [0.5, 0.8]);
    expect(low.hitRate).toBe(1);
    expect(high).toMatchObject({ hitRate: 1 / 3, precision: 1, recall: 0.5 });
  });
});
