export type Hit = { answer: string; score: number };

export interface SemanticCache {
  search(embedding: number[]): Promise<Hit | null>;
  add(query: string, answer: string, embedding: number[]): Promise<void>;
  clear(): Promise<void>;
}
