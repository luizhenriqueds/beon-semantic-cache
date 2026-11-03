import { Index } from "@upstash/vector";
import { randomUUID } from "node:crypto";
import type { SemanticCache } from "./types";

export class UpstashCache implements SemanticCache {
  private index = new Index<{ query: string; answer: string }>();

  async search(embedding: number[]) {
    const [top] = await this.index.query({
      vector: embedding,
      topK: 1,
      includeMetadata: true,
    });
    return top ? { answer: top.metadata!.answer, score: top.score } : null;
  }

  async add(query: string, answer: string, embedding: number[]) {
    await this.index.upsert({
      id: randomUUID(),
      vector: embedding,
      metadata: { query, answer },
    });
  }

  async clear() {
    await this.index.reset();
  }
}
