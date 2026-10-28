import {
  query,
  type SDKMessage,
  type SDKAssistantMessage,
} from "@anthropic-ai/claude-agent-sdk";

type CreateSessionArgs = {
  model?: string | null | undefined;
};

type CreateSessionResult = {
  sessionId: string;
};

export async function createSession(
  args: CreateSessionArgs,
): Promise<CreateSessionResult> {
  const session = query({
    prompt: "hi",
    options: { model: args.model || "claude-sonnet-4-5-20250929" },
  });

  let sessionId: string | undefined;
  for await (const msg of session) {
    if (msg.type === "system" && msg.subtype === "init") {
      sessionId = msg.session_id;
      break;
    }
  }

  await session.return();

  if (!sessionId) {
    throw new Error("Failed to get session ID");
  }

  return { sessionId };
}

type SendMessageArgs = {
  sessionId: string;
  prompt: string;
};

type SendMessageResult =
  | Exclude<SDKMessage, SDKAssistantMessage>
  | (Omit<SDKAssistantMessage, "message"> & { message: string });

export async function* sendMessage(
  args: SendMessageArgs,
): AsyncGenerator<SendMessageResult> {
  const session = query({
    prompt: args.prompt,
    options: { model: "claude-sonnet-4-5-20250929", resume: args.sessionId },
  });

  for await (const msg of session) {
    if (msg.type === "assistant") {
      yield {
        ...msg,
        message: msg.message.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join(""),
      };
      continue;
    }
    yield msg;
  }

  await session.return();
}

type RunPromptArgs = {
  prompt: string;
  model?: string | null | undefined;
};

type RunPromptResult = {
  result: string;
  sessionId: string;
  totalCostUsd: number;
  durationMs: number;
};

export async function runPrompt(args: RunPromptArgs): Promise<RunPromptResult> {
  let result: Extract<SDKMessage, { type: "result" }> | undefined;
  for await (const msg of query({
    prompt: args.prompt,
    options: { model: args.model || "claude-sonnet-4-5-20250929" },
  })) {
    if (msg.type === "result") result = msg;
  }

  if (!result || result.subtype !== "success") {
    throw new Error(`Error from agent: ${result?.subtype ?? "no result"}`);
  }

  return {
    result: result.result,
    sessionId: result.session_id,
    totalCostUsd: result.total_cost_usd,
    durationMs: result.duration_ms,
  };
}

export const SUPPORTED_MODELS = [
  {
    value: "claude-sonnet-4-5-20250929",
    displayName: "Claude Sonnet 4.5",
    description: "Most intelligent model",
  },
  {
    value: "claude-opus-4-5-20251101",
    displayName: "Claude Opus 4.5",
    description: "Most capable model",
  },
  {
    value: "claude-3-5-haiku-20241022",
    displayName: "Claude 3.5 Haiku",
    description: "Fastest model",
  },
] as const;
