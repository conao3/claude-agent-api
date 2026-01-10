import SchemaBuilder from "@pothos/core";
import { runPrompt } from "./agent";

const builder = new SchemaBuilder({});

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
  }),
});

builder.mutationType({
  fields: (t) => ({
    runPrompt: t.field({
      type: PromptResultType,
      args: {
        prompt: t.arg.string({ required: true }),
        model: t.arg.string(),
      },
      resolve: async (parent, { prompt, model }) =>
        runPrompt({ prompt, model: model || undefined }),
    }),
  }),
});

export const schema = builder.toSchema();
