# Claude Agent API

GraphQL server for Claude Agent API using Bun, GraphQL Yoga, and Pothos.

Uses Claude Agent SDK V2 interface (preview) with WebSocket subscriptions for streaming responses.

## Setup

```bash
nix develop
bun install
```

## Development

```bash
bun run dev
```

Server runs on:
- HTTP: http://localhost:4000/graphql
- WebSocket: ws://localhost:4000/graphql

## API

### Queries

#### hello

Simple greeting query.

```graphql
query {
  hello(name: "Claude")
}
```

#### supportedModels

Get list of supported Claude models.

```graphql
query {
  supportedModels {
    value
    displayName
    description
  }
}
```

### Mutations

#### createSession

Create a new session.

```graphql
mutation {
  createSession(model: "claude-sonnet-4-5-20250929") {
    sessionId
  }
}
```

#### runPrompt

Execute a prompt and get the result (non-streaming).

**Arguments:**
- `prompt` (required): The prompt to execute
- `model` (optional): Claude model to use (default: `claude-sonnet-4-5-20250929`)
- `sessionId` (optional): Resume an existing session

**Start a new session:**

```graphql
mutation {
  runPrompt(prompt: "Remember this number: 42") {
    result
    sessionId
    totalCostUsd
    durationMs
  }
}
```

**Resume a session:**

```graphql
mutation {
  runPrompt(
    prompt: "What number did I ask you to remember?"
    sessionId: "session-id-from-previous-call"
  ) {
    result
    sessionId
    totalCostUsd
    durationMs
  }
}
```

### Subscriptions (WebSocket)

#### sendMessage

Send a message and receive streaming responses.

**Arguments:**
- `sessionId` (required): Session ID from createSession
- `prompt` (required): The prompt to send

**Example:**

```graphql
subscription {
  sendMessage(
    sessionId: "session-id-from-create"
    prompt: "List files in current directory"
  ) {
    type
    sessionId
  }
}
```

## Usage Flow

### Option 1: Using runPrompt (Non-streaming)

Simple request/response pattern:

```graphql
mutation {
  runPrompt(prompt: "List files in current directory") {
    result
    sessionId
    totalCostUsd
    durationMs
  }
}
```

Continue conversation with sessionId:

```graphql
mutation {
  runPrompt(
    prompt: "Show me the first file"
    sessionId: "session-id-from-previous"
  ) {
    result
    sessionId
    totalCostUsd
    durationMs
  }
}
```

### Option 2: Using sendMessage (Streaming via WebSocket)

1. Create a session:
```graphql
mutation {
  createSession {
    sessionId
  }
}
```

2. Send messages via WebSocket subscription:
```graphql
subscription {
  sendMessage(
    sessionId: "your-session-id"
    prompt: "Remember this number: 42"
  ) {
    type
    sessionId
  }
}
```

3. Continue the conversation with the same sessionId:
```graphql
subscription {
  sendMessage(
    sessionId: "your-session-id"
    prompt: "What number did I ask you to remember?"
  ) {
    type
    sessionId
  }
}
```

## Scripts

- `bun run dev` - Start development server with watch mode
- `bun run start` - Start production server
- `bun run type-check` - Run TypeScript type checking
