from typing import AsyncIterator
import time
from claude_agent_sdk import query, ClaudeSDKClient, ClaudeAgentOptions, AssistantMessage as SDKAssistantMessage, ResultMessage as SDKResultMessage, SystemMessage as SDKSystemMessage, UserMessage as SDKUserMessage
from .models import SessionResult, PromptResult, Message, AssistantMessage, UserMessage, UserMessageReplay, ResultMessage, SystemMessage, PartialAssistantMessage, CompactBoundaryMessage


class ClaudeAgentClient:
    def __init__(self, model: str = "claude-sonnet-4-5-20250929", cli_path: str | None = None):
        self.model = model
        self.cli_path = cli_path
        self._sessions: dict[str, ClaudeSDKClient] = {}

    async def create_session(self, model: str | None = None) -> SessionResult:
        session_model = model or self.model
        options = ClaudeAgentOptions(model=session_model, cli_path=self.cli_path)
        client = ClaudeSDKClient(options=options)
        await client.__aenter__()

        await client.query("hi")

        session_id: str | None = None
        async for msg in client.receive_response():
            if isinstance(msg, SDKSystemMessage) and msg.subtype == "init":
                session_id = msg.data.get("session_id")
                break

        if not session_id:
            await client.__aexit__(None, None, None)
            raise RuntimeError("Failed to get session ID")

        self._sessions[session_id] = client
        return SessionResult(session_id=session_id)

    async def run_prompt(self, prompt: str, model: str | None = None) -> PromptResult:
        session_model = model or self.model
        options = ClaudeAgentOptions(model=session_model, cli_path=self.cli_path)

        result_text = ""
        session_id = ""
        total_cost = 0.0
        duration_ms = 0.0

        async for msg in query(prompt=prompt, options=options):
            if isinstance(msg, SDKAssistantMessage):
                for block in msg.content:
                    if hasattr(block, "text"):
                        result_text += block.text
            elif isinstance(msg, SDKResultMessage):
                if msg.subtype == "success":
                    result_text = msg.result
                session_id = msg.session_id
                total_cost = msg.total_cost_usd
                duration_ms = msg.duration_ms

        return PromptResult(
            result=result_text,
            session_id=session_id,
            total_cost_usd=total_cost,
            duration_ms=duration_ms,
        )

    async def send_message(self, session_id: str, prompt: str) -> AsyncIterator[Message]:
        import uuid as uuid_module

        client = self._sessions.get(session_id)
        if not client:
            raise ValueError(f"Session {session_id} not found")

        await client.query(prompt)

        async for msg in client.receive_response():
            if isinstance(msg, SDKAssistantMessage):
                text_content = ""
                for block in msg.content:
                    if hasattr(block, "text"):
                        text_content += block.text

                yield AssistantMessage(
                    type="assistant",
                    uuid=str(uuid_module.uuid4()),
                    session_id=session_id,
                    parent_tool_use_id=msg.parent_tool_use_id,
                    message=text_content,
                )
            elif isinstance(msg, SDKUserMessage):
                msg_uuid = str(uuid_module.uuid4())
                if hasattr(msg, 'uuid') and msg.uuid:
                    yield UserMessageReplay(
                        type="user",
                        uuid=msg_uuid,
                        session_id=session_id,
                        parent_tool_use_id=msg.parent_tool_use_id if hasattr(msg, 'parent_tool_use_id') else None,
                    )
                else:
                    yield UserMessage(
                        type="user",
                        uuid=None,
                        session_id=session_id,
                        parent_tool_use_id=msg.parent_tool_use_id if hasattr(msg, 'parent_tool_use_id') else None,
                    )
            elif isinstance(msg, SDKResultMessage):
                yield ResultMessage(
                    type="result",
                    subtype=msg.subtype,
                    uuid=str(uuid_module.uuid4()),
                    session_id=msg.session_id,
                    duration_ms=msg.duration_ms,
                    duration_api_ms=msg.duration_api_ms,
                    is_error=msg.is_error,
                    num_turns=msg.num_turns,
                    total_cost_usd=msg.total_cost_usd,
                    result=msg.result if msg.subtype == "success" else None,
                )
            elif isinstance(msg, SDKSystemMessage):
                msg_uuid = msg.data.get("uuid") if hasattr(msg, "data") else str(uuid_module.uuid4())
                msg_session_id = msg.data.get("session_id") if hasattr(msg, "data") else session_id

                if msg.subtype == "compact_boundary":
                    yield CompactBoundaryMessage(
                        type="system",
                        subtype=msg.subtype,
                        uuid=msg_uuid,
                        session_id=msg_session_id,
                    )
                else:
                    yield SystemMessage(
                        type="system",
                        subtype=msg.subtype,
                        uuid=msg_uuid,
                        session_id=msg_session_id,
                    )

    async def close(self):
        for client in self._sessions.values():
            await client.__aexit__(None, None, None)
        self._sessions.clear()
