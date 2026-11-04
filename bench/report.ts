import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import {
  LABELS,
  latencyChart,
  llmCallsChart,
  qualityChart,
  thresholdChart,
} from "./charts";

const dir = process.argv[2] ?? "bench/out";
const { config, summaries, sweep } = JSON.parse(
  readFileSync(`${dir}/results.json`, "utf8"),
);

const charts = {
  "llm-calls": llmCallsChart(summaries, config.requests),
  latency: latencyChart(summaries),
  quality: qualityChart(summaries),
  threshold: thresholdChart(sweep, config.threshold),
};

for (const [name, svg] of Object.entries(charts)) {
  writeFileSync(`${dir}/${name}.svg`, svg);
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1920 } }).render().asPng();
  writeFileSync(`${dir}/${name}.png`, png);
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const ms = (v: number) => `${Math.round(v)} ms`;
const none = summaries.none;
const sem = summaries.semantic;
const saved = 1 - sem.llmCalls / none.llmCalls;
const speedup = none.p50 / sem.p50;

const rows = (Object.keys(LABELS) as (keyof typeof LABELS)[])
  .map((k) => {
    const s = summaries[k];
    const cache = k !== "none";
    return `<tr><th scope="row">${LABELS[k]}</th><td>${s.llmCalls}</td><td>${pct(1 - s.llmCalls / none.llmCalls)}</td>
<td>${cache ? pct(s.hitRate) : "–"}</td><td>${cache ? pct(s.precision) : "–"}</td><td>${cache ? pct(s.recall) : "–"}</td>
<td>${ms(s.p50)}</td><td>${ms(s.p95)}</td></tr>`;
  })
  .join("\n");

const csv = [
  "strategy,requests,llm_calls,calls_saved,hit_rate,precision,recall,p50_ms,p95_ms,mean_ms",
  ...(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((k) => {
    const s = summaries[k];
    return [
      k,
      s.requests,
      s.llmCalls,
      1 - s.llmCalls / none.llmCalls,
      s.hitRate,
      s.precision,
      s.recall,
      s.p50,
      s.p95,
      s.mean,
    ]
      .map((v) => (typeof v === "number" ? +v.toFixed(4) : v))
      .join(",");
  }),
].join("\n");
writeFileSync(`${dir}/results.csv`, csv + "\n");

const exportLinks = [
  ...Object.keys(charts).flatMap((n) => [`${n}.png`, `${n}.svg`]),
  "results.csv",
  "results.json",
]
  .map((f) => `<a href="${f}" download>${f}</a>`)
  .join(" · ");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Semantic Cache Benchmark</title>
<style>
body{margin:0;background:#fcfcfb;color:#0b0b0b;font:16px/1.5 Helvetica,Arial,sans-serif}
main{max-width:1000px;margin:0 auto;padding:40px 16px}
h1{font-size:28px;margin:0}h2{font-size:18px;margin:32px 0 4px}a{color:#2a78d6}p.sub{color:#52514e;margin:4px 0 24px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:24px}
.kpi{border:1px solid #e6e5e1;border-radius:12px;padding:16px}.kpi b{display:block;font-size:32px}.kpi span{color:#52514e;font-size:14px}
.charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:16px}
.charts svg{width:100%;height:auto;border:1px solid #e6e5e1;border-radius:12px}
.scroll{overflow-x:auto;margin-top:24px}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{padding:8px 12px;text-align:right;border-bottom:1px solid #e6e5e1}
th:first-child,thead th{text-align:left}thead th{color:#52514e;font-weight:600}
</style></head><body><main>
<h1>Semantic Cache Benchmark</h1>
<p class="sub">Banking77 support Q&amp;A · ${config.requests} requests (${pct(config.repeatRate)} verbatim repeats) · ${config.seededIntents}/${config.totalIntents} intents pre-cached · threshold ${config.threshold} · ${config.backend}</p>
<div class="kpis">
<div class="kpi"><b>${pct(saved)}</b><span>fewer LLM calls with semantic cache</span></div>
<div class="kpi"><b>${speedup.toFixed(1)}×</b><span>faster median response</span></div>
<div class="kpi"><b>${pct(sem.precision)}</b><span>of semantic hits were correct</span></div>
</div>
<div class="charts">${Object.values(charts).join("\n")}</div>
<div class="scroll"><table>
<thead><tr><th>Strategy</th><th>LLM calls</th><th>Calls saved</th><th>Hit rate</th><th>Precision</th><th>Recall</th><th>p50</th><th>p95</th></tr></thead>
<tbody>${rows}</tbody></table></div>
<h2>Export</h2>
<p class="sub">Files next to this page: ${exportLinks}</p>
</main></body></html>
`;
writeFileSync(`${dir}/summary.html`, html);
console.log(`Wrote charts and summary.html to ${dir}`);
