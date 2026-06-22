//! Shared kernel: types used across slices (VSA `_shared/`). Pure, dependency-free.
//!
//! Slices and the domain may depend on `_shared`; `_shared` depends on nothing.

/// Stable identifier for a compartment (caller-minted — the domain stays pure).
pub type CompartmentId = u128;

/// Stable identifier for a signal.
pub type SignalId = u128;

/// PARA signal priority (Critical is most urgent). Shared because both the
/// ingest-signal command and downstream read-model slices reference it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SignalPriority {
    Critical,
    Relevant,
    Interesting,
    Incidental,
}
