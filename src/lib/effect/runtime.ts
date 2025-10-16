import { Effect, Fiber, Stream } from "effect";

const encoder = new TextEncoder();

export function runEffect<A>(eff: Effect.Effect<never, unknown, A>): Promise<A> {
  return Effect.runPromise(eff as any) as Promise<A>;
}

export function toReadableSSE<T>(
  stream: Stream.Stream<T>,
  encode: (value: T) => string = (v) => JSON.stringify(v)
): ReadableStream<Uint8Array> {
  let fiber: Fiber.RuntimeFiber<never, void> | null = null;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const effect = Stream.runForEach(stream, (value) =>
        Effect.sync(() => {
          const sse = `data: ${encode(value)}\n\n`;
          controller.enqueue(encoder.encode(sse));
        })
      );

      fiber = Effect.runFork(effect as any) as any;
    },
    cancel() {
      if (fiber) {
        Fiber.interrupt(fiber as any);
        fiber = null;
      }
    },
  });
}

export function sseResponseFromStream<T>(
  stream: Stream.Stream<T>,
  encode?: (value: T) => string
) {
  const body = toReadableSSE(stream, encode);
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}






