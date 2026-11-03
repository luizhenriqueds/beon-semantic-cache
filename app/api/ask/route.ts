import { engine } from "@/lib/engine";
import type { Strategy } from "@/lib/answer";

const strategies = ["none", "exact", "semantic"];
const strategy = (process.env.CACHE_STRATEGY ?? "semantic") as Strategy;

if (!strategies.includes(strategy)) {
  throw new Error(`CACHE_STRATEGY must be one of: ${strategies.join(", ")}`);
}

export async function POST(req: Request) {
  const { query } = await req.json();
  if (typeof query !== "string" || !query.trim()) {
    return Response.json({ error: "query required" }, { status: 400 });
  }
  return Response.json(await engine.ask(query, strategy));
}
