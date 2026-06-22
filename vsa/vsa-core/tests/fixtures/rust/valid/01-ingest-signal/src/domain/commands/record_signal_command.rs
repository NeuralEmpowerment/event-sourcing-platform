//! Command: record a new signal into a compartment.
//!
//! Rust idiom: snake_case file ending in `_command.rs`. The VSA Rust scanner
//! classifies this as a Command by that suffix (no content parsing).

/// PARA signal priority (Critical is most urgent).
#[derive(Debug, Clone, Copy)]
pub enum SignalPriority {
    Critical,
    Relevant,
    Interesting,
    Incidental,
}

/// Record an incoming signal — names the intent, carries no behaviour.
#[derive(Debug, Clone)]
pub struct RecordSignalCommand {
    /// Which compartment the signal lands in.
    pub compartment: u128,
    /// The signal body (non-empty, enforced in the domain).
    pub body: String,
    /// How urgently it matters.
    pub priority: SignalPriority,
}
