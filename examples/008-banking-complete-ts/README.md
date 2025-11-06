# 008-banking-complete-ts — Complete Banking System

**✅ ADR-004 COMPLIANT:** Demonstrates proper aggregate-based command handling with decorators.

A comprehensive banking system example showcasing three fully-featured aggregates with state machines and transfers, following ADR-004 architectural patterns.

## Features

### 🏦 Three Complete Aggregates

1. **AccountAggregate** - Bank account management
   - `@CommandHandler` `openAccount()` - Open new checking/savings account
   - `@CommandHandler` `deposit()` - Deposit money
   - `@CommandHandler` `withdraw()` - Withdraw money with balance validation
   - `@CommandHandler` `closeAccount()` - Close account (requires zero balance)
   - State Machine: `ACTIVE` → `CLOSED`

2. **TransferAggregate** - Money transfer management
   - `@CommandHandler` `initiateTransfer()` - Start transfer between accounts
   - `@CommandHandler` `completeTransfer()` - Mark transfer as successful
   - `@CommandHandler` `failTransfer()` - Mark transfer as failed
   - State Machine: `PENDING` → `COMPLETED` / `FAILED`

3. **CustomerAggregate** - Customer profile management
   - `@CommandHandler` `registerCustomer()` - Register new customer
   - `@CommandHandler` `updateEmail()` - Update customer email

### 🎯 Demonstrates

- ✅ Commands as classes (not interfaces) with `aggregateId`
- ✅ `@Aggregate` decorators on all aggregate classes
- ✅ `@CommandHandler` decorators for command processing
- ✅ `apply()` method for event emission (not `raiseEvent()`)
- ✅ `@EventSourcingHandler` for state updates
- ✅ Business validation in command handlers (insufficient funds, etc.)
- ✅ State-only updates in event sourcing handlers
- ✅ Complete banking flow: Customer → Accounts → Transfer
- ✅ Balance tracking and validation
- ✅ State machines for Account and Transfer status
- ✅ Account type handling (CHECKING vs SAVINGS)

## Run

```bash
# Memory mode (fast, no dependencies)
pnpm --filter ./examples/008-banking-complete-ts run start -- --memory

# gRPC mode (requires event store)
./dev-tools/dev start
pnpm --filter ./examples/008-banking-complete-ts run start
```

## Example Output

```
🏦 Banking System - Complete Example
=====================================
✅ ADR-004 COMPLIANT: Command handlers integrated in aggregates

👤 DEMO: Customer Registration
✓ Customer registered: customer-001
  Name: Alice Johnson
  Email: alice@example.com

💰 DEMO: Account Management
✓ Account opened: account-001
  Type: CHECKING
  Initial balance: $1000
✓ Account opened: account-002
  Type: SAVINGS
  Initial balance: $5000

📥 DEMO: Deposits and Withdrawals
✓ Deposited $500 to account-001 (Balance: $1500)
✓ Withdrew $200 from account-001 (Balance: $1300)

💸 DEMO: Transfer Between Accounts
✓ Transfer initiated: transfer-001
  From: account-001
  To: account-002
  Amount: $300
  Status: PENDING
✓ Transfer completed (Status: COMPLETED)
  Account account-001 balance: $1000
  Account account-002 balance: $5300

🎉 Complete Banking Flow Demonstrated!
✅ ADR-004 COMPLIANCE VERIFIED
```

## Architecture

All aggregates follow the ADR-004 pattern:

```typescript
@Aggregate("Account")
class AccountAggregate extends AggregateRoot<AccountEvent> {
  private balance = 0;
  private status = AccountStatus.ACTIVE;

  // Command Handler - validates and applies events
  @CommandHandler("WithdrawCommand")
  withdraw(command: WithdrawCommand): void {
    // 1. Validation
    if (this.status !== AccountStatus.ACTIVE) {
      throw new Error("Cannot withdraw from closed account");
    }
    if (this.balance < command.amount) {
      throw new Error(`Insufficient funds`);
    }
    
    // 2. Apply event
    const newBalance = this.balance - command.amount;
    this.apply(new MoneyWithdrawnEvent(command.amount, newBalance));
  }

  // Event Sourcing Handler - updates state only
  @EventSourcingHandler("MoneyWithdrawn")
  private onMoneyWithdrawn(event: MoneyWithdrawnEvent): void {
    this.balance = event.newBalance;
  }
}
```

## Key Patterns

### Insufficient Funds Validation

The `AccountAggregate` validates balance before withdrawals:

```typescript
if (this.balance < command.amount) {
  throw new Error(`Insufficient funds: balance ${this.balance}, requested ${command.amount}`);
}
```

### Transfer Flow

1. Initiate transfer (creates TransferAggregate)
2. Withdraw from source account
3. Deposit to destination account
4. Complete transfer (updates transfer status)

### State Machines

- **Account**: `ACTIVE` → `CLOSED`
- **Transfer**: `PENDING` → `COMPLETED` or `FAILED`

## Learn More

- **ADR-004**: [docs/adrs/ADR-004-command-handlers-in-aggregates.md](../../docs/adrs/ADR-004-command-handlers-in-aggregates.md)
- **Event Sourcing Patterns**: See other examples in `/examples`
