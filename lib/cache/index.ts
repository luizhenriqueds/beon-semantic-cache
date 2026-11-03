import { PgVectorCache } from "./pgvector";
import { UpstashCache } from "./upstash";
import type { SemanticCache } from "./types";

export function createSemanticCache(): SemanticCache {
  return process.env.CACHE_BACKEND === "upstash"
    ? new UpstashCache()
    : new PgVectorCache();
}
