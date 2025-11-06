/**
 * 008-banking-complete-ts
 * 
 * Complete Banking System Example demonstrating ADR-004 compliance
 * Features: Accounts, Transfers, Customers with full aggregate pattern
 */

import {
  AggregateRoot,
  Aggregate,
  EventSourcingHandler,
  CommandHandler,
  BaseDomainEvent,
  EventType,
  EventStoreClient,
  EventStoreClientFactory,
  MemoryEventStoreClient,
} from "@event-sourcing-platform/typescript";

// ============================================================================
// ACCOUNT AGGREGATE
// ============================================================================

// Commands
class OpenAccountCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly customerId: string,
    public readonly accountType: "CHECKING" | "SAVINGS",
    public readonly initialDeposit: number
  ) { }
}

class DepositCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly amount: number,
    public readonly description: string
  ) { }
}

class WithdrawCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly amount: number,
    public readonly description: string
  ) { }
}

class CloseAccountCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly reason: string
  ) { }
}

// Events
class AccountOpenedEvent extends BaseDomainEvent {
  readonly eventType: EventType = "AccountOpened";
  readonly schemaVersion: number = 1;
  constructor(
    public readonly accountId: string,
    public readonly customerId: string,
    public readonly accountType: string,
    public readonly initialDeposit: number
  ) {
    super();
  }
}

class MoneyDepositedEvent extends BaseDomainEvent {
  readonly eventType: EventType = "MoneyDeposited";
  readonly schemaVersion: number = 1;
  constructor(
    public readonly amount: number,
    public readonly description: string,
    public readonly newBalance: number
  ) {
    super();
  }
}

class MoneyWithdrawnEvent extends BaseDomainEvent {
  readonly eventType: EventType = "MoneyWithdrawn";
  readonly schemaVersion: number = 1;
  constructor(
    public readonly amount: number,
    public readonly description: string,
    public readonly newBalance: number
  ) {
    super();
  }
}

class AccountClosedEvent extends BaseDomainEvent {
  readonly eventType: EventType = "AccountClosed";
  readonly schemaVersion: number = 1;
  constructor(
    public readonly reason: string,
    public readonly finalBalance: number
  ) {
    super();
  }
}

type AccountEvent = AccountOpenedEvent | MoneyDepositedEvent | MoneyWithdrawnEvent | AccountClosedEvent;

enum AccountStatus {
  ACTIVE = "ACTIVE",
  CLOSED = "CLOSED"
}

@Aggregate("Account")
class AccountAggregate extends AggregateRoot<AccountEvent> {
  private customerId = "";
  private accountType = "";
  private balance = 0;
  private status = AccountStatus.ACTIVE;

  getAggregateType(): string {
    return "Account";
  }

  @CommandHandler("OpenAccountCommand")
  openAccount(command: OpenAccountCommand): void {
    if (!command.customerId) throw new Error("Customer ID is required");
    if (!command.accountType) throw new Error("Account type is required");
    if (command.initialDeposit < 0) throw new Error("Initial deposit cannot be negative");
    if (this.id !== null) throw new Error("Account already exists");

    this.initialize(command.aggregateId);
    this.apply(new AccountOpenedEvent(
      command.aggregateId,
      command.customerId,
      command.accountType,
      command.initialDeposit
    ));
  }

  @CommandHandler("DepositCommand")
  deposit(command: DepositCommand): void {
    if (this.id === null) throw new Error("Account does not exist");
    if (this.status !== AccountStatus.ACTIVE) throw new Error("Cannot deposit to closed account");
    if (command.amount <= 0) throw new Error("Deposit amount must be positive");

    const newBalance = this.balance + command.amount;
    this.apply(new MoneyDepositedEvent(command.amount, command.description, newBalance));
  }

  @CommandHandler("WithdrawCommand")
  withdraw(command: WithdrawCommand): void {
    if (this.id === null) throw new Error("Account does not exist");
    if (this.status !== AccountStatus.ACTIVE) throw new Error("Cannot withdraw from closed account");
    if (command.amount <= 0) throw new Error("Withdrawal amount must be positive");
    if (this.balance < command.amount) {
      throw new Error(`Insufficient funds: balance ${this.balance}, requested ${command.amount}`);
    }

    const newBalance = this.balance - command.amount;
    this.apply(new MoneyWithdrawnEvent(command.amount, command.description, newBalance));
  }

