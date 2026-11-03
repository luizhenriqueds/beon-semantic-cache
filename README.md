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

`POST /api/ask {query, strategy}` with `strategy` = `none | exact | semantic`. `GET /api/stats` returns hit rate and LLM calls; `DELETE /api/stats` resets caches.

Semantic backend: `CACHE_BACKEND=pgvector` (local) or `upstash` (remote index: 768 dims, cosine). Hit threshold: `SIMILARITY_THRESHOLD` (default 0.85).
