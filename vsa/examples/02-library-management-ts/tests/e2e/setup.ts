/**
 * E2E Test Setup for Library Management System
 */

// Set a longer timeout for E2E tests (60 seconds)
jest.setTimeout(60000);

const eventStoreAddress = process.env.EVENT_STORE_ADDRESS || 'localhost:50051';

console.log('='.repeat(70));
console.log('Library Management E2E Test Environment');
console.log('='.repeat(70));
console.log(`Event Store Address: ${eventStoreAddress}`);
console.log(`Tenant ID: e2e-library-${Date.now()}`);
console.log('');
console.log('Testing:');
console.log('  ✓ Catalog context (add-book, remove-book)');
console.log('  ✓ Lending context (borrow-book, return-book, mark-overdue)');
console.log('  ✓ Notifications context (send-notification)');
console.log('  ✓ Integration events across contexts');
console.log('');
console.log('Prerequisites:');
console.log('  ✓ Event store running on port 50051');
console.log('  ✓ PostgreSQL running and accessible');
console.log('='.repeat(70));
console.log('');

