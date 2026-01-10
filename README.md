# Claude Agent API

GraphQL server and Python client for Claude Agent API.

**TypeScript Server:** Built with Bun, GraphQL Yoga, and Pothos. Uses Claude Agent SDK V2 interface (preview) with WebSocket subscriptions for streaming responses.

**Python Client:** Type-safe GraphQL client with Pydantic models for all API interactions.

## Setup

```bash
nix develop
bun install
```

### Authentication

Choose one of the following authentication methods:

#### Option 1: Use Claude Code Max Plan (Recommended)

Authenticate with your Claude Pro or Max plan subscription:

```bash
claude login
```

**Important**: Make sure `ANTHROPIC_API_KEY` environment variable is **not** set. If it's set, Claude Code will use the API key instead of your subscription, resulting in API usage charges.

```bash
# Check if ANTHROPIC_API_KEY is set
env | grep ANTHROPIC_API_KEY

# If set, unset it
unset ANTHROPIC_API_KEY
```

#### Option 2: Use Anthropic API Key

Set the `ANTHROPIC_API_KEY` environment variable:

```bash
export ANTHROPIC_API_KEY=your-api-key-here
```

Get your API key from https://console.anthropic.com/settings/keys

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

### TypeScript Server

- `bun run dev` - Start development server with watch mode
- `bun run start` - Start production server
- `bun run type-check` - Run TypeScript type checking

### Python

The Python package provides both a GraphQL server and a CLI client, using Claude Agent SDK directly. All use Pydantic models for type-safe API interactions.

**Note:** Python implementation is standalone and does not depend on the TypeScript server.

#### Installation

```bash
make python-sync
```

This installs `claude-agent-sdk` which includes the Claude Code CLI automatically.

#### GraphQL Server

Start a Python GraphQL server using Claude Agent SDK:

```bash
make python-server
```

Server runs on:
- HTTP: http://localhost:4001/graphql

Or run directly:
```bash
uv run claude-agent-server
```

#### CLI Client Usage

1. **Single prompt (non-streaming):**
```bash
uv run claude-agent-api prompt "List files in current directory"
```

2. **Send message to existing session:**
```bash
uv run claude-agent-api message <session-id> "Show me the first file"
```

3. **Interactive mode:**
```bash
uv run claude-agent-api interactive
```

Or using Make:
```bash
make python-run ARGS='prompt "hello"'
make python-run ARGS='interactive'
```

#### Python API

```python
from claude_agent_api import ClaudeAgentClient, AssistantMessage, ResultMessage

client = ClaudeAgentClient()

result = await client.run_prompt("Hello, Claude!")
print(result.result)
print(result.session_id)
print(result.total_cost_usd)

session = await client.create_session()
async for message in client.send_message(session.session_id, "What is 2+2?"):
    if isinstance(message, AssistantMessage):
        print(message.message)
    elif isinstance(message, ResultMessage):
        print(f"Cost: ${message.total_cost_usd}")

await client.close()
```

All response types are validated using Pydantic models for type safety.
