#!/usr/bin/env node

import { LibraryManagementApp } from './app';

async function main() {
  console.log('🏛️  Library Management System');
  console.log('================================');
  console.log('');

  const app = new LibraryManagementApp();

  console.log('✅ Application initialized');
  console.log(`📡 Event Store: ${process.env.EVENT_STORE_ADDRESS || 'localhost:50051'}`);
  console.log(`🏢 Tenant: ${process.env.TENANT_ID || 'library-management'}`);
  console.log('');
  console.log('Registered Commands:');
  console.log('  - AddBook, RemoveBook (Catalog)');
  console.log('  - BorrowBook, ReturnBook, MarkOverdue (Lending)');
  console.log('  - SendNotification (Notifications)');
  console.log('');
  console.log('Integration Events:');
  console.log(`  - ${app.eventBus.getAllEventTypes().join(', ')}`);
  console.log('');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n⏹️  Shutting down...');
    await app.close();
    process.exit(0);
  });

  console.log('Ready! Press Ctrl+C to exit.');
}

main().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});

