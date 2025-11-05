/**
 * Event Store interface
 * 
 * This is a simplified event store for demonstration purposes.
 * In production, you would use a proper event store implementation
 * like EventStoreDB, PostgreSQL with event store tables, or similar.
 */
export interface StoredEvent {
  aggregateId: string;
  type: string;
  data: any;
  version: number;
  timestamp: Date;
}

export interface EventStore {
  /**
   * Append an event to the store
   */
  appendEvent(aggregateId: string, eventType: string, eventData: any): Promise<void>;

  /**
   * Get all events for a specific aggregate
   */
  getEvents(aggregateId: string): Promise<StoredEvent[]>;

  /**
   * Get all events across all aggregates
   */
  getAllEvents(): Promise<StoredEvent[]>;
}

