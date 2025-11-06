import { randomUUID } from 'crypto';

export interface DomainEvent {
  type: string;
  aggregateId: string;
  timestamp: Date;
  data: unknown;
}

export interface IntegrationEvent {
  type: string;
  timestamp: Date;
  data: unknown;
}

export interface EventStoreConfig {
  address: string;
  tenantId?: string;
}

/**
 * Adapter for the Event Store gRPC client
 * Note: Simplified for ADR-004 demonstration
 */
export class EventStoreAdapter {
  private tenantId: string;
  private address: string;

  constructor(config: EventStoreConfig) {
    this.address = config.address;
    this.tenantId = config.tenantId || 'library-management';
  }

  async appendEvents(
    aggregateId: string,
    aggregateType: string,
    events: DomainEvent[]
  ): Promise<void> {
    if (events.length === 0) {
      return;
    }

    // Read current version for optimistic concurrency
    const existingEvents = await this.readEvents(aggregateId, aggregateType);
    const expectedNonce = existingEvents.length;

    // Convert domain events to event store format
    const storeEvents = events.map((event, index) => ({
      meta: {
        aggregateNonce: expectedNonce + index + 1,
        eventType: event.type,
        eventVersion: 1,
        eventId: randomUUID(),
        contentType: 'application/json',
        contentSchema: event.type,
        correlationId: '',
        causationId: '',
        actorId: 'library-app',
        tenantId: this.tenantId,
        timestampUnixMs: event.timestamp.getTime(),
        headers: {},
      },
      payload: Buffer.from(JSON.stringify(event.data)),
    }));

    // Note: Simplified for ADR-004 demonstration
    // In production, this would append to a real event store
    console.log(`[EventStore] Would append ${events.length} events to ${aggregateType}:${aggregateId}`);
  }

  async readEvents(aggregateId: string, aggregateType: string): Promise<DomainEvent[]> {
    // Note: Simplified for ADR-004 demonstration
    // In production, this would read from a real event store
    try {
      console.log(`[EventStore] Would read events for ${aggregateType}:${aggregateId}`);
      return [];
    } catch (error: any) {
      const errorMessage = String(error);
      if (errorMessage.includes('NOT_FOUND') || errorMessage.includes('No events found')) {
        return [];
      }
      throw new Error(`Failed to read stream: ${error}`);
    }
  }

  async close(): Promise<void> {
    // EventStoreClientTS doesn't expose a close method
  }
}

