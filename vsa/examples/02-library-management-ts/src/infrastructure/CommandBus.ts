/**
 * Command Bus
 * Dispatches commands to their registered handlers
 */

export interface Command {
  type: string;
  payload: unknown;
}

export interface CommandHandler {
  handle(command: Command): Promise<void>;
}

export class CommandBus {
  private handlers = new Map<string, CommandHandler>();

  register(commandType: string, handler: CommandHandler): void {
    if (this.handlers.has(commandType)) {
      throw new Error(`Handler already registered for command: ${commandType}`);
    }
    this.handlers.set(commandType, handler);
  }

  async dispatch(command: Command): Promise<void> {
    const handler = this.handlers.get(command.type);
    if (!handler) {
      throw new Error(`No handler registered for command: ${command.type}`);
    }
    await handler.handle(command);
  }
}

