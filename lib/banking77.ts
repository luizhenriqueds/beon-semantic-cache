import { parse } from "csv-parse/sync";

const BASE =
  "https://raw.githubusercontent.com/PolyAI-LDN/task-specific-datasets/master/banking_data";

export type Row = { text: string; intent: string };

export async function fetchSplit(split: "train" | "test"): Promise<Row[]> {
  const res = await fetch(`${BASE}/${split}.csv`);
  if (!res.ok) throw new Error(`Failed to download ${split}.csv: ${res.status}`);
  const rows = parse(await res.text(), { columns: true }) as {
    text: string;
    category: string;
  }[];
  return rows.map((r) => ({ text: r.text.trim(), intent: r.category }));
}
