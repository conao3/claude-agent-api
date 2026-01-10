import strawberry
from typing import AsyncGenerator
from .client import ClaudeAgentClient
from .models import (
    SessionResult as SessionResultModel,
    PromptResult as PromptResultModel,
    AssistantMessage as AssistantMessageModel,
    UserMessage as UserMessageModel,
    UserMessageReplay as UserMessageReplayModel,
    ResultMessage as ResultMessageModel,
    SystemMessage as SystemMessageModel,
    PartialAssistantMessage as PartialAssistantMessageModel,
    CompactBoundaryMessage as CompactBoundaryMessageModel,
)


@strawberry.experimental.pydantic.type(model=SessionResultModel)
class SessionResult:
    session_id: strawberry.auto


@strawberry.experimental.pydantic.type(model=PromptResultModel)
class PromptResult:
    result: strawberry.auto
    session_id: strawberry.auto
    total_cost_usd: strawberry.auto
    duration_ms: strawberry.auto


@strawberry.experimental.pydantic.type(model=AssistantMessageModel)
class AssistantMessage:
    type: str
    uuid: strawberry.auto
    session_id: strawberry.auto
    parent_tool_use_id: strawberry.auto
    message: strawberry.auto


@strawberry.experimental.pydantic.type(model=UserMessageModel)
class UserMessage:
    type: str
    uuid: strawberry.auto
    session_id: strawberry.auto
    parent_tool_use_id: strawberry.auto


@strawberry.experimental.pydantic.type(model=UserMessageReplayModel)
class UserMessageReplay:
    type: str
    uuid: strawberry.auto
    session_id: strawberry.auto
    parent_tool_use_id: strawberry.auto


@strawberry.experimental.pydantic.type(model=ResultMessageModel)
class ResultMessage:
    type: str
    subtype: str
    uuid: strawberry.auto
    session_id: strawberry.auto
    duration_ms: strawberry.auto
    duration_api_ms: strawberry.auto
    is_error: strawberry.auto
    num_turns: strawberry.auto
    total_cost_usd: strawberry.auto
    result: strawberry.auto


@strawberry.experimental.pydantic.type(model=SystemMessageModel)
class SystemMessage:
    type: str
    subtype: str
    uuid: strawberry.auto
    session_id: strawberry.auto


@strawberry.experimental.pydantic.type(model=PartialAssistantMessageModel)
class PartialAssistantMessage:
    type: str
    uuid: strawberry.auto
    session_id: strawberry.auto
    parent_tool_use_id: strawberry.auto


@strawberry.experimental.pydantic.type(model=CompactBoundaryMessageModel)
class CompactBoundaryMessage:
    type: str
    subtype: str
    uuid: strawberry.auto
    session_id: strawberry.auto


Message = strawberry.union("Message", (
    AssistantMessage,
    UserMessage,
    UserMessageReplay,
    ResultMessage,
    SystemMessage,
    PartialAssistantMessage,
    CompactBoundaryMessage,
))


@strawberry.type
class Query:
    @strawberry.field
    async def hello(self, name: str | None = None) -> str:
        return f"hello {name or 'world'}"


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_session(self, model: str | None = None, http_url: str = "http://localhost:4000/graphql", ws_url: str = "ws://localhost:4000/graphql") -> SessionResult:
        client = ClaudeAgentClient(http_url=http_url, ws_url=ws_url)
        try:
            result = await client.create_session(model)
            return SessionResult.from_pydantic(result)
        finally:
            await client.close()

    @strawberry.mutation
    async def run_prompt(self, prompt: str, model: str | None = None, http_url: str = "http://localhost:4000/graphql", ws_url: str = "ws://localhost:4000/graphql") -> PromptResult:
        client = ClaudeAgentClient(http_url=http_url, ws_url=ws_url)
        try:
            result = await client.run_prompt(prompt, model)
            return PromptResult.from_pydantic(result)
        finally:
            await client.close()


@strawberry.type
class Subscription:
    @strawberry.subscription
    async def send_message(self, session_id: str, prompt: str, http_url: str = "http://localhost:4000/graphql", ws_url: str = "ws://localhost:4000/graphql") -> AsyncGenerator[Message, None]:
        client = ClaudeAgentClient(http_url=http_url, ws_url=ws_url)
        try:
            async for message in client.send_message(session_id, prompt):
                if isinstance(message, AssistantMessageModel):
                    yield AssistantMessage.from_pydantic(message)
                elif isinstance(message, UserMessageModel):
                    yield UserMessage.from_pydantic(message)
                elif isinstance(message, UserMessageReplayModel):
                    yield UserMessageReplay.from_pydantic(message)
                elif isinstance(message, ResultMessageModel):
                    yield ResultMessage.from_pydantic(message)
                elif isinstance(message, SystemMessageModel):
                    yield SystemMessage.from_pydantic(message)
                elif isinstance(message, PartialAssistantMessageModel):
                    yield PartialAssistantMessage.from_pydantic(message)
                elif isinstance(message, CompactBoundaryMessageModel):
                    yield CompactBoundaryMessage.from_pydantic(message)
        finally:
            await client.close()


schema = strawberry.Schema(query=Query, mutation=Mutation, subscription=Subscription)
