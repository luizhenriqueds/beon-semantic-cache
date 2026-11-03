import { engine } from "@/lib/engine";
import type { Strategy } from "@/lib/answer";

const strategies = ["none", "exact", "semantic"];

export async function POST(req: Request) {
  const { query, strategy } = await req.json();
  if (typeof query !== "string" || !query.trim() || !strategies.includes(strategy)) {
    return Response.json({ error: "query and valid strategy required" }, { status: 400 });
  }
  return Response.json(await engine.ask(query, strategy as Strategy));
}
