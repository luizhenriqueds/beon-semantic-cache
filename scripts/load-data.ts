import { readFileSync } from "node:fs";
import { fetchSplit, type Row } from "../lib/banking77";
import { db } from "../lib/db";

const answers: Record<string, string> = JSON.parse(
  readFileSync("data/answers.json", "utf8"),
);

async function insertQueries(rows: Row[], split: string) {
  for (let i = 0; i < rows.length; i += 1000) {
    const chunk = rows.slice(i, i + 1000);
    await db.query(
      `insert into queries (text, intent, split)
       select t, i, $3 from unnest($1::text[], $2::text[]) as x(t, i)`,
      [chunk.map((r) => r.text), chunk.map((r) => r.intent), split],
    );
  }
}

await db.query("truncate queries restart identity");
await insertQueries(await fetchSplit("train"), "train");
await insertQueries(await fetchSplit("test"), "test");

await db.query(
  `insert into faq (intent, answer)
   select * from unnest($1::text[], $2::text[])
   on conflict (intent) do update set answer = excluded.answer`,
  [Object.keys(answers), Object.values(answers)],
);

const { rows } = await db.query(
  "select split, count(*)::int as n, count(distinct intent)::int as intents from queries group by split order by split",
);
console.table(rows);
await db.end();
