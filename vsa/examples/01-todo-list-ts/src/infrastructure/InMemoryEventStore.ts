import { EventStore, StoredEvent } from './EventStore';

/**
 * In-memory event store implementation
 * 
 * This is suitable for:
 * - Testing
 * - Learning and demos
 * - Development
 * 
 * NOT suitable for production!
 * Use a proper persistent event store in production.
 */
export class InMemoryEventStore implements EventStore {
  private events: StoredEvent[] = [];

  async appendEvent(aggregateId: string, eventType: string, eventData: any): Promise<void> {
    // Get current version for this aggregate
    const aggregateEvents = this.events.filter(e => e.aggregateId === aggregateId);
    const version = aggregateEvents.length + 1;

    const event: StoredEvent = {
      aggregateId,
      type: eventType,
      data: eventData,
      version,
      timestamp: new Date(),
    };

    this.events.push(event);
  }

  async getEvents(aggregateId: string): Promise<StoredEvent[]> {
    return this.events
      .filter(e => e.aggregateId === aggregateId)
      .sort((a, b) => a.version - b.version);
  }

  async getAllEvents(): Promise<StoredEvent[]> {
    return [...this.events].sort((a, b) => {
      // Sort by aggregate first, then by version
      if (a.aggregateId === b.aggregateId) {
        return a.version - b.version;
      }
      return a.aggregateId.localeCompare(b.aggregateId);
    });
  }

  /**
   * Clear all events (useful for testing)
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Get event count (useful for testing)
   */
  getEventCount(): number {
    return this.events.length;
  }
}