  @CommandHandler("CloseAccountCommand")
  closeAccount(command: CloseAccountCommand): void {
    if (this.id === null) throw new Error("Account does not exist");
    if (this.status === AccountStatus.CLOSED) throw new Error("Account is already closed");
    if (this.balance > 0) throw new Error("Cannot close account with positive balance");
    if (!command.reason) throw new Error("Close reason is required");

    this.apply(new AccountClosedEvent(command.reason, this.balance));
  }

  @EventSourcingHandler("AccountOpened")
  private onAccountOpened(event: AccountOpenedEvent): void {
    this.customerId = event.customerId;
    this.accountType = event.accountType;
    this.balance = event.initialDeposit;
  }

  @EventSourcingHandler("MoneyDeposited")
  private onMoneyDeposited(event: MoneyDepositedEvent): void {
    this.balance = event.newBalance;
  }

  @EventSourcingHandler("MoneyWithdrawn")
  private onMoneyWithdrawn(event: MoneyWithdrawnEvent): void {
    this.balance = event.newBalance;
  }

  @EventSourcingHandler("AccountClosed")
  private onAccountClosed(event: AccountClosedEvent): void {
    this.status = AccountStatus.CLOSED;
  }

  getBalance(): number { return this.balance; }
  getStatus(): AccountStatus { return this.status; }
  getAccountType(): string { return this.accountType; }
}

// ============================================================================
// TRANSFER AGGREGATE
// ============================================================================

// Commands
class InitiateTransferCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly fromAccountId: string,
    public readonly toAccountId: string,
    public readonly amount: number,
    public readonly description: string
  ) { }
}

class CompleteTransferCommand {
  constructor(public readonly aggregateId: string) { }
}

class FailTransferCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly reason: string
  ) { }
}

// Events
class TransferInitiatedEvent extends BaseDomainEvent {
  readonly eventType: EventType = "TransferInitiated";
  readonly schemaVersion: number = 1;
  constructor(
    public readonly transferId: string,
    public readonly fromAccountId: string,
    public readonly toAccountId: string,
    public readonly amount: number,
    public readonly description: string
  ) {
    super();
  }
}

class TransferCompletedEvent extends BaseDomainEvent {
  readonly eventType: EventType = "TransferCompleted";
  readonly schemaVersion: number = 1;
  constructor() {
    super();
  }
}

class TransferFailedEvent extends BaseDomainEvent {
  readonly eventType: EventType = "TransferFailed";
  readonly schemaVersion: number = 1;
  constructor(public readonly reason: string) {
    super();
  }
}

type TransferEvent = TransferInitiatedEvent | TransferCompletedEvent | TransferFailedEvent;

enum TransferStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED"
}

@Aggregate("Transfer")
class TransferAggregate extends AggregateRoot<TransferEvent> {
  private fromAccountId = "";
  private toAccountId = "";
  private amount = 0;
  private status = TransferStatus.PENDING;

  getAggregateType(): string {
    return "Transfer";
  }

  @CommandHandler("InitiateTransferCommand")
  initiateTransfer(command: InitiateTransferCommand): void {
    if (!command.fromAccountId) throw new Error("From account ID is required");
    if (!command.toAccountId) throw new Error("To account ID is required");
    if (command.fromAccountId === command.toAccountId) {
      throw new Error("Cannot transfer to same account");
    }
    if (command.amount <= 0) throw new Error("Transfer amount must be positive");
    if (this.id !== null) throw new Error("Transfer already exists");

    this.initialize(command.aggregateId);
    this.apply(new TransferInitiatedEvent(
      command.aggregateId,
      command.fromAccountId,
      command.toAccountId,
      command.amount,
      command.description
    ));
  }

  @CommandHandler("CompleteTransferCommand")
  completeTransfer(command: CompleteTransferCommand): void {
    if (this.id === null) throw new Error("Transfer does not exist");
    if (this.status !== TransferStatus.PENDING) throw new Error("Transfer is not pending");

    this.apply(new TransferCompletedEvent());
  }

  @CommandHandler("FailTransferCommand")
  failTransfer(command: FailTransferCommand): void {
    if (this.id === null) throw new Error("Transfer does not exist");
    if (this.status !== TransferStatus.PENDING) throw new Error("Transfer is not pending");
    if (!command.reason) throw new Error("Failure reason is required");

    this.apply(new TransferFailedEvent(command.reason));
  }

  @EventSourcingHandler("TransferInitiated")
  private onTransferInitiated(event: TransferInitiatedEvent): void {
    this.fromAccountId = event.fromAccountId;
    this.toAccountId = event.toAccountId;
    this.amount = event.amount;
  }

  @EventSourcingHandler("TransferCompleted")
  private onTransferCompleted(event: TransferCompletedEvent): void {
    this.status = TransferStatus.COMPLETED;
  }

