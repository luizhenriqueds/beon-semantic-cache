import { db } from "../db";
import type { SemanticCache } from "./types";

const vec = (v: number[]) => `[${v.join(",")}]`;

export class PgVectorCache implements SemanticCache {
  async search(embedding: number[]) {
    const { rows } = await db.query(
      `select answer, 1 - (embedding <=> $1::vector) as score
       from cache_entries order by embedding <=> $1::vector limit 1`,
      [vec(embedding)],
    );
    return rows[0]
      ? { answer: rows[0].answer as string, score: Number(rows[0].score) }
      : null;
  }

  async add(query: string, answer: string, embedding: number[]) {
    await db.query(
      "insert into cache_entries (query, answer, embedding) values ($1, $2, $3)",
      [query, answer, vec(embedding)],
    );
  }

  async clear() {
    await db.query("truncate cache_entries restart identity");
  }
}
