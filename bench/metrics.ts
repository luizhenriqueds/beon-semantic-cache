export type Source = "llm" | "exact" | "semantic" | "off_topic";
export type Rec = { intent: string; source: Source; latencyMs: number; correct: boolean };
export type Probe = { intent: string; hitIntent: string | null; score: number };

export function percentile(values: number[], p: number) {
  const s = [...values].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)] : 0;
}

const ratio = (a: number, b: number) => (b ? a / b : 0);

// recall = correct hits / requests whose intent already had a cached answer available
export function summarize(records: Rec[], seeded: Set<string>) {
  const known = new Set(seeded);
  let hits = 0;
  let correct = 0;
  let answerable = 0;
  for (const r of records) {
    if (known.has(r.intent)) answerable++;
    known.add(r.intent);
    if (r.source !== "llm") {
      hits++;
      if (r.correct) correct++;
    }
  }
  const lat = records.map((r) => r.latencyMs);
  return {
    requests: records.length,
    llmCalls: records.length - hits,
    hitRate: ratio(hits, records.length),
    precision: ratio(correct, hits),
    recall: ratio(correct, answerable),
    p50: percentile(lat, 50),
    p95: percentile(lat, 95),
    mean: ratio(
      lat.reduce((a, b) => a + b, 0),
      lat.length,
    ),
  };
}

export function sweep(probes: Probe[], seeded: Set<string>, thresholds: number[]) {
  const answerable = probes.filter((p) => seeded.has(p.intent)).length;
  return thresholds.map((threshold) => {
    const hits = probes.filter((p) => p.score >= threshold);
    const correct = hits.filter((p) => p.hitIntent === p.intent).length;
    return {
      threshold,
      hitRate: ratio(hits.length, probes.length),
      precision: hits.length ? correct / hits.length : null,
      recall: ratio(correct, answerable),
    };
  });
}

export type Summary = ReturnType<typeof summarize>;
export type SweepPoint = ReturnType<typeof sweep>[number];
