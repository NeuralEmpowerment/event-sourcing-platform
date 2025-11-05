.PHONY: help start-infra stop-infra status test-all test-todo test-library clean install

help:
	@echo "VSA Examples - Infrastructure & Testing"
	@echo ""
	@echo "Available commands:"
	@echo "  make start-infra    - Start event-store + PostgreSQL"
	@echo "  make stop-infra     - Stop all infrastructure"
	@echo "  make status         - Check infrastructure status"
	@echo "  make install        - Install dependencies for all examples"
	@echo "  make test-all       - Run all E2E tests"
	@echo "  make test-todo      - Run Todo List E2E tests"
	@echo "  make test-library   - Run Library Management E2E tests"
	@echo "  make clean          - Stop and remove all volumes"
	@echo ""

start-infra:
	@echo "🚀 Starting event-store infrastructure..."
	cd ../.. && docker compose --profile local up -d
	@echo "⏳ Waiting for event-store to be ready..."
	./shared/scripts/wait-for-it.sh localhost:50051 -t 60 -- echo "✅ Event store is ready!"
	@echo "✅ Infrastructure started successfully"
	@echo ""
	@echo "Event Store gRPC: localhost:50051"
	@echo "PostgreSQL:       localhost:5432"

stop-infra:
	@echo "🛑 Stopping infrastructure..."
	cd ../.. && docker compose --profile local down
	@echo "✅ Infrastructure stopped"

status:
	@echo "📊 Infrastructure Status:"
	@cd ../.. && docker compose --profile local ps

install:
	@echo "📦 Installing dependencies for all examples..."
	@echo ""
	@echo "Installing Todo List..."
	cd 01-todo-list-ts && npm install
	@echo ""
	@echo "Installing Library Management..."
	cd 02-library-management-ts && npm install
	@echo ""
	@echo "✅ All dependencies installed"

test-all: test-todo test-library

test-todo:
	@echo "🧪 Running Todo List E2E tests..."
	cd 01-todo-list-ts && npm run test:e2e

test-library:
	@echo "🧪 Running Library Management E2E tests..."
	cd 02-library-management-ts && npm run test:e2e

clean:
	@echo "🧹 Cleaning up infrastructure and volumes..."
	cd ../.. && docker compose --profile local down -v
	@echo "✅ Cleanup complete"

