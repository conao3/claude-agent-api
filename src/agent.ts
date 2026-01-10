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
  await using session = unstable_v2_createSession({
    model: args.model || "claude-sonnet-4-5-20250929",
  });

  // Session ID not available until after receiving messages
  await session.send("");
  for await (const _ of session.stream()) {
    break;
  }

  return { sessionId: session.sessionId };
}

type BetaContentBlock = {
  type: 'text';
  text: string;
}

type SendMessageArgs = {
  sessionId: string;
  prompt: string;
}

type SendMessageResult = (
  Exclude<SDKMessage, SDKAssistantMessage> |
  SDKAssistantMessage & { message: string }
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
      const content: BetaContentBlock[] = msg.message.content;
      yield { ...msg, message: content.filter(b => b.type === 'text').map(b => b.text).join('') };
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
