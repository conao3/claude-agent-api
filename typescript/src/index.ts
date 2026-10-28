import { createYoga } from "graphql-yoga";
import { schema } from "./schema";

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
});

const server = Bun.serve({
  fetch: yoga.fetch,
  port: 4000,
});

console.log(
  `GraphQL server is running on http://localhost:${server.port}/graphql`,
);
