# Semantic Cache Demo

Show how a semantic cache avoids repeated LLM calls. Banking support Q&A over the
[Banking77](https://huggingface.co/datasets/PolyAI/banking77) dataset.

| Strategy   | Behaviour                                              |
| ---------- | ------------------------------------------------------ |
| `none`     | Every question calls the LLM                           |
| `exact`    | Cache hit only on identical text                       |
| `semantic` | Cache hit when a similar question was already answered |

**Stack:** Next.js, Tailwind, Postgres (Supabase), Upstash Vector, Gemini.

## Status

Built in phases, one branch each: scaffold → data → core → ui → benchmark → deploy.

Local: docker + pgvector. Remote: Supabase + Upstash Vector + Vercel, all free tiers. See [docs/deploy.md](docs/deploy.md).

## Run locally

```bash
cp .env.example .env          # add GEMINI_API_KEY
npm install
npm run db:up                 # postgres + pgvector in docker
npm run data:answers          # one-off: generate FAQ answers (data/answers.json)
npm run data:load             # load Banking77 queries + answers into postgres
```

## Data

- `queries`: Banking77 train (10k, cache seeds) and test (3k, benchmark) with intent labels.
- `faq`: one LLM-written answer per intent (77), committed in `data/answers.json`.

## Cache

```bash
npm run cache:seed            # embed N train queries per intent into the semantic cache (default 5)
npm run dev                   # http://localhost:3000
npm test
```

`POST /api/ask {query}` uses `CACHE_STRATEGY`. `GET /api/stats` returns hit rate and LLM calls; `DELETE /api/stats` resets caches.

Semantic backend: `CACHE_BACKEND=pgvector` (local) or `upstash` (remote index: 768 dims, cosine). Hit threshold: `SIMILARITY_THRESHOLD` (default 0.9).

## Demo flow

A simple support chat at http://localhost:3000. The caching strategy is set by the developer in `.env`, not in the UI:

| `CACHE_STRATEGY`     | Behaviour                    |
| -------------------- | ---------------------------- |
| `none`               | every question calls the LLM |
| `exact`              | hit only on identical text   |
| `semantic` (default) | hit on similar questions     |

Restart `npm run dev` after changing it. Each answer shows `generated` or `cached` and its latency. Ask "How do I reset my PIN?", then "I forgot my PIN, how can I change it?".

## Benchmark

```bash
npm run bench           # needs GEMINI_API_KEY, seeded data (data:load); ~3 × 100 requests
npm run bench:report    # charts (SVG + PNG) and summary.html in bench/out/
```

Compares `none`, `exact` (regular cache) and `semantic` on the same workload: unseen Banking77 test questions plus 20% verbatim repeats, with 60 of 77 intents pre-cached. Tune with `BENCH_QUERIES`, `BENCH_SEEDED_INTENTS`, `BENCH_REPEAT_RATE`.

- **Precision**: share of cache hits that returned the answer for the right intent.
- **Recall**: share of answerable requests (intent already cached) served correctly from cache.
- **Threshold sweep**: precision/recall at 0.60–0.95, computed from similarity scores without extra LLM calls.
