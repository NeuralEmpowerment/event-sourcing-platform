#!/usr/bin/env node

import { Command } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import { MemoryEventStoreClient } from '@event-sourcing-platform/typescript';
import { CommandBus } from './infrastructure/CommandBus';
import { CreateTaskCommand } from './contexts/tasks/create-task/CreateTaskCommand';
import { CompleteTaskCommand } from './contexts/tasks/complete-task/CompleteTaskCommand';
import { DeleteTaskCommand } from './contexts/tasks/delete-task/DeleteTaskCommand';
import { ListTasksHandler } from './contexts/tasks/list-tasks/ListTasksHandler';
import { TasksProjection } from './contexts/tasks/list-tasks/TasksProjection';
import { InMemoryEventStore } from './infrastructure/InMemoryEventStore';

/**
 * Todo List CLI Application
 * 
 * This demonstrates a complete VSA application with:
 * - Event sourcing
 * - CQRS pattern
 * - Vertical slices
 * - In-memory event store (using @event-sourcing-platform/typescript)
 */

// Initialize infrastructure
// Using MemoryEventStoreClient from event-sourcing library
const eventStoreClient = new MemoryEventStoreClient();

console.log('Using in-memory event store');

// Initialize command bus (routes commands to aggregates)
const commandBus = new CommandBus(eventStoreClient);

// Initialize query handlers (still using custom InMemoryEventStore for projections)
const legacyEventStore = new InMemoryEventStore();
const tasksProjection = new TasksProjection(legacyEventStore);
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

      // Create command object
      const command = new CreateTaskCommand(
        id,
        title,
        options.description,
        dueDate
      );

      await commandBus.send(command);

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
      // Create command object
      const command = new CompleteTaskCommand(id);
      await commandBus.send(command);
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
      // Create command object
      const command = new DeleteTaskCommand(id);
      await commandBus.send(command);
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

