# Vertical Slice Architecture Manager (VSA)

A Rust-based CLI tool that enforces vertical slice architecture with bounded context support, designed to work seamlessly with event-sourced systems.

## Status

🚧 **In Development** - Milestone 1 Complete ✅ | See [PROJECT-PLAN_20251105_vertical-slice-manager.md](./PROJECT-PLAN_20251105_vertical-slice-manager.md)

## Overview

VSA helps teams:
- **Enforce** vertical slice architecture conventions
- **Validate** bounded context boundaries
- **Generate** feature scaffolding with templates (coming soon)
- **Prevent** duplication of integration events
- **Integrate** with event sourcing frameworks (optional)
- **Support** multiple languages (TypeScript, Python, Rust)

## Core Concepts

### Vertical Slice Architecture
Organize code by business features rather than technical layers. Each slice contains all concerns (commands, events, handlers, tests) for a specific operation.

### Bounded Contexts (DDD)
Explicit boundaries between different domains. Each context is autonomous and communicates with others only through integration events.

### Convention Over Configuration
Minimal configuration with strong conventions. Grep-friendly naming (e.g., `CreateProductCommand.ts`, not `command.ts`).

### Integration Events
Single source of truth for cross-context events. Events defined once in `_shared/integration-events/`, imported by all contexts.

## Installation

### From Source

```bash
# Clone and install
git clone <repository-url>
cd vsa
cargo install --path vsa-cli
```

### Using Make

```bash
make install
```

### From Crates.io (Coming Soon)

```bash
cargo install vsa-cli
```

## Quick Start

### 1. Initialize Configuration

```bash
# Basic initialization
vsa init

# With event sourcing framework integration
vsa init --with-framework

# Custom root and language
vsa init --root ./src/contexts --language typescript
```

This creates a `vsa.yml` configuration file:

```yaml
vsa:
  version: 1
  root: ./src/contexts
  language: typescript
  
  validation:
    require_tests: true
    require_integration_events_in_shared: true
    max_nesting_depth: 3
    allow_nested_features: true
  
  patterns:
    command: "*Command"
    event: "*Event"
    handler: "*Handler"
    query: "*Query"
    integration_event: "*IntegrationEvent"
    test: "*.test"
```

### 2. Create Context Structure

```bash
mkdir -p src/contexts/warehouse/products/create-product
mkdir -p src/contexts/warehouse/_shared/integration-events
```

Example file: `src/contexts/warehouse/products/create-product/CreateProductCommand.ts`

```typescript
export class CreateProductCommand {
  constructor(
    public readonly name: string,
    public readonly sku: string,
    public readonly price: number
  ) {}
}
```

### 3. Validate Structure

```bash
# Validate your VSA structure
vsa validate

# Watch mode for continuous validation (coming soon)
vsa validate --watch
```

### 4. List Contexts and Features

```bash
# List all contexts and features
vsa list

# List only contexts
vsa list --contexts-only

# Filter by context
vsa list --context warehouse
```

### 5. Generate Manifest

```bash
# Generate JSON manifest
vsa manifest --output manifest.json

# Generate YAML manifest
vsa manifest --format yaml --output manifest.yml
```

## Expected Structure

```
src/contexts/
├── warehouse/                    # Bounded Context
│   ├── products/                 # Feature Area
│   │   ├── create-product/       # Feature (Operation)
│   │   │   ├── CreateProductCommand.ts
│   │   │   ├── ProductCreatedEvent.ts
│   │   │   ├── CreateProductHandler.ts
│   │   │   └── CreateProduct.test.ts
│   │   ├── update-product/
│   │   └── delete-product/
│   ├── locations/
│   │   └── create-location/
│   └── _shared/
│       ├── integration-events/
│       │   └── ProductCreatedIntegrationEvent.ts
│       └── types/
│
├── sales/                        # Another Bounded Context
│   ├── orders/
│   │   ├── place-order/
│   │   └── cancel-order/
│   └── _shared/
│
└── _shared/                      # Cross-context integration
    └── integration-events/
        # Import and re-export from context _shared/
```

## Configuration

### Framework Integration

Optionally integrate with event sourcing frameworks:

```yaml
vsa:
  framework:
    name: event-sourcing-platform
    base_types:
      domain_event:
        import: "@event-sourcing-platform/typescript"
        class: "BaseDomainEvent"
      aggregate:
        import: "@event-sourcing-platform/typescript"
        class: "AutoDispatchAggregate"
```

### Custom Patterns

Customize naming patterns:

```yaml
vsa:
  patterns:
    command: "*Cmd"           # Matches CreateProductCmd.ts
    event: "*Evt"             # Matches ProductCreatedEvt.ts
    handler: "*CommandHandler"
```

### Context-Specific Configuration

```yaml
vsa:
  contexts:
    warehouse:
      description: "Warehouse management bounded context"
      optional_features:
        - query  # Don't require queries in this context
```

## Development

### Prerequisites

- Rust 1.70+
- Cargo

### Build

```bash
# Build all crates
make build

# Or with cargo
cargo build --all-features
```

### Test

