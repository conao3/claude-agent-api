import {
  unstable_v2_prompt,
  unstable_v2_createSession,
} from "@anthropic-ai/claude-agent-sdk";

interface RunPromptArgs {
  prompt: string;
  model?: string;
}

interface RunPromptResult {
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
