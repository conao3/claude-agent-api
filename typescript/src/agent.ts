import {
  unstable_v2_prompt,
  unstable_v2_createSession,
  unstable_v2_resumeSession,
  type SDKMessage,
  SDKAssistantMessage,
} from "@anthropic-ai/claude-agent-sdk";

type CreateSessionArgs = {
  model?: string | null | undefined;
}

type CreateSessionResult = {
  sessionId: string;
}

export async function createSession(
  args: CreateSessionArgs
): Promise<CreateSessionResult> {
  const session = unstable_v2_createSession({
    model: args.model || "claude-sonnet-4-5-20250929",
  });

  await session.send("hi");

  let sessionId: string | undefined;
  for await (const msg of session.stream()) {
    if (msg.type === "system" && msg.subtype === "init") {
      sessionId = msg.session_id;
      break;
    }
  }

  session.close();

  if (!sessionId) {
    throw new Error("Failed to get session ID");
  }

  return { sessionId };
}

type SendMessageArgs = {
  sessionId: string;
  prompt: string;
}

type SendMessageResult = (
  Exclude<SDKMessage, SDKAssistantMessage> |
  Omit<SDKAssistantMessage, "message"> & { message: string }
)

export async function* sendMessage(
  args: SendMessageArgs
): AsyncGenerator<SendMessageResult> {
  const session = unstable_v2_resumeSession(args.sessionId, {
    model: "claude-sonnet-4-5-20250929",
  });

  await session.send(args.prompt);

  for await (const msg of session.stream()) {
    if (msg.type === "assistant") {
      yield { ...msg, message: msg.message.content.filter(b => b.type === 'text').map(b => b.text).join('') };
      continue;
    }
    yield msg;
  }

  session.close();
}

type RunPromptArgs = {
  prompt: string;
  model?: string | null | undefined;
}

type RunPromptResult = {
  result: string;
  sessionId: string;
  totalCostUsd: number;
  durationMs: number;
}

export async function runPrompt(args: RunPromptArgs): Promise<RunPromptResult> {
  const result = await unstable_v2_prompt(args.prompt, {
    model: args.model || "claude-sonnet-4-5-20250929",
  });

  if (result.subtype !== "success") {
    throw new Error(`Error from agent: ${result.subtype}`);
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