```bash
# Run all tests
make test

# Run with coverage (requires cargo-tarpaulin)
cargo install cargo-tarpaulin
cargo tarpaulin --all-features
```

### Format & Lint

```bash
# Format code
make fmt

# Run clippy
make clippy

# Run all checks
make check
```

### Available Make Targets

```bash
make help         # Show all available targets
make build        # Build all crates
make test         # Run all tests
make check        # Run fmt, clippy, and tests
make clean        # Clean build artifacts
make install      # Install vsa CLI locally
make docs         # Build and open documentation
```

## Project Structure

```
vsa/
├── vsa-core/              # Core Rust library
│   ├── src/
│   │   ├── config/       # Configuration parsing
│   │   ├── scanner/      # File system scanning
│   │   ├── validator/    # Structure validation
│   │   ├── patterns/     # Pattern matching
│   │   └── manifest/     # Manifest generation
│   └── tests/
├── vsa-cli/               # CLI binary
│   ├── src/
│   │   ├── commands/     # CLI commands
│   │   └── main.rs
│   └── tests/
├── vsa-wasm/              # WASM bindings (future)
├── .github/workflows/     # CI/CD pipelines
├── docs/adrs/            # Architecture Decision Records
└── examples/             # Example projects (coming soon)
```

## Architecture Decision Records

All architectural decisions are documented in `docs/adrs/`:

- [ADR-001: Rust Core with Multi-Language Support](./docs/adrs/ADR-001-rust-core-multi-language.md)
- [ADR-002: Convention Over Configuration](./docs/adrs/ADR-002-convention-over-configuration.md)
- [ADR-003: Bounded Context Structure](./docs/adrs/ADR-003-bounded-context-structure.md)
- [ADR-004: Integration Event Single Source](./docs/adrs/ADR-004-integration-event-single-source.md)
- [ADR-005: Framework Integration Strategy](./docs/adrs/ADR-005-framework-integration-strategy.md)

## Roadmap

- [x] **Milestone 1**: Project Setup & Core Infrastructure ✅
  - [x] Rust workspace with vsa-core, vsa-cli, vsa-wasm
  - [x] Configuration parsing
  - [x] File system scanning
  - [x] Basic validation
  - [x] Pattern matching
  - [x] CI/CD pipeline
- [ ] **Milestone 2**: Core Validation Engine
  - [ ] Comprehensive validation rules
  - [ ] Integration event validation
  - [ ] Bounded context boundaries
- [ ] **Milestone 3**: Code Generation & Templates  
  - [ ] TypeScript templates
  - [ ] Python templates
  - [ ] Rust templates
- [ ] **Milestone 4**: Advanced Features
  - [ ] Watch mode
  - [ ] Auto-fix capabilities
  - [ ] Interactive mode
- [ ] **Milestone 5**: IDE Integration
  - [ ] VSCode extension
  - [ ] WASM bindings for Node.js

## Integration with Event Sourcing Platform

VSA is designed to work seamlessly with the [Event Sourcing Platform](../event-sourcing/). When you enable framework integration, generated code will automatically use:

- `BaseDomainEvent` - Base class for domain events
- `AutoDispatchAggregate` - Aggregate with automatic event application
- `CommandHandler` - Base command handler pattern
- `Repository` - Repository pattern for aggregates

## Philosophy

### Why Vertical Slice Architecture?

- **Cohesion**: Related code lives together
- **Autonomy**: Features can evolve independently
- **Searchability**: Grep-friendly naming
- **Parallelization**: Teams can work on different slices
- **Microservices**: Easy to extract slices into services

### Why Bounded Contexts?

- **Clarity**: Explicit domain boundaries
- **Decoupling**: Contexts communicate via events
- **Scalability**: Independent deployment
- **Team Ownership**: Clear ownership boundaries

### Why Convention Over Configuration?

- **Simplicity**: Less to learn, less to maintain
- **Consistency**: All projects look similar
- **Tooling**: Better IDE support
- **Speed**: Fast onboarding

## Inspiration

- [Jimmy Bogard - Vertical Slice Architecture](https://www.jimmybogard.com/vertical-slice-architecture/)
- [Oskar Dudycz - How to Slice the Codebase](https://event-driven.io/en/how_to_slice_the_codebase_effectively/)
- [Eric Evans - Domain-Driven Design](https://www.domainlanguage.com/ddd/)
- [Next.js App Router](https://nextjs.org/docs/app) - File-system conventions
- Event Sourcing & CQRS patterns

## Contributing

Contributions welcome! This project follows the [RIPER-5 workflow](../AGENTS.md):
1. **Research** - Gather information
2. **Innovate** - Explore approaches
3. **Plan** - Create detailed specifications
4. **Execute** - Implement with TDD
5. **Review** - Validate against plan

See the [PROJECT-PLAN](./PROJECT-PLAN_20251105_vertical-slice-manager.md) for current status and upcoming features.

## License

MIT License - See [LICENSE](./LICENSE) for details.

---

**Current Status**: Milestone 1 Complete ✅  
**Next Steps**: Begin Milestone 2 - Core Validation Engine
