.PHONY: help
help:
	@echo "Available targets:"
	@echo "  python-sync    - Sync Python dependencies with uv"
	@echo "  python-lock    - Update Python lock file"
	@echo "  python-fmt     - Format Python code with ruff"
	@echo "  python-lint    - Lint Python code with ruff"
	@echo "  ts-install     - Install TypeScript dependencies"
	@echo "  ts-dev         - Start TypeScript development server"
	@echo "  ts-typecheck   - Run TypeScript type checking"

.PHONY: python-sync
python-sync:
	cd python && uv sync

.PHONY: python-lock
python-lock:
	cd python && uv lock

.PHONY: python-fmt
python-fmt:
	cd python && uv run ruff format .

.PHONY: python-lint
python-lint:
	cd python && uv run ruff check .

.PHONY: ts-install
ts-install:
	cd typescript && bun install

.PHONY: ts-dev
ts-dev:
	cd typescript && bun run dev

.PHONY: ts-typecheck
ts-typecheck:
	cd typescript && bun run type-check
