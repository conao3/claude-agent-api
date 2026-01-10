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

**Returns:** Union type of:
- `AssistantMessage` - Assistant responses
- `UserMessage` / `UserMessageReplay` - User messages
- `ResultMessage` - Final result with cost and duration
- `SystemMessage` - System messages
- `PartialAssistantMessage` - Streaming partial messages
- `CompactBoundaryMessage` - Conversation compaction boundary

**Example:**

```graphql
subscription {
  sendMessage(
    sessionId: "session-id-from-create"
    prompt: "List files in current directory"
  ) {
    __typename
    ... on AssistantMessage {
      type
      uuid
      sessionId
      parentToolUseId
    }
    ... on ResultMessage {
      type
      subtype
      uuid
      sessionId
      durationMs
      durationApiMs
      isError
      numTurns
      totalCostUsd
      result
    }
    ... on SystemMessage {
      type
      subtype
      uuid
      sessionId
    }
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
    __typename
    ... on ResultMessage {
      type
      subtype
      result
      totalCostUsd
      durationMs
    }
    ... on AssistantMessage {
      type
      uuid
      sessionId
    }
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
    __typename
    ... on ResultMessage {
      type
      subtype
      result
      totalCostUsd
      durationMs
    }
    ... on AssistantMessage {
      type
      uuid
      sessionId
    }
  }
}
```

## Message Types

The `sendMessage` subscription returns a union of the following message types:

### AssistantMessage
Fields: `type`, `uuid`, `sessionId`, `parentToolUseId`

### UserMessage / UserMessageReplay
Fields: `type`, `uuid`, `sessionId`, `parentToolUseId`

### ResultMessage
Fields: `type`, `subtype`, `uuid`, `sessionId`, `durationMs`, `durationApiMs`, `isError`, `numTurns`, `totalCostUsd`, `result`

Contains the final result of the conversation turn.

### SystemMessage
Fields: `type`, `subtype`, `uuid`, `sessionId`

### PartialAssistantMessage
Fields: `type`, `uuid`, `sessionId`, `parentToolUseId`

Streaming partial messages during response generation.

### CompactBoundaryMessage
Fields: `type`, `subtype`, `uuid`, `sessionId`

## Scripts

- `bun run dev` - Start development server with watch mode
- `bun run start` - Start production server
- `bun run type-check` - Run TypeScript type checking
