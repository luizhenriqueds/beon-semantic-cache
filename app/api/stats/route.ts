import { engine } from "@/lib/engine";

export async function GET() {
  const { requests, hits, llmCalls } = engine.stats;
  return Response.json({
    requests,
    hits,
    llmCalls,
    hitRate: requests ? hits / requests : 0,
  });
}

export async function DELETE() {
  await engine.reset();
  return Response.json({ ok: true });
}
