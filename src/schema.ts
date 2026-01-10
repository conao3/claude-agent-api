import SchemaBuilder from "@pothos/core";

const builder = new SchemaBuilder({});

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

export const schema = builder.toSchema();
