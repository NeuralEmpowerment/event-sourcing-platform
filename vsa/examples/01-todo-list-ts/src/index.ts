#!/usr/bin/env node

import { Command } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import { InMemoryEventStore } from './infrastructure/InMemoryEventStore';
import { EventStoreAdapter } from './infrastructure/EventStoreAdapter';
import { CommandBus } from './infrastructure/CommandBus';
import { CreateTaskHandler } from './contexts/tasks/create-task/CreateTaskHandler';
import { CompleteTaskHandler } from './contexts/tasks/complete-task/CompleteTaskHandler';
import { DeleteTaskHandler } from './contexts/tasks/delete-task/DeleteTaskHandler';
import { ListTasksHandler } from './contexts/tasks/list-tasks/ListTasksHandler';
import { TasksProjection } from './contexts/tasks/list-tasks/TasksProjection';

/**
 * Todo List CLI Application
 * 
 * This demonstrates a complete VSA application with:
 * - Event sourcing
 * - CQRS pattern
 * - Vertical slices
 * - In-memory event store
 */

// Initialize infrastructure
// Use real event store if EVENT_STORE_ADDRESS is set, otherwise use in-memory
const eventStoreAddress = process.env.EVENT_STORE_ADDRESS || 'localhost:50051';
const useRealEventStore = process.env.USE_REAL_EVENT_STORE === 'true';

const eventStore = useRealEventStore
  ? new EventStoreAdapter({ address: eventStoreAddress, tenantId: 'todo-app' })
  : new InMemoryEventStore();

console.log(`Using ${useRealEventStore ? 'real' : 'in-memory'} event store`);
const commandBus = new CommandBus();

// Register command handlers
commandBus.register('CreateTask', new CreateTaskHandler(eventStore));
commandBus.register('CompleteTask', new CompleteTaskHandler(eventStore));
commandBus.register('DeleteTask', new DeleteTaskHandler(eventStore));

// Initialize query handlers
const tasksProjection = new TasksProjection(eventStore);
const listTasksHandler = new ListTasksHandler(tasksProjection);

// CLI Setup
const program = new Command();

program
  .name('todo')
  .description('Todo List Manager - VSA Example Application')
  .version('1.0.0');

// Create task command
program
  .command('create <title>')
  .description('Create a new task')
  .option('-d, --description <description>', 'Task description')
  .option('--due <date>', 'Due date (YYYY-MM-DD)')
  .action(async (title: string, options: any) => {
    try {
      const id = uuidv4();
      const dueDate = options.due ? new Date(options.due) : undefined;

      await commandBus.send('CreateTask', {
        id,
        title,
        description: options.description,
        dueDate,
      });

      console.log(`✅ Task created successfully!`);
      console.log(`   ID: ${id}`);
      console.log(`   Title: ${title}`);
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Complete task command
program
  .command('complete <id>')
  .description('Mark a task as completed')
  .action(async (id: string) => {
    try {
      await commandBus.send('CompleteTask', { id });
      console.log(`✅ Task ${id} marked as completed!`);
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Delete task command
program
  .command('delete <id>')
  .description('Delete a task')
  .action(async (id: string) => {
    try {
      await commandBus.send('DeleteTask', { id });
      console.log(`✅ Task ${id} deleted!`);
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// List tasks command
program
  .command('list')
  .description('List all tasks')
  .option('-a, --all', 'Include completed and deleted tasks')
  .option('-c, --completed', 'Include completed tasks')
  .action(async (options: any) => {
    try {
      const tasks = await listTasksHandler.handle({
        includeCompleted: options.all || options.completed,
        includeDeleted: options.all,
      });

      if (tasks.length === 0) {
        console.log('📝 No tasks found');
        return;
      }

      console.log(`\n📋 Tasks (${tasks.length}):\n`);
      
      for (const task of tasks) {
        const status = task.deleted ? '🗑️' : task.completed ? '✅' : '📌';
        const dueDate = task.dueDate ? ` (Due: ${task.dueDate.toLocaleDateString()})` : '';
        
        console.log(`${status} [${task.id.substring(0, 8)}] ${task.title}${dueDate}`);
        if (task.description) {
          console.log(`   ${task.description}`);
        }
        if (task.completed && task.completedAt) {
          console.log(`   Completed: ${task.completedAt.toLocaleString()}`);
        }
        console.log('');
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Parse and execute
program.parse();

