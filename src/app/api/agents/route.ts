import { Effect, Stream } from "effect";
import { sseResponseFromStream } from "@/lib/effect/runtime";

type AgentResult = { agent: string; content: string };

function makeAgent(name: string, ms: number, content: string) {
  return Effect.sleep(ms).pipe(Effect.as({ agent: name, content }));
}

export async function GET() {
  const agents: Array<Effect.Effect<never, Error, AgentResult>> = [
    makeAgent("reddit", 900, "Reddit insights ready"),
    makeAgent("competitors", 1200, "Top 5 competitors found"),
    makeAgent("names", 700, "12 brand names generated"),
    makeAgent("youtube", 1500, "5 relevant videos"),
    makeAgent("twitter", 600, "Trending threads summarized"),
    makeAgent("copy", 1100, "Marketing copy draft v1"),
  ];

  const stream = Stream.fromEffect(Effect.all(agents, { concurrency: "unbounded" })).pipe(
    Stream.flattenIterables,
    Stream.map((r) => JSON.stringify(r))
  );

  return sseResponseFromStream(stream, (s) => s as string);
}






