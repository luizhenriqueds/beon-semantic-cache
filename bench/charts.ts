import type { Summary, SweepPoint } from "./metrics";

export const COLORS = {
  none: "#2a78d6",
  exact: "#eb6834",
  semantic: "#1baf7a",
  precision: "#6250d6",
  recall: "#008300",
};
const INK = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  grid: "#e6e5e1",
  surface: "#fcfcfb",
};
const FONT = "Helvetica, Arial, sans-serif";
const W = 960;
const H = 540;
const M = { l: 72, r: 40, t: 110, b: 64 };

export const LABELS = {
  none: "No cache",
  exact: "Regular cache",
  semantic: "Semantic cache",
};
type Key = keyof typeof LABELS;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const text = (
  x: number,
  y: number,
  s: string,
  size = 14,
  fill = INK.secondary,
  extra = "",
) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" fill="${fill}" ${extra}>${esc(s)}</text>`;

function frame(title: string, subtitle: string, body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="${INK.surface}"/>
${text(M.l, 44, title, 26, INK.primary, 'font-weight="700"')}
${text(M.l, 70, subtitle, 15)}
${body}
</svg>`;
}

function legend(items: { name: string; color: string }[]) {
  let x = M.l;
  return items
    .map((it) => {
      const out = `<rect x="${x}" y="84" width="12" height="12" rx="3" fill="${it.color}"/>${text(x + 18, 95, it.name, 14)}`;
      x += 18 + it.name.length * 7.5 + 24;
      return out;
    })
    .join("");
}

function axes(max: number, fmt: (v: number) => string) {
  const h = H - M.t - M.b;
  return [0, 1, 2, 3, 4]
    .map((i) => {
      const y = M.t + h - (i / 4) * h;
      return `<line x1="${M.l}" x2="${W - M.r}" y1="${y}" y2="${y}" stroke="${INK.grid}" stroke-width="1"/>${text(M.l - 10, y + 5, fmt((max * i) / 4), 13, INK.secondary, 'text-anchor="end"')}`;
    })
    .join("");
}

function bar(x: number, y: number, w: number, h: number, fill: string) {
  const r = Math.min(4, h);
  return `<path d="M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z" fill="${fill}"/>`;
}

function grouped(opts: {
  title: string;
  subtitle: string;
  categories: string[];
  series: { name: string; color: string; values: number[] }[];
  max: number;
  fmt: (v: number) => string;
}) {
  const { categories, series, max, fmt } = opts;
  const h = H - M.t - M.b;
  const slot = (W - M.l - M.r) / categories.length;
  const bw = Math.min(40, (slot * 0.7) / series.length - 2);
  const groupW = series.length * (bw + 2) - 2;
  let body = axes(max, fmt) + legend(series);
  categories.forEach((cat, ci) => {
    const x0 = M.l + slot * ci + (slot - groupW) / 2;
    series.forEach((s, si) => {
      const bh = Math.max(1, (s.values[ci] / max) * h);
      const x = x0 + si * (bw + 2);
      body += bar(x, M.t + h - bh, bw, bh, s.color);
      body += text(
        x + bw / 2,
        M.t + h - bh - 8,
        fmt(s.values[ci]),
        13,
        INK.primary,
        'text-anchor="middle" font-weight="600"',
      );
    });
    body += text(
      M.l + slot * ci + slot / 2,
      H - 28,
      cat,
      15,
      INK.primary,
      'text-anchor="middle"',
    );
  });
  body += `<line x1="${M.l}" x2="${W - M.r}" y1="${M.t + h}" y2="${M.t + h}" stroke="${INK.secondary}" stroke-width="1"/>`;
  return frame(opts.title, opts.subtitle, body);
}

const niceMax = (v: number) => {
  const p = 10 ** Math.floor(Math.log10(v || 1));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]
    .map((m) => m * p)
    .find((s) => s * 4 >= v * 1.08)!;
  return step * 4;
};
const ms = (v: number) => String(Math.round(v));
const pct = (v: number) => `${Math.round(v * 100)}%`;
const strategies = Object.keys(LABELS) as Key[];

export function llmCallsChart(s: Record<Key, Summary>, requests: number) {
  const max = niceMax(Math.max(...strategies.map((k) => s[k].llmCalls)));
  return grouped({
    title: "LLM calls",
    subtitle: `${requests} identical requests per strategy. Lower is better.`,
    categories: ["LLM calls"],
    series: strategies.map((k) => ({
      name: LABELS[k],
      color: COLORS[k],
      values: [s[k].llmCalls],
    })),
    max,
    fmt: (v) => String(Math.round(v)),
  });
}

export function latencyChart(s: Record<Key, Summary>) {
  const max = niceMax(Math.max(...strategies.map((k) => s[k].p95)));
  return grouped({
    title: "Response latency",
    subtitle: "End-to-end time per request, in milliseconds. Lower is better.",
    categories: ["Median (p50)", "Tail (p95)"],
    series: strategies.map((k) => ({
      name: LABELS[k],
      color: COLORS[k],
      values: [s[k].p50, s[k].p95],
    })),
    max,
    fmt: ms,
  });
}

export function qualityChart(s: Record<Key, Summary>) {
  return grouped({
    title: "Cache quality",
    subtitle: "Hit rate, precision of hits, and recall of answerable requests.",
    categories: ["Hit rate", "Precision", "Recall"],
    series: (["exact", "semantic"] as Key[]).map((k) => ({
      name: LABELS[k],
      color: COLORS[k],
      values: [s[k].hitRate, s[k].precision, s[k].recall],
    })),
    max: 1,
    fmt: pct,
  });
}

export function thresholdChart(points: SweepPoint[], threshold: number) {
  const h = H - M.t - M.b;
  const w = W - M.l - M.r;
  const xs = (i: number) => M.l + 40 + (i / (points.length - 1)) * (w - 80);
  const ys = (v: number) => M.t + h - v * h;
  const series = [
    { name: "Precision", color: COLORS.precision, get: (p: SweepPoint) => p.precision },
    { name: "Recall", color: COLORS.recall, get: (p: SweepPoint) => p.recall },
  ];
  let body = axes(1, pct) + legend(series);
  points.forEach((p, i) => {
    body += text(
      xs(i),
      H - 28,
      p.threshold.toFixed(2),
      14,
      INK.primary,
      'text-anchor="middle"',
    );
  });
  const at = points.findIndex((p) => p.threshold === threshold);
  if (at >= 0) {
    body += `<line x1="${xs(at)}" x2="${xs(at)}" y1="${M.t}" y2="${M.t + h}" stroke="${INK.secondary}" stroke-width="1"/>`;
    body += text(xs(at) + 6, M.t + h - 8, `default ${threshold}`, 13, INK.secondary);
  }
  for (const s of series) {
    const pts = points.flatMap((p, i) => {
      const v = s.get(p);
      return v === null ? [] : [{ x: xs(i), y: ys(v), v }];
    });
    body += `<polyline points="${pts.map((p) => `${p.x},${p.y}`).join(" ")}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    for (const p of pts) {
      body += `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${s.color}" stroke="${INK.surface}" stroke-width="2"/>`;
    }
    const last = pts[pts.length - 1];
    if (last)
      body += text(
        last.x,
        last.y - 12,
        pct(last.v),
        13,
        INK.primary,
        'text-anchor="middle" font-weight="600"',
      );
  }
  body += text(
    W / 2,
    H - 6,
    "Similarity threshold",
    13,
    INK.secondary,
    'text-anchor="middle"',
  );
  return frame(
    "Threshold trade-off",
    "Higher threshold: fewer wrong hits, but more missed hits.",
    body,
  );
}
