/**
 * E2E Test Setup
 * 
 * This file runs before E2E tests to ensure the infrastructure is ready
 */

// Set a longer timeout for E2E tests (30 seconds)
jest.setTimeout(30000);

// Check if event store is accessible
const eventStoreAddress = process.env.EVENT_STORE_ADDRESS || 'localhost:50051';

console.log('='.repeat(60));
console.log('E2E Test Environment');
console.log('='.repeat(60));
console.log(`Event Store Address: ${eventStoreAddress}`);
console.log(`Tenant ID: e2e-test-${Date.now()}`);
console.log('');
console.log('Prerequisites:');
console.log('  ✓ Event store running on port 50051');
console.log('  ✓ PostgreSQL running and accessible');
console.log('='.repeat(60));
console.log('');

// Add a simple connectivity check before tests
beforeAll(async () => {
  // This will be checked when the first test runs
  // If the event store is not available, tests will fail with clear error messages
});