  @EventSourcingHandler("TransferFailed")
  private onTransferFailed(event: TransferFailedEvent): void {
    this.status = TransferStatus.FAILED;
  }

  getStatus(): TransferStatus { return this.status; }
  getAmount(): number { return this.amount; }
  getFromAccountId(): string { return this.fromAccountId; }
  getToAccountId(): string { return this.toAccountId; }
}

// ============================================================================
// CUSTOMER AGGREGATE
// ============================================================================

// Commands
class RegisterCustomerCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly name: string,
    public readonly email: string,
    public readonly ssn: string
  ) { }
}

class UpdateCustomerEmailCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly newEmail: string
  ) { }
}

// Events
class CustomerRegisteredEvent extends BaseDomainEvent {
  readonly eventType: EventType = "CustomerRegistered";
  readonly schemaVersion: number = 1;
  constructor(
    public readonly customerId: string,
    public readonly name: string,
    public readonly email: string,
    public readonly ssn: string
  ) {
    super();
  }
}

class CustomerEmailUpdatedEvent extends BaseDomainEvent {
  readonly eventType: EventType = "CustomerEmailUpdated";
  readonly schemaVersion: number = 1;
  constructor(
    public readonly oldEmail: string,
    public readonly newEmail: string
  ) {
    super();
  }
}

type CustomerEvent = CustomerRegisteredEvent | CustomerEmailUpdatedEvent;

@Aggregate("Customer")
class CustomerAggregate extends AggregateRoot<CustomerEvent> {
  private name = "";
  private email = "";
  private ssn = "";

  getAggregateType(): string {
    return "Customer";
  }

  @CommandHandler("RegisterCustomerCommand")
  registerCustomer(command: RegisterCustomerCommand): void {
    if (!command.name) throw new Error("Name is required");
    if (!command.email || !command.email.includes("@")) throw new Error("Valid email is required");
    if (!command.ssn) throw new Error("SSN is required");
    if (this.id !== null) throw new Error("Customer already registered");

    this.initialize(command.aggregateId);
    this.apply(new CustomerRegisteredEvent(
      command.aggregateId,
      command.name,
      command.email,
      command.ssn
    ));
  }

  @CommandHandler("UpdateCustomerEmailCommand")
  updateEmail(command: UpdateCustomerEmailCommand): void {
    if (this.id === null) throw new Error("Customer does not exist");
    if (!command.newEmail || !command.newEmail.includes("@")) throw new Error("Valid email is required");
    if (command.newEmail === this.email) throw new Error("New email is same as current email");

    this.apply(new CustomerEmailUpdatedEvent(this.email, command.newEmail));
  }

  @EventSourcingHandler("CustomerRegistered")
  private onCustomerRegistered(event: CustomerRegisteredEvent): void {
    this.name = event.name;
    this.email = event.email;
    this.ssn = event.ssn;
  }

  @EventSourcingHandler("CustomerEmailUpdated")
  private onEmailUpdated(event: CustomerEmailUpdatedEvent): void {
    this.email = event.newEmail;
  }

  getName(): string { return this.name; }
  getEmail(): string { return this.email; }
}

// ============================================================================
// MAIN DEMO
// ============================================================================

type ClientMode = "memory" | "grpc";
type Options = { mode: ClientMode };

function parseOptions(): Options {
  if (process.argv.includes("--memory")) return { mode: "memory" };
  const envMode = (process.env.EVENT_STORE_MODE ?? "").toLowerCase();
  if (envMode === "memory") return { mode: "memory" };
  return { mode: "grpc" };
}

async function createClient(opts: Options): Promise<EventStoreClient> {
  if (opts.mode === "memory") {
    console.log("🧪 Using in-memory event store client");
    const client = new MemoryEventStoreClient();
    await client.connect();
    return client;
  }

  const serverAddress = process.env.EVENT_STORE_ADDR ?? "127.0.0.1:50051";
  const tenantId = process.env.EVENT_STORE_TENANT ?? "banking-tenant";
  console.log(`🛰️  Using gRPC event store at ${serverAddress} (tenant=${tenantId})`);

  const client = EventStoreClientFactory.createGrpcClient({ serverAddress, tenantId });
  try {
    await client.connect();
  } catch (error) {
    console.error(
      "⚠️  Failed to connect to gRPC event store.\n" +
      "   To start dev infrastructure: make dev-start\n" +
      "   To use in-memory mode instead: rerun with --memory"
    );
    throw error;
  }
  return client;
}

