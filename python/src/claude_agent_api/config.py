import os
import shutil


def get_claude_cli_path() -> str | None:
    cli_path = os.environ.get("CLAUDE_CLI_PATH")
    if cli_path:
        return cli_path

    system_claude = shutil.which("claude")
    if system_claude:
        return system_claude

    return None
