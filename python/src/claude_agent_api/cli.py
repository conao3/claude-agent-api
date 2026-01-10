import asyncio
from .client import ClaudeAgentClient
from .config import get_claude_cli_path
from .models import AssistantMessage, ResultMessage


async def run_prompt_command(client: ClaudeAgentClient, prompt: str, model: str | None = None):
    result = await client.run_prompt(prompt, model)
    print(f"Result: {result.result}")
    print(f"Session ID: {result.session_id}")
    print(f"Cost: ${result.total_cost_usd:.6f}")
    print(f"Duration: {result.duration_ms:.0f}ms")


async def send_message_command(client: ClaudeAgentClient, session_id: str, prompt: str):
    print(f"Sending message to session {session_id}...")
    async for message in client.send_message(session_id, prompt):
        if isinstance(message, AssistantMessage):
            print(f"Assistant: {message.message}")
        elif isinstance(message, ResultMessage):
            if message.result:
                print(f"\nResult: {message.result}")
            print(f"Cost: ${message.total_cost_usd:.6f}")
            print(f"Duration: {message.duration_ms:.0f}ms")


async def interactive_mode(client: ClaudeAgentClient, model: str | None = None):
    print("Creating new session...")
    session = await client.create_session(model)
    print(f"Session created: {session.session_id}")
    print("Enter your prompts (type 'exit' to quit):\n")

    while True:
        try:
            prompt = input("> ")
            if prompt.lower() in ["exit", "quit"]:
                break
            if not prompt.strip():
                continue

            async for message in client.send_message(session.session_id, prompt):
                if isinstance(message, AssistantMessage):
                    if message.message:
                        print(message.message)
                elif isinstance(message, ResultMessage):
                    if message.result:
                        print(f"\nResult: {message.result}")
                    print(f"Cost: ${message.total_cost_usd:.6f}, Duration: {message.duration_ms:.0f}ms\n")
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            print(f"Error: {e}")


async def main_async():
    import argparse

    parser = argparse.ArgumentParser(description="Claude Agent API Client")
    parser.add_argument("--model", help="Claude model to use")
    parser.add_argument("--cli-path", help="Path to Claude Code CLI")

    subparsers = parser.add_subparsers(dest="command", help="Commands")

    prompt_parser = subparsers.add_parser("prompt", help="Run a single prompt")
    prompt_parser.add_argument("prompt", help="Prompt to send")

    message_parser = subparsers.add_parser("message", help="Send a message to existing session")
    message_parser.add_argument("session_id", help="Session ID")
    message_parser.add_argument("prompt", help="Prompt to send")

    subparsers.add_parser("interactive", help="Start interactive mode")

    args = parser.parse_args()

    cli_path = args.cli_path or get_claude_cli_path()
    client = ClaudeAgentClient(model=args.model or "claude-sonnet-4-5-20250929", cli_path=cli_path)

    try:
        if args.command == "prompt":
            await run_prompt_command(client, args.prompt, args.model)
        elif args.command == "message":
            await send_message_command(client, args.session_id, args.prompt)
        elif args.command == "interactive":
            await interactive_mode(client, args.model)
        else:
            parser.print_help()
    finally:
        await client.close()


def main():
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
