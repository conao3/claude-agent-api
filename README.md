# Claude Agent API

GraphQL server for Claude Agent API using Bun, GraphQL Yoga, and Pothos.

Uses Claude Agent SDK V2 interface (preview) for simplified send/receive pattern.

## Setup

```bash
nix develop
bun install
```

## Development

```bash
bun run dev
```

Server runs on http://localhost:4000/graphql

## Available Queries

### hello

Simple greeting query.

```graphql
query {
  hello(name: "Claude")
}
```

### runPrompt

Execute a prompt using Claude Agent SDK V2.

```graphql
query {
  runPrompt(prompt: "List files in current directory", model: "claude-sonnet-4-5-20250929") {
    result
    sessionId
    totalCostUsd
    durationMs
  }
}
```

Default model: `claude-sonnet-4-5-20250929`

## Scripts

- `bun run dev` - Start development server with watch mode
- `bun run start` - Start production server
- `bun run type-check` - Run TypeScript type checking
