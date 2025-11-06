import { BaseDomainEvent } from "@event-sourcing-platform/typescript";

/**
 * Domain Event: OrderSubmitted
 * 
 * Emitted when an order is successfully submitted.
 * 
 * @Event decorator specifies event type and version for:
 * - Event versioning and upcasting (ADR-007)
 * - Framework auto-discovery
 * - Serialization/deserialization
 */
export class OrderSubmittedEvent extends BaseDomainEvent {
  readonly eventType = "OrderSubmitted" as const;
  readonly schemaVersion = 1 as const; // ADR-007: Simple version format ('v1')

  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
  ) {
    super();
  }
}

