import { db } from "../lib/db";
import { embed } from "../lib/llm";
import { createSemanticCache } from "../lib/cache";

const PER_INTENT = Number(process.argv[2] ?? 5);

const { rows } = await db.query(
  `select q.text, f.answer from (
     select text, intent, row_number() over (partition by intent order by id) as n
     from queries where split = 'train'
   ) q join faq f using (intent) where q.n <= $1`,
  [PER_INTENT],
);

const cache = createSemanticCache();
await cache.clear();

for (let i = 0; i < rows.length; i += 100) {
  const chunk = rows.slice(i, i + 100);
  const vectors = await embed(chunk.map((r) => r.text));
  for (const [j, r] of chunk.entries()) await cache.add(r.text, r.answer, vectors[j]);
  console.log(`${Math.min(i + 100, rows.length)}/${rows.length}`);
}
await db.end();
