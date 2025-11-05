import { EventStoreClientTS } from '@eventstore/sdk-ts';
import type { IEventStore } from './EventStore.js';

interface DomainEvent {
  type: string;
  aggregateId: string;
  timestamp: Date;
  data: unknown;
}

export interface EventStoreAdapterConfig {
  address: string;
  tenantId?: string;
}

/**
 * Adapter for the Event Store gRPC client
 * Implements the IEventStore interface for the Todo application
 */
export class EventStoreAdapter implements IEventStore {
  private client: EventStoreClientTS;
  private tenantId: string;

  constructor(config: EventStoreAdapterConfig) {
    this.client = new EventStoreClientTS(config.address);
    this.tenantId = config.tenantId || 'default';
  }

  async save(aggregateId: string, events: DomainEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    // Read current version for optimistic concurrency
    const existingEvents = await this.load(aggregateId);
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
        actorId: 'todo-app',
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
        aggregateType: 'Task',
        expectedAggregateNonce: expectedNonce,
        idempotencyKey: crypto.randomUUID(),
        events: storeEvents,
      });
    } catch (error) {
      throw new Error(`Failed to append events: ${error}`);
    }
  }

  async load(aggregateId: string): Promise<DomainEvent[]> {
    try {
      const response = await this.client.readStream({
        tenantId: this.tenantId,
        aggregateId,
        aggregateType: 'Task',
        fromNonce: 0,
        maxCount: 1000, // Read up to 1000 events
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
      // If stream doesn't exist, return empty array
      const errorMessage = String(error);
      if (errorMessage.includes('NOT_FOUND') || errorMessage.includes('No events found')) {
        return [];
      }
      throw new Error(`Failed to read stream: ${error}`);
    }
  }

  /**
   * Clear all events for an aggregate (useful for testing)
   */
  async clear(aggregateId: string): Promise<void> {
    // Note: The event store doesn't support deletion
    // In production, you would implement soft deletion or use a separate mechanism
    // For testing, we can work around this by using unique aggregate IDs
    console.warn(`Clear operation not supported. Aggregate ${aggregateId} events will persist.`);
  }

  /**
   * Close the connection to the event store
   */
  async close(): Promise<void> {
    // EventStoreClientTS doesn't expose a close method
    // The connection will be closed when the process exits
  }
}

