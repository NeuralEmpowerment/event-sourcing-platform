//! Slice: ingest-signal. THIN by design (VSA `thin_slices_only`) — it translates a
//! command into an event via the aggregate and contains no business rules itself.
//!
//! Cross-slice communication happens via the emitted `SignalRecordedEvent` only;
//! this slice never imports another slice.

/// Handle a record-signal command, producing the recorded-signal event.
/// (Signature only — the real wiring lives behind a port to the ES Rust SDK.)
pub fn handle_record_signal() {
    // 1. load the CompartmentAggregate (via the SignalStore port)
    // 2. validate the body in the domain
    // 3. emit SignalRecordedEvent
    // 4. apply + persist
}
