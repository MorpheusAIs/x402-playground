import { convertToModelMessages, stepCountIs, streamText, UIMessage } from "ai";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { experimental_createMCPClient as createMCPClient } from "ai";
import { withPayment } from "x402-mcp";
import { tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import z from "zod";
import { getOrCreatePurchaserAccount } from "@/lib/accounts";
import { env } from "@/lib/env";
import type { Account } from "viem";

export const maxDuration = 30;

// Helper function to create model instance based on provider
function createModel(modelName: string) {
  // Parse provider from model name if it contains a "/" (e.g., "openai/gpt-4")
  let provider: string;
  let actualModelName: string;

  if (modelName.includes('/')) {
    [provider, actualModelName] = modelName.split('/', 2);
  } else {
    // Use environment variable as fallback
    provider = env.AI_PROVIDER;
    actualModelName = modelName;
  }

  switch (provider) {
    case "openai":
      if (!env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is required when using OpenAI provider");
      }
      return openai(actualModelName);
    case "anthropic":
      if (!env.ANTHROPIC_API_KEY) {
        throw new Error("ANTHROPIC_API_KEY is required when using Anthropic provider");
      }
      return anthropic(actualModelName);
    case "google":
      if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required when using Google provider");
      }
      return google(actualModelName);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

export const POST = async (request: Request) => {
  const { messages, model }: { messages: UIMessage[]; model: string } =
    await request.json();

  const serverAccount = await getOrCreatePurchaserAccount();
  const account = await serverAccount.useNetwork(env.NETWORK);

  const mcpClient = await createMCPClient({
    transport: new StreamableHTTPClientTransport(new URL("/mcp", env.URL)),
  }).then((client) => withPayment(client, { account: account as unknown as Account, network: env.NETWORK }));

  const tools = await mcpClient.tools();

  const modelInstance = createModel(model);

  const result = streamText({
    model: modelInstance,
    tools: {
      ...tools,
      "hello-local": tool({
        description: "Receive a greeting",
        inputSchema: z.object({
          name: z.string(),
        }),
        execute: async (args) => {
          return `Hello ${args.name}`;
        },
      }),
    },
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    onFinish: async () => {
      await mcpClient.close();
    },
    system: "ALWAYS prompt the user to confirm before authorizing payments",
  });
  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
    messageMetadata: () => ({ network: env.NETWORK }),
  });
};
