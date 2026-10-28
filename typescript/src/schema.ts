import SchemaBuilder from "@pothos/core";
import {
  createSession,
  sendMessage,
  runPrompt,
  SUPPORTED_MODELS,
} from "./agent";
import type {
  SDKMessage,
  SDKAssistantMessage,
  SDKUserMessage,
  SDKUserMessageReplay,
  SDKResultMessage,
  SDKSystemMessage,
  SDKPartialAssistantMessage,
  SDKCompactBoundaryMessage,
} from "@anthropic-ai/claude-agent-sdk";

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

type AssistantMessageWithStringContent = Omit<
  SDKAssistantMessage,
  "message"
> & {
  message: string;
};

const AssistantMessageType =
  builder.objectRef<AssistantMessageWithStringContent>("AssistantMessage");

AssistantMessageType.implement({
  fields: (t) => ({
    type: t.expose("type", { type: "String" }),
    uuid: t.expose("uuid", { type: "String" }),
    sessionId: t.expose("session_id", { type: "String" }),
    parentToolUseId: t.expose("parent_tool_use_id", {
      type: "String",
      nullable: true,
    }),
    message: t.expose("message", { type: "String" }),
  }),
});

const UserMessageType = builder.objectRef<SDKUserMessage>("UserMessage");

UserMessageType.implement({
  fields: (t) => ({
    type: t.expose("type", { type: "String" }),
    uuid: t.expose("uuid", { type: "String", nullable: true }),
    sessionId: t.expose("session_id", { type: "String" }),
    parentToolUseId: t.expose("parent_tool_use_id", {
      type: "String",
      nullable: true,
    }),
  }),
});

const UserMessageReplayType =
  builder.objectRef<SDKUserMessageReplay>("UserMessageReplay");

UserMessageReplayType.implement({
  fields: (t) => ({
    type: t.expose("type", { type: "String" }),
    uuid: t.expose("uuid", { type: "String" }),
    sessionId: t.expose("session_id", { type: "String" }),
    parentToolUseId: t.expose("parent_tool_use_id", {
      type: "String",
      nullable: true,
    }),
  }),
});

const ResultMessageType = builder.objectRef<SDKResultMessage>("ResultMessage");

ResultMessageType.implement({
  fields: (t) => ({
    type: t.expose("type", { type: "String" }),
    subtype: t.expose("subtype", { type: "String" }),
    uuid: t.expose("uuid", { type: "String" }),
    sessionId: t.expose("session_id", { type: "String" }),
    durationMs: t.expose("duration_ms", { type: "Float" }),
    durationApiMs: t.expose("duration_api_ms", { type: "Float" }),
    isError: t.expose("is_error", { type: "Boolean" }),
    numTurns: t.expose("num_turns", { type: "Int" }),
    totalCostUsd: t.expose("total_cost_usd", { type: "Float" }),
    result: t.field({
      type: "String",
      nullable: true,
      resolve: (msg) => (msg.subtype === "success" ? msg.result : null),
    }),
  }),
});

const SystemMessageType = builder.objectRef<SDKSystemMessage>("SystemMessage");

SystemMessageType.implement({
  fields: (t) => ({
    type: t.expose("type", { type: "String" }),
    subtype: t.expose("subtype", { type: "String" }),
    uuid: t.expose("uuid", { type: "String" }),
    sessionId: t.expose("session_id", { type: "String" }),
  }),
});

const PartialAssistantMessageType =
  builder.objectRef<SDKPartialAssistantMessage>("PartialAssistantMessage");

PartialAssistantMessageType.implement({
  fields: (t) => ({
    type: t.expose("type", { type: "String" }),
    uuid: t.expose("uuid", { type: "String" }),
    sessionId: t.expose("session_id", { type: "String" }),
    parentToolUseId: t.expose("parent_tool_use_id", {
      type: "String",
      nullable: true,
    }),
  }),
});

const CompactBoundaryMessageType = builder.objectRef<SDKCompactBoundaryMessage>(
  "CompactBoundaryMessage",
);

CompactBoundaryMessageType.implement({
  fields: (t) => ({
    type: t.expose("type", { type: "String" }),
    subtype: t.expose("subtype", { type: "String" }),
    uuid: t.expose("uuid", { type: "String" }),
    sessionId: t.expose("session_id", { type: "String" }),
  }),
});

const MessageUnion = builder.unionType("Message", {
  types: [
    AssistantMessageType,
    UserMessageType,
    UserMessageReplayType,
    ResultMessageType,
    SystemMessageType,
    PartialAssistantMessageType,
    CompactBoundaryMessageType,
  ],
  resolveType: (msg) => {
    if (msg.type === "assistant") return "AssistantMessage";
    if (msg.type === "user") {
      if (msg.uuid) return "UserMessageReplay";
      return "UserMessage";
    }
    if (msg.type === "result") return "ResultMessage";
    if (msg.type === "system") {
      if (msg.subtype === "compact_boundary") return "CompactBoundaryMessage";
      return "SystemMessage";
    }
    if (msg.type === "stream_event") return "PartialAssistantMessage";
    throw new Error(`Unknown message type: ${(msg as any).type}`);
  },
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
      resolve: (parent, args) => createSession(args),
    }),
    runPrompt: t.field({
      type: PromptResultType,
      args: {
        prompt: t.arg.string({ required: true }),
        model: t.arg.string(),
      },
      resolve: (parent, args) => runPrompt(args),
    }),
  }),
});

builder.subscriptionType({
  fields: (t) => ({
    sendMessage: t.field({
      type: MessageUnion,
      args: {
        sessionId: t.arg.string({ required: true }),
        prompt: t.arg.string({ required: true }),
      },
      subscribe: (parent, args) => sendMessage(args),
      resolve: (message) => {
        const validTypes = [
          "assistant",
          "user",
          "result",
          "system",
          "stream_event",
        ];
        if (validTypes.includes(message.type)) {
          return message as
            | AssistantMessageWithStringContent
            | SDKUserMessage
            | SDKUserMessageReplay
            | SDKResultMessage
            | SDKSystemMessage
            | SDKPartialAssistantMessage
            | SDKCompactBoundaryMessage;
        }
        return null;
      },
    }),
  }),
});

export const schema = builder.toSchema();
