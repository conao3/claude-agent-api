from typing import Literal
from pydantic import BaseModel, Field


class ModelInfo(BaseModel):
    value: str
    display_name: str = Field(alias="displayName")
    description: str


class SessionResult(BaseModel):
    model_config = {"populate_by_name": True}

    session_id: str = Field(alias="sessionId")


class PromptResult(BaseModel):
    model_config = {"populate_by_name": True}

    result: str
    session_id: str = Field(alias="sessionId")
    total_cost_usd: float = Field(alias="totalCostUsd")
    duration_ms: float = Field(alias="durationMs")


class AssistantMessage(BaseModel):
    model_config = {"populate_by_name": True}

    type: Literal["assistant"]
    uuid: str
    session_id: str = Field(alias="sessionId")
    parent_tool_use_id: str | None = Field(None, alias="parentToolUseId")
    message: str


class UserMessage(BaseModel):
    model_config = {"populate_by_name": True}

    type: Literal["user"]
    uuid: str | None = None
    session_id: str = Field(alias="sessionId")
    parent_tool_use_id: str | None = Field(None, alias="parentToolUseId")


class UserMessageReplay(BaseModel):
    model_config = {"populate_by_name": True}

    type: Literal["user"]
    uuid: str
    session_id: str = Field(alias="sessionId")
    parent_tool_use_id: str | None = Field(None, alias="parentToolUseId")


class ResultMessage(BaseModel):
    model_config = {"populate_by_name": True}

    type: Literal["result"]
    subtype: str
    uuid: str
    session_id: str = Field(alias="sessionId")
    duration_ms: float = Field(alias="durationMs")
    duration_api_ms: float = Field(alias="durationApiMs")
    is_error: bool = Field(alias="isError")
    num_turns: int = Field(alias="numTurns")
    total_cost_usd: float = Field(alias="totalCostUsd")
    result: str | None = None


class SystemMessage(BaseModel):
    model_config = {"populate_by_name": True}

    type: Literal["system"]
    subtype: str
    uuid: str
    session_id: str = Field(alias="sessionId")


class PartialAssistantMessage(BaseModel):
    model_config = {"populate_by_name": True}

    type: Literal["stream_event"]
    uuid: str
    session_id: str = Field(alias="sessionId")
    parent_tool_use_id: str | None = Field(None, alias="parentToolUseId")


class CompactBoundaryMessage(BaseModel):
    model_config = {"populate_by_name": True}

    type: Literal["system"]
    subtype: Literal["compact_boundary"]
    uuid: str
    session_id: str = Field(alias="sessionId")


Message = AssistantMessage | UserMessage | UserMessageReplay | ResultMessage | SystemMessage | PartialAssistantMessage | CompactBoundaryMessage
