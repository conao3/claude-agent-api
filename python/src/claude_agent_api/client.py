from typing import AsyncIterator
from gql import Client, gql
from gql.transport.httpx import HTTPXTransport
from gql.transport.websockets import WebsocketsTransport
from .models import SessionResult, PromptResult, Message, AssistantMessage, UserMessage, UserMessageReplay, ResultMessage, SystemMessage, PartialAssistantMessage, CompactBoundaryMessage


class ClaudeAgentClient:
    def __init__(self, http_url: str = "http://localhost:4000/graphql", ws_url: str = "ws://localhost:4000/graphql"):
        self.http_url = http_url
        self.ws_url = ws_url
        self._http_client: Client | None = None
        self._ws_client: Client | None = None

    async def _get_http_client(self) -> Client:
        if self._http_client is None:
            transport = HTTPXTransport(url=self.http_url)
            self._http_client = Client(transport=transport, fetch_schema_from_transport=True)
        return self._http_client

    async def _get_ws_client(self) -> Client:
        if self._ws_client is None:
            transport = WebsocketsTransport(url=self.ws_url)
            self._ws_client = Client(transport=transport)
        return self._ws_client

    async def create_session(self, model: str | None = None) -> SessionResult:
        client = await self._get_http_client()
        query = gql("""
            mutation CreateSession($model: String) {
                createSession(model: $model) {
                    sessionId
                }
            }
        """)
        result = await client.execute_async(query, variable_values={"model": model})
        return SessionResult.model_validate(result["createSession"])

    async def run_prompt(self, prompt: str, model: str | None = None) -> PromptResult:
        client = await self._get_http_client()
        query = gql("""
            mutation RunPrompt($prompt: String!, $model: String) {
                runPrompt(prompt: $prompt, model: $model) {
                    result
                    sessionId
                    totalCostUsd
                    durationMs
                }
            }
        """)
        result = await client.execute_async(query, variable_values={"prompt": prompt, "model": model})
        return PromptResult.model_validate(result["runPrompt"])

    async def send_message(self, session_id: str, prompt: str) -> AsyncIterator[Message]:
        client = await self._get_ws_client()
        query = gql("""
            subscription SendMessage($sessionId: String!, $prompt: String!) {
                sendMessage(sessionId: $sessionId, prompt: $prompt) {
                    __typename
                    ... on AssistantMessage {
                        type
                        uuid
                        sessionId
                        parentToolUseId
                        message
                    }
                    ... on UserMessage {
                        type
                        uuid
                        sessionId
                        parentToolUseId
                    }
                    ... on UserMessageReplay {
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
                    ... on PartialAssistantMessage {
                        type
                        uuid
                        sessionId
                        parentToolUseId
                    }
                    ... on CompactBoundaryMessage {
                        type
                        subtype
                        uuid
                        sessionId
                    }
                }
            }
        """)
        async for result in client.subscribe_async(query, variable_values={"sessionId": session_id, "prompt": prompt}):
            msg_data = result["sendMessage"]
            typename = msg_data.get("__typename")

            if typename == "AssistantMessage":
                yield AssistantMessage.model_validate(msg_data)
            elif typename == "UserMessage":
                yield UserMessage.model_validate(msg_data)
            elif typename == "UserMessageReplay":
                yield UserMessageReplay.model_validate(msg_data)
            elif typename == "ResultMessage":
                yield ResultMessage.model_validate(msg_data)
            elif typename == "SystemMessage":
                if msg_data.get("subtype") == "compact_boundary":
                    yield CompactBoundaryMessage.model_validate(msg_data)
                else:
                    yield SystemMessage.model_validate(msg_data)
            elif typename == "PartialAssistantMessage":
                yield PartialAssistantMessage.model_validate(msg_data)

    async def close(self):
        if self._http_client:
            await self._http_client.close_async()
        if self._ws_client:
            await self._ws_client.close_async()
