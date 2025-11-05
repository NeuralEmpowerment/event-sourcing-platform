import { EventStoreClientTS } from '@eventstore/sdk-ts';

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
 */
export class EventStoreAdapter {
  private client: EventStoreClientTS;
  private tenantId: string;

  constructor(config: EventStoreConfig) {
    this.client = new EventStoreClientTS(config.address);
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
        eventId: crypto.randomUUID(),
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

    try {
      await this.client.appendTyped({
        tenantId: this.tenantId,
        aggregateId,
        aggregateType,
        expectedAggregateNonce: expectedNonce,
        idempotencyKey: crypto.randomUUID(),
        events: storeEvents,
      });
    } catch (error) {
      throw new Error(`Failed to append events: ${error}`);
    }
  }

  async readEvents(aggregateId: string, aggregateType: string): Promise<DomainEvent[]> {
    try {
      const response = await this.client.readStream({
        tenantId: this.tenantId,
        aggregateId,
        aggregateType,
        fromNonce: 0,
        maxCount: 1000,
      });

      if (!response.events) {
        return [];
      }

      return response.events.map((event) => ({
        type: event.meta?.eventType || 'Unknown',
        aggregateId: event.meta?.aggregateId || aggregateId,
        timestamp: new Date(Number(event.meta?.recordedTimeUnixMs || 0)),
        data: JSON.parse(event.payload.toString('utf-8')),
      }));
    } catch (error) {
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

