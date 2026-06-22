//! Aggregate: a PARA compartment — the consistency boundary signals land in.
//!
//! Rust idiom: snake_case file ending in `_aggregate.rs`, with the type inside.
//! (Mirrors the ES Rust SDK's `Aggregate` trait shape — apply events to fold state.)

/// Identifier for a compartment (the caller mints it; the domain stays pure).
pub type CompartmentId = u128;

/// A compartment aggregate. Event-sourced: state is folded from recorded events.
#[derive(Debug, Default)]
pub struct CompartmentAggregate {
    /// The compartment's stable id.
    pub id: CompartmentId,
    /// How many signals have been recorded into it.
    signals: u32,
}

impl CompartmentAggregate {
    /// Fold a recorded-signal event into state (the event-sourced `apply`).
    pub fn apply_signal_recorded(&mut self) {
        self.signals = self.signals.saturating_add(1);
    }

    /// How many signals this compartment holds.
    pub fn signal_count(&self) -> u32 {
        self.signals
    }
}
