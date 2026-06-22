//! Event: a signal was recorded (an append-only fact).
//!
//! Rust idiom: snake_case file ending in `_event.rs`. Events are the ONLY
//! cross-slice contract in VSA — other slices react to this, never import the slice.

/// Emitted when the ingest-signal slice records a signal into a compartment.
#[derive(Debug, Clone)]
pub struct SignalRecordedEvent {
    /// Stable id of the recorded signal.
    pub signal_id: u128,
    /// The compartment it landed in.
    pub compartment: u128,
    /// The recorded body.
    pub body: String,
    /// Schema version (events are versioned for replay/upcasting).
    pub schema_version: u32,
}
