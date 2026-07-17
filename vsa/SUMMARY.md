# VSA: Idiomatic-Rust dogfood enablement

Branch: `feat/rust-idiomatic-detection` (local only, not pushed).

Two minimal, backward-compatible patches to `vsa-core` so `vsa validate` and
`vsa manifest` understand idiomatic Rust naming conventions, enabling us to
enforce architectural boundaries on dream-ship.

## PATCH 1: language-aware public-API file (rule VSA205)

File: `vsa-core/src/validation/cross_context_rules.rs`

`ContextPublicApiExistsRule::validate` previously hardcoded `__init__.py` plus a
Python `from ... import` / `__all__` export grep. It now switches on
`config.language` via a small `PublicApiConvention` helper:

| language           | public-API file            | export check (trimmed line)      |
|--------------------|----------------------------|----------------------------------|
| rust               | `mod.rs` (fallback `lib.rs`)| line starts with `pub `          |
| typescript         | `index.ts`                 | line starts with `export `       |
| python (default)   | `__init__.py`              | `from ... import` or `__all__`   |

Python and TypeScript behavior is unchanged (Python was the historical default,
and any unrecognized language still falls through to it).

## PATCH 2: snake_case artifact detection

Files: `vsa-core/src/config.rs`, `vsa-core/src/validation/structure_rules.rs`
(plus a one-line test-fixture update in `vsa-core/src/patterns.rs`).

Added `patterns.filename_convention: snake_case | pascal_case` (default
`pascal_case`, so existing TS/Python behavior is byte-for-byte unchanged). The
command / event / aggregate / port predicates now route through two helpers:

- `matches_artifact_suffix(ctx, file_name, "Command"|"Event"|"Aggregate"|"Query")`
  - pascal_case: stem ends with the suffix (e.g. `CreateFooCommand.ts`)
  - snake_case: stem ends with `_command` / `_event` / `_aggregate` / `_query`
    (e.g. `create_foo_command.rs`)
- `matches_port_file(ctx, file_name)`
  - pascal_case: stem ends with `Port`
  - snake_case: stem ends with `_port` OR keeps the legacy `Port` suffix

Both aggregate predicates (VSA022 root rule and VSA027 folder rule) were updated
for consistency.

## VERIFY

### `cargo build -p vsa-cli --release`

Clean (both before and after). Only pre-existing warning:
`method 'check_aggregates_in_domain_root' is never used` (unrelated to this work).

### `cargo test -p vsa-core --lib`

`284 passed; 0 failed`. This includes the newly added tests:

- VSA205 Rust: `test_vsa205_rust_context_with_mod_rs_passes`,
  `..._lib_rs_fallback_passes`, `..._missing_mod_rs_errors`,
  `..._mod_rs_without_pub_errors`, plus a TypeScript `index.ts` case.
- snake_case detection: `test_snake_case_command_event_aggregate_detected`
  (`foo_command.rs` -> command, `bar_event.rs` -> event,
  `baz_aggregate.rs` -> aggregate, `knowledge_port.rs` -> port),
  `test_snake_case_port_keeps_pascal_suffix`,
  `test_snake_case_rejects_pascal_and_wrong_ext`,
  `test_pascal_case_default_unchanged`.

Note: the integration test `test_fixture_directory_structure_exists` fails in
this checkout ("Python fixtures directory should exist"). This failure is
PRE-EXISTING and unrelated: it also fails on `main` (verified by stashing these
changes). It is a missing test-fixtures directory, not a code regression.

### End-to-end against dream-ship

Config `/tmp/rust-vsa.yaml`:

```yaml
version: 1
architecture: vertical-slice
root: /home/ubuntu/deploy/dream-ship-main/ws_packages/application/src
language: rust
patterns:
  filename_convention: snake_case
```

`vsa validate` (the headline result):

| | errors | detail |
|--|--|--|
| BEFORE (main) | **3** | `Context 'slices'/'bridge'/'adapters' is missing __init__.py public API` (false positives against Rust `mod.rs` layout) |
| AFTER (patched) | **0** | validation passes; VSA205 now finds each context's `mod.rs`. The 3 false-positive errors are GONE. |

(The 3 `_shared`-folder warnings are unchanged and orthogonal to this work.)

`vsa manifest --include-domain --format json`:

- BEFORE and AFTER both report the same bounded contexts, now seen as Rust
  modules rather than choking on `__init__.py`:
  `slices`, `bridge`, `adapters` (each `context_type: invalid_module`,
  `aggregate_count: 0`).
- Domain artifact counts (aggregates / commands / events / queries): **0 / 0 / 0
  / 0** for this root.

  Why 0, honestly: (a) the minimal config has no `domain:` block, and
  `Manifest::generate_with_options` only emits the domain manifest when
  `config.domain.is_some()`; and (b) `ws_packages/application/src` is the
  application layer - its files use slice-style names (`set_goal.rs`,
  `create_compartment.rs`, `ingest_signal.rs`, `write_back.rs`) and ports named
  `ports.rs` / `knowledge_ports.rs`, none of which carry the `_command` /
  `_event` / `_aggregate` / `_port` (singular) stem suffixes. The counts are
  therefore 0 both before and after; this tree simply contains no matching
  domain artifacts.

  The snake_case detection added in PATCH 2 lives in the `structure_rules`
  predicates and is proven by the unit tests above (`foo_command.rs` etc.). The
  `manifest --include-domain` domain scanners (`aggregate_scanner` /
  `command_scanner` / `event_scanner`) are a SEPARATE PascalCase code path that
  these two minimal patches intentionally did not touch; wiring the convention
  through those scanners is a natural, in-scope follow-up if we want
  `manifest --include-domain` counts for snake_case domain layers.

## Net effect

The concrete dogfood blocker - VSA205 emitting `__init__.py` false positives on
every Rust bounded context - is fixed: `vsa validate` against dream-ship's
`application/src` now passes instead of failing with 3 errors. Rust codebases can
opt into snake_case artifact detection with `patterns.filename_convention:
snake_case`, and all existing TypeScript/Python behavior is unchanged.
