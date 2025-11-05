.PHONY: help setup test test-unit test-integration qa qa-fast lint format type-check clean build

help:
	@echo "Python Event Sourcing SDK - Available commands:"
	@echo ""
	@echo "Setup:"
	@echo "  setup         - Install dependencies with uv"
	@echo "  clean         - Remove build artifacts"
	@echo ""
	@echo "Testing:"
	@echo "  test          - Run all tests"
	@echo "  test-unit     - Run unit tests only"
	@echo "  test-integration - Run integration tests"
	@echo ""
	@echo "Quality:"
	@echo "  qa            - Run full QA (lint, type-check, test)"
	@echo "  qa-fast       - Quick QA (lint, type-check, unit tests)"
	@echo "  lint          - Run ruff linter"
	@echo "  format        - Format code with black"
	@echo "  type-check    - Run mypy type checker"
	@echo ""
	@echo "Build:"
	@echo "  build         - Build distribution package"

setup:
	uv sync --all-extras

test:
	uv run pytest

test-unit:
	uv run pytest -m unit

test-integration:
	uv run pytest -m integration

qa: lint type-check test
	@echo "✅ Full QA passed"

qa-fast: lint type-check test-unit
	@echo "✅ Fast QA passed"

lint:
	uv run ruff check src tests

format:
	uv run black src tests
	uv run ruff check --fix src tests

type-check:
	uv run mypy src

clean:
	rm -rf build/ dist/ *.egg-info
	rm -rf .pytest_cache .mypy_cache .ruff_cache
	rm -rf htmlcov/ .coverage
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

build: clean
	uv build

