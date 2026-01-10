import { createYoga } from "graphql-yoga";
import { schema } from "./schema";

const yoga = createYoga({ schema });

const server = Bun.serve({
  fetch: yoga,
  port: 4000,
});

console.log(`GraphQL server is running on http://localhost:${server.port}/graphql`);
