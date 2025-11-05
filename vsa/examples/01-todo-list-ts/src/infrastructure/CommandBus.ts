/**
 * Command Bus - Routes commands to their handlers
 * 
 * This is a simple in-process command bus for demonstration.
 * In larger systems, you might use:
 * - Message queues (RabbitMQ, Kafka)
 * - Service buses (Azure Service Bus, AWS SQS)
 * - HTTP APIs
 */
export type CommandHandler<T = any> = {
  handle(command: T): Promise<void>;
};

export class CommandBus {
  private handlers: Map<string, CommandHandler> = new Map();

  /**
   * Register a command handler
   */
  register(commandType: string, handler: CommandHandler): void {
    if (this.handlers.has(commandType)) {
      throw new Error(`Handler for ${commandType} is already registered`);
    }
    this.handlers.set(commandType, handler);
  }

  /**
   * Send a command to its handler
   */
  async send<T>(commandType: string, command: T): Promise<void> {
    const handler = this.handlers.get(commandType);
    
    if (!handler) {
      throw new Error(`No handler registered for command type: ${commandType}`);
    }

    try {
      await handler.handle(command);
    } catch (error) {
      console.error(`Error handling command ${commandType}:`, error);
      throw error;
    }
  }
}

