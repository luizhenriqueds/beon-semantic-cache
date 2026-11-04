import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createAnswerer, type Strategy } from "../lib/answer";
import { createSemanticCache } from "../lib/cache";
import { db } from "../lib/db";
import { embed, generateAnswer } from "../lib/llm";
import { summarize, sweep, type Probe, type Rec } from "./metrics";

const N = Number(process.env.BENCH_QUERIES ?? 100);
const SEEDED_INTENTS = Number(process.env.BENCH_SEEDED_INTENTS ?? 60);
const PER_INTENT = Number(process.env.BENCH_SEEDS_PER_INTENT ?? 5);
const REPEAT_RATE = Number(process.env.BENCH_REPEAT_RATE ?? 0.2);
const THRESHOLD = Number(process.env.SIMILARITY_THRESHOLD ?? 0.85);
const OUT = "bench/out";

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(42);
const shuffle = <T>(a: T[]) =>
  a
    .map((x) => [rand(), x] as const)
    .sort((p, q) => p[0] - q[0])
    .map(([, x]) => x);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function retry<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= 5) throw e;
      await sleep(2 ** i * 1000);
    }
  }
}

const faq: Record<string, string> = JSON.parse(readFileSync("data/answers.json", "utf8"));
const { rows: train } = await db.query(
  "select text, intent from queries where split = 'train' order by id",
);
const { rows: test } = await db.query(
  "select text, intent from queries where split = 'test' order by id",
);

const intents = shuffle(Object.keys(faq));
const seeded = new Set(intents.slice(0, SEEDED_INTENTS));
const seedRows = [...seeded].flatMap((i) =>
  train.filter((r) => r.intent === i).slice(0, PER_INTENT),
);

const unique = shuffle(test).slice(0, Math.round(N * (1 - REPEAT_RATE)));
const workload = [...unique];
while (workload.length < N) {
  const copy = unique[Math.floor(rand() * unique.length)];
  const first = workload.indexOf(copy);
  workload.splice(first + 1 + Math.floor(rand() * (workload.length - first)), 0, copy);
}

const intentOfQuery = new Map(
  workload.map((r) => [r.text as string, r.intent as string]),
);
const intentOfAnswer = new Map(
  Object.entries(faq).map(([intent, answer]) => [answer, intent]),
);
const llm = async (q: string) => {
  const answer = await retry(() => generateAnswer(q));
  intentOfAnswer.set(answer, intentOfQuery.get(q)!);
  return answer;
};
const embedRetry = (t: string[]) => retry(() => embed(t));

async function embedAll(texts: string[]) {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 100)
    out.push(...(await embedRetry(texts.slice(i, i + 100))));
  return out;
}

const semantic = createSemanticCache();
async function seedSemantic() {
  await semantic.clear();
  const vectors = await embedAll(seedRows.map((r) => r.text));
  for (const [i, r] of seedRows.entries())
    await semantic.add(r.text, faq[r.intent], vectors[i]);
}

console.log(`Seeding ${seedRows.length} entries for ${seeded.size} intents…`);
await seedSemantic();

console.log("Probing similarity scores…");
const uniqueVectors = await embedAll(unique.map((r) => r.text));
const probes: Probe[] = [];
for (const [i, r] of unique.entries()) {
  const hit = await semantic.search(uniqueVectors[i]);
  probes.push({
    intent: r.intent,
    hitIntent: hit ? (intentOfAnswer.get(hit.answer) ?? null) : null,
    score: hit?.score ?? 0,
  });
}
const thresholds = Array.from({ length: 8 }, (_, i) => +(0.6 + i * 0.05).toFixed(2));

const summaries: Record<string, ReturnType<typeof summarize>> = {};
for (const strategy of ["none", "exact", "semantic"] as Strategy[]) {
  await seedSemantic();
  const app = createAnswerer({ llm, embed: embedRetry, semantic, threshold: THRESHOLD });
  for (const r of seedRows) app.exact.set(r.text, faq[r.intent]);

  const records: Rec[] = [];
  for (const [i, q] of workload.entries()) {
    const res = await app.ask(q.text, strategy);
    records.push({
      intent: q.intent,
      source: res.source,
      latencyMs: res.latencyMs,
      correct: res.source === "llm" || intentOfAnswer.get(res.answer) === q.intent,
    });
    if ((i + 1) % 25 === 0) console.log(`${strategy}: ${i + 1}/${N}`);
  }
  summaries[strategy] = summarize(records, seeded);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(
  `${OUT}/results.json`,
  JSON.stringify(
    {
      config: {
        requests: N,
        seededIntents: SEEDED_INTENTS,
        totalIntents: intents.length,
        seedsPerIntent: PER_INTENT,
        repeatRate: REPEAT_RATE,
        threshold: THRESHOLD,
        backend: process.env.CACHE_BACKEND ?? "pgvector",
      },
      summaries,
      sweep: sweep(probes, seeded, thresholds),
    },
    null,
    2,
  ) + "\n",
);
console.table(summaries);
await semantic.clear();
await db.end();
