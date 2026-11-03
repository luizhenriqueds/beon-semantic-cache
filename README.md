# Semantic Cache Demo

Show how a semantic cache avoids repeated LLM calls. Banking support Q&A over the
[Banking77](https://huggingface.co/datasets/PolyAI/banking77) dataset.

| Strategy | Behaviour |
| --- | --- |
| `none` | Every question calls the LLM |
| `exact` | Cache hit only on identical text |
| `semantic` | Cache hit when a similar question was already answered |

**Stack:** Next.js, Tailwind, Postgres (Supabase), Upstash Vector, Gemini.

## Status

Built in phases, one branch each: scaffold → data → core → ui → benchmark → deploy.
