import { env } from "@/lib/env";
import * as cheerio from "cheerio";
import { NextRequest } from "next/server";
import { wrapFetchWithPayment } from "x402-fetch";
import { chain, getOrCreatePurchaserAccount } from "@/lib/accounts";
import { createWalletClient, http, type Account } from "viem";
import { Effect, Stream } from "effect";
import { sseResponseFromStream } from "@/lib/effect/runtime";

type Fetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

const serverAccount = await getOrCreatePurchaserAccount();
const account = await serverAccount.useNetwork(env.NETWORK);
const walletClient = createWalletClient({
  chain,
  transport: http(),
  account: account as unknown as Account,
});

export async function GET(request: NextRequest) {
  const enablePayment =
    request.nextUrl.searchParams.get("enable-payment") === "true";
  const isBot = request.headers.get("user-agent")?.includes("bot") ?? false;
  const actAsScraper =
    request.nextUrl.searchParams.get("act-as-scraper") === "true";
  const job = request.nextUrl.searchParams.get("job");

  const loggedFetch = makeLoggedFetch((...args) => console.log(...args));
  const paidOrPlainFetch = enablePayment
    ? wrapFetchWithPayment(loggedFetch, walletClient as any)
    : loggedFetch;

  const startEvent = () =>
    JSON.stringify({
      timestamp: new Date().toISOString(),
      message: "initiating job",
      job,
    });

  const jobEffect = Effect.tryPromise(async () => {
    if (job === "scrape") {
      const result = await scrapeJob(paidOrPlainFetch, isBot || actAsScraper);
      return {
        timestamp: new Date().toISOString(),
        type: "result",
        result,
      };
    } else if (job === "math") {
      const result = await mathJob(paidOrPlainFetch);
      return {
        timestamp: new Date().toISOString(),
        type: "result",
        result,
      };
    } else {
      return {
        timestamp: new Date().toISOString(),
        type: "error",
        error: "Invalid job",
      };
    }
  }).pipe(
    Effect.catchAll((err) =>
      Effect.succeed({
        timestamp: new Date().toISOString(),
        type: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      })
    )
  );

  const stream = Stream.concat(
    Stream.succeed(startEvent()),
    Stream.unwrapEffect(
      Effect.map(jobEffect, (evt) => Stream.succeed(JSON.stringify(evt)))
    )
  );

  return sseResponseFromStream(stream, (s) => s as string);
}

function makeLoggedFetch(
  log: (...args: unknown[]) => void
): typeof globalThis.fetch {
  return async (...args) => {
    const info = args[0];
    const path =
      info instanceof Request
        ? new URL(info.url).pathname
        : new URL(info).pathname;
    log("Request: ", args[1]?.method ?? "GET", path);
    log("Request Headers: ", args[1]?.headers ?? {});
    const rawResponse = await fetch(...args);
    const clonedResponse = rawResponse.clone();
    log(
      "Response: ",
      args[1]?.method ?? "GET",
      path,
      clonedResponse.status,
      clonedResponse.statusText
    );
    log("Response Headers: ", clonedResponse.headers);
    const body = await clonedResponse.text();
    try {
      const json = JSON.parse(body);
      log("Response Body: ", json);
    } catch (error) {
      log("Response Body: ", body);
    }
    return rawResponse;
  };
}

async function scrapeJob(fetch: Fetch, isBot: boolean) {
  const response = await fetch(`${env.URL}/blog`, {
    headers: {
      ...(isBot ? { "user-agent": "Bot" } : {}),
    },
  });

  if (!response.ok) {
    throw new Error("An error occurred: " + response.statusText);
  }

  const blogData = await response.text();

  const $ = cheerio.load(blogData);
  const blogTitles = $("h2")
    .map((_, el) => $(el).text().trim())
    .get();

  return { blogTitles };
}

async function mathJob(fetch: Fetch) {
  const response = await fetch(`${env.URL}/api/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      a: 1,
      b: 2,
    }),
  });

  if (!response.ok) {
    throw new Error("An error occurred: " + response.statusText);
  }

  const result = await response.json();

  return result;
}
