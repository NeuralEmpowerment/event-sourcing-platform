/**
 * Command Bus - Routes commands to aggregates
 * 
 * This implementation uses the aggregate pattern:
 * - Commands are dispatched to aggregate instances
 * - Aggregates handle commands via @CommandHandler decorated methods
 * - Repository loads/saves aggregates with event store
 */

import { RepositoryFactory, EventStoreClient, Repository } from '@event-sourcing-platform/typescript';
import { TaskAggregate } from '../contexts/tasks/create-task/TaskAggregate';
import { CreateTaskCommand } from '../contexts/tasks/create-task/CreateTaskCommand';
import { CompleteTaskCommand } from '../contexts/tasks/complete-task/CompleteTaskCommand';
import { DeleteTaskCommand } from '../contexts/tasks/delete-task/DeleteTaskCommand';

type Command = CreateTaskCommand | CompleteTaskCommand | DeleteTaskCommand;

export class CommandBus {
  private repository: Repository<TaskAggregate>;

  constructor(eventStoreClient: EventStoreClient) {
    // Create repository for TaskAggregate
    const repositoryFactory = new RepositoryFactory(eventStoreClient);
    this.repository = repositoryFactory.createRepository(
      () => new TaskAggregate(),
      'Task'
    );
  }

  /**
   * Send a command to the appropriate aggregate
   */
  async send(command: Command): Promise<void> {
    try {
      // Load or create aggregate
      let aggregate = await this.repository.load(command.aggregateId);

      if (!aggregate) {
        // Create new aggregate for creation commands
        aggregate = new TaskAggregate();
      }

      // Dispatch command to aggregate (uses @CommandHandler decorators)
      (aggregate as any).handleCommand(command);

      // Save aggregate (persists uncommitted events)
      await this.repository.save(aggregate);
    } catch (error) {
      console.error(`Error handling command ${command.constructor.name}:`, error);
      throw error;
    }
  }
}
