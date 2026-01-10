import SchemaBuilder from "@pothos/core";
import {
  createSession,
  sendMessage,
  runPrompt,
  SUPPORTED_MODELS,
} from "./agent";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";

const builder = new SchemaBuilder({});

const SessionResultType = builder.objectRef<{
  sessionId: string;
}>("SessionResult");

SessionResultType.implement({
  fields: (t) => ({
    sessionId: t.exposeString("sessionId"),
  }),
});

const PromptResultType = builder.objectRef<{
  result: string;
  sessionId: string;
  totalCostUsd: number;
  durationMs: number;
}>("PromptResult");

PromptResultType.implement({
  fields: (t) => ({
    result: t.exposeString("result"),
    sessionId: t.exposeString("sessionId"),
    totalCostUsd: t.exposeFloat("totalCostUsd"),
    durationMs: t.exposeFloat("durationMs"),
  }),
});

const ModelInfoType = builder.objectRef<{
  value: string;
  displayName: string;
  description: string;
}>("ModelInfo");

ModelInfoType.implement({
  fields: (t) => ({
    value: t.exposeString("value"),
    displayName: t.exposeString("displayName"),
    description: t.exposeString("description"),
  }),
});

const MessageType = builder.objectRef<SDKMessage>("Message");

MessageType.implement({
  fields: (t) => ({
    type: t.exposeString("type"),
    sessionId: t.exposeString("session_id"),
  }),
});

function helloResolver(name: string | null | undefined): string {
  return `hello ${name || "world"}`;
}

builder.queryType({
  fields: (t) => ({
    hello: t.string({
      args: {
        name: t.arg.string(),
      },
      resolve: (parent, { name }) => helloResolver(name),
    }),
    supportedModels: t.field({
      type: [ModelInfoType],
      resolve: () => SUPPORTED_MODELS,
    }),
  }),
});

builder.mutationType({
  fields: (t) => ({
    createSession: t.field({
      type: SessionResultType,
      args: {
        model: t.arg.string(),
      },
      resolve: async (parent, args) =>
        createSession(args),
    }),
    runPrompt: t.field({
      type: PromptResultType,
      args: {
        prompt: t.arg.string({ required: true }),
        model: t.arg.string(),
      },
      resolve: async (parent, args) =>
        runPrompt(args),
    }),
  }),
});

builder.subscriptionType({
  fields: (t) => ({
    sendMessage: t.field({
      type: MessageType,
      args: {
        sessionId: t.arg.string({ required: true }),
        prompt: t.arg.string({ required: true }),
      },
      subscribe: async (parent, args) =>
        sendMessage(args),
      resolve: (message) => message,
    }),
  }),
});

export const schema = builder.toSchema();
