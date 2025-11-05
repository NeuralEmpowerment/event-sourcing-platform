import type { IntegrationEvent } from './EventStoreAdapter';

/**
 * Event Bus for Integration Events
 * Publishes integration events to subscribers across bounded contexts
 */

export type EventSubscriber = (event: IntegrationEvent) => Promise<void> | void;

export class EventBus {
  private subscribers = new Map<string, EventSubscriber[]>();

  subscribe(eventType: string, subscriber: EventSubscriber): void {
    const existing = this.subscribers.get(eventType) || [];
    existing.push(subscriber);
    this.subscribers.set(eventType, existing);
  }

  async publish(event: IntegrationEvent): Promise<void> {
    const subscribers = this.subscribers.get(event.type) || [];
    
    // Execute all subscribers in parallel
    await Promise.all(
      subscribers.map(async (subscriber) => {
        try {
          await subscriber(event);
        } catch (error) {
          console.error(`Error in subscriber for event ${event.type}:`, error);
          // Continue with other subscribers even if one fails
        }
      })
    );
  }

  // For debugging/monitoring
  getSubscriberCount(eventType: string): number {
    return (this.subscribers.get(eventType) || []).length;
  }

  getAllEventTypes(): string[] {
    return Array.from(this.subscribers.keys());
  }
}

