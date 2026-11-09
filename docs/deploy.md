# Deploy (Supabase + Upstash + Vercel)

All free tiers. About 10 minutes.

## 1. Supabase (dataset)

1. Create a project.
2. SQL editor: paste and run `supabase/schema.sql`.
3. Project → Connect → copy the **Transaction pooler** connection string (port 6543). Use it as `DATABASE_URL`.

## 2. Upstash Vector (semantic cache)

1. Create an index: **dimensions 768**, **cosine** similarity, no built-in embedding model.
2. Copy the REST URL and token.

## 3. Load data and seed the cache (from your machine)

Point `.env` at the remote services:

```bash
GEMINI_API_KEY=...
CACHE_BACKEND=upstash
DATABASE_URL=<supabase pooler url>
UPSTASH_VECTOR_REST_URL=...
UPSTASH_VECTOR_REST_TOKEN=...
```

```bash
npm run data:answers   # skip if data/answers.json already exists
npm run data:load      # Banking77 + FAQ into Supabase
npm run cache:seed     # seed Upstash Vector
npm run bench          # optional: same benchmark against the remote stack
```

## 4. Vercel

1. Import the repo in Vercel (framework: Next.js, no build settings needed).
2. Add environment variables:

| Variable                                                | Value                         |
| ------------------------------------------------------- | ----------------------------- |
| `GEMINI_API_KEY`                                        | your key                      |
| `CACHE_STRATEGY`                                        | `none`, `exact` or `semantic` |
| `CACHE_BACKEND`                                         | `upstash`                     |
| `UPSTASH_VECTOR_REST_URL` / `UPSTASH_VECTOR_REST_TOKEN` | from step 2                   |
| `SIMILARITY_THRESHOLD`                                  | optional, default `0.9`      |

3. Deploy. Change `CACHE_STRATEGY` and redeploy to compare strategies.

## Notes

- The deployed app only needs Gemini and the cache backend. Supabase holds the dataset used by the seed and benchmark scripts.
- To use Supabase as the cache instead of Upstash, set `CACHE_BACKEND=pgvector` and add `DATABASE_URL` on Vercel.
- The exact cache is in-memory, so on serverless it resets between cold starts. Use the benchmark (single process) for fair comparisons.
- Reset the semantic cache any time with `npm run cache:seed`.
