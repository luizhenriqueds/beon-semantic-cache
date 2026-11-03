export class ExactCache {
  private store = new Map<string, string>();

  private key(query: string) {
    return query.trim().toLowerCase();
  }

  get(query: string) {
    return this.store.get(this.key(query)) ?? null;
  }

  set(query: string, answer: string) {
    this.store.set(this.key(query), answer);
  }

  clear() {
    this.store.clear();
  }
}
