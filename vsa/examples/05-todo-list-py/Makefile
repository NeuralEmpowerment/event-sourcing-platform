.PHONY: help install test lint format typecheck qa clean

help:  ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

install:  ## Install dependencies
	pip install -e ".[dev]"

test:  ## Run tests
	pytest -v

test-cov:  ## Run tests with coverage
	pytest --cov=src --cov-report=html --cov-report=term

lint:  ## Run linter (ruff)
	ruff check src/

lint-fix:  ## Run linter and auto-fix issues
	ruff check --fix src/

format:  ## Format code with black
	black src/

typecheck:  ## Run type checker (mypy)
	mypy src/

qa:  ## Run all QA checks (lint, type, test)
	@echo "Running linter..."
	ruff check src/
	@echo ""
	@echo "Running type checker..."
	mypy src/
	@echo ""
	@echo "Running tests..."
	pytest -v

validate:  ## Validate VSA structure
	vsa validate

generate:  ## Generate a new feature (interactive)
	@read -p "Context name: " context; \
	read -p "Feature name: " feature; \
	vsa generate -c $$context -f $$feature

clean:  ## Clean build artifacts
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info
	rm -rf .pytest_cache
	rm -rf .mypy_cache
	rm -rf .ruff_cache
	rm -rf htmlcov/
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