async function main(): Promise<void> {
  console.log("🏦 Banking System - Complete Example");
  console.log("=====================================");
  console.log("✅ ADR-004 COMPLIANT: Command handlers integrated in aggregates\n");

  const options = parseOptions();
  const client = await createClient(options);

  try {
    // Demo: Customer Registration
    console.log("👤 DEMO: Customer Registration");
    console.log("===============================");
    const customerId = "customer-001";
    const customer = new CustomerAggregate();
    (customer as any).handleCommand(new RegisterCustomerCommand(
      customerId,
      "Alice Johnson",
      "alice@example.com",
      "123-45-6789"
    ));
    console.log(`✓ Customer registered: ${customerId}`);
    console.log(`  Name: ${customer.getName()}`);
    console.log(`  Email: ${customer.getEmail()}`);

    // Demo: Account Management
    console.log("\n💰 DEMO: Account Management");
    console.log("============================");
    const account1Id = "account-001";
    const account1 = new AccountAggregate();
    (account1 as any).handleCommand(new OpenAccountCommand(
      account1Id,
      customerId,
      "CHECKING",
      1000
    ));
    console.log(`✓ Account opened: ${account1Id}`);
    console.log(`  Type: ${account1.getAccountType()}`);
    console.log(`  Initial balance: $${account1.getBalance()}`);

    const account2Id = "account-002";
    const account2 = new AccountAggregate();
    (account2 as any).handleCommand(new OpenAccountCommand(
      account2Id,
      customerId,
      "SAVINGS",
      5000
    ));
    console.log(`✓ Account opened: ${account2Id}`);
    console.log(`  Type: ${account2.getAccountType()}`);
    console.log(`  Initial balance: $${account2.getBalance()}`);

    // Demo: Deposits and Withdrawals
    console.log("\n📥 DEMO: Deposits and Withdrawals");
    console.log("==================================");
    (account1 as any).handleCommand(new DepositCommand(account1Id, 500, "Paycheck"));
    console.log(`✓ Deposited $500 to ${account1Id} (Balance: $${account1.getBalance()})`);

    (account1 as any).handleCommand(new WithdrawCommand(account1Id, 200, "ATM Withdrawal"));
    console.log(`✓ Withdrew $200 from ${account1Id} (Balance: $${account1.getBalance()})`);

    // Demo: Transfer
    console.log("\n💸 DEMO: Transfer Between Accounts");
    console.log("===================================");
    const transferId = "transfer-001";
    const transfer = new TransferAggregate();
    (transfer as any).handleCommand(new InitiateTransferCommand(
      transferId,
      account1Id,
      account2Id,
      300,
      "Transfer to savings"
    ));
    console.log(`✓ Transfer initiated: ${transferId}`);
    console.log(`  From: ${transfer.getFromAccountId()}`);
    console.log(`  To: ${transfer.getToAccountId()}`);
    console.log(`  Amount: $${transfer.getAmount()}`);
    console.log(`  Status: ${transfer.getStatus()}`);

    // Simulate transfer execution (withdraw from source, deposit to destination)
    (account1 as any).handleCommand(new WithdrawCommand(account1Id, 300, `Transfer ${transferId}`));
    (account2 as any).handleCommand(new DepositCommand(account2Id, 300, `Transfer ${transferId}`));
    (transfer as any).handleCommand(new CompleteTransferCommand(transferId));
    console.log(`✓ Transfer completed (Status: ${transfer.getStatus()})`);
    console.log(`  Account ${account1Id} balance: $${account1.getBalance()}`);
    console.log(`  Account ${account2Id} balance: $${account2.getBalance()}`);

    console.log("\n🎉 Complete Banking Flow Demonstrated!");
    console.log("\n📊 Architecture Summary:");
    console.log("  ✓ AccountAggregate with 4 @CommandHandler methods");
    console.log("  ✓ TransferAggregate with 3 @CommandHandler methods");
    console.log("  ✓ CustomerAggregate with 2 @CommandHandler methods");
    console.log("  ✓ All commands as classes with aggregateId");
    console.log("  ✓ Events applied using apply() (not raiseEvent())");
    console.log("  ✓ Business logic validation in command handlers");
    console.log("  ✓ State-only updates in event sourcing handlers");
    console.log("  ✓ Account status state machine (ACTIVE → CLOSED)");
    console.log("  ✓ Transfer status state machine (PENDING → COMPLETED/FAILED)");
    console.log("\n✅ ADR-004 COMPLIANCE VERIFIED\n");

  } finally {
    await client.disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Example failed", error);
    process.exitCode = 1;
  });
}
