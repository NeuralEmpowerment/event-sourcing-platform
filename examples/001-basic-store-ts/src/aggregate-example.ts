/**
 * Example: Using Aggregates with Command Handlers
 * 
 * This example demonstrates the proper Event Sourcing pattern:
 * - Commands as classes with aggregateId
 * - @CommandHandler decorators on aggregate methods
 * - @EventSourcingHandler decorators for state updates
 * - Repository pattern for loading/saving aggregates
 */

import { randomUUID } from "crypto";

import {
    AggregateRoot,
    Aggregate,
    CommandHandler,
    EventSourcingHandler,
    BaseDomainEvent,
    EventSerializer,
    EventStoreClient,
    EventStoreClientFactory,
    MemoryEventStoreClient,
    RepositoryFactory,
} from "@event-sourcing-platform/typescript";

// ============================================================================
// Events - Domain events that describe what happened
// ============================================================================

class UserRegistered extends BaseDomainEvent {
    readonly eventType = "UserRegistered" as const;
    readonly schemaVersion = 1 as const;

    constructor(
        public userId: string,
        public email: string,
        public name: string
    ) {
        super();
    }
}

class UserEmailChanged extends BaseDomainEvent {
    readonly eventType = "UserEmailChanged" as const;
    readonly schemaVersion = 1 as const;

    constructor(
        public userId: string,
        public previousEmail: string,
        public newEmail: string
    ) {
        super();
    }
}

type UserEvent = UserRegistered | UserEmailChanged;

// ============================================================================
// Commands - Intentions to change state
// ============================================================================

class RegisterUserCommand {
    constructor(
        public readonly aggregateId: string,
        public readonly email: string,
        public readonly name: string
    ) { }
}

class ChangeUserEmailCommand {
    constructor(
        public readonly aggregateId: string,
        public readonly newEmail: string
    ) { }
}

// ============================================================================
// Aggregate - Business logic and state
// ============================================================================

@Aggregate("User")
class UserAggregate extends AggregateRoot<UserEvent> {
    private email: string | null = null;
    private name: string | null = null;

    // ------------------------------------------------------------------------
    // COMMAND HANDLERS - Validate business rules and emit events
    // ------------------------------------------------------------------------

    @CommandHandler("RegisterUserCommand")
    register(command: RegisterUserCommand): void {
        // Validation - business rules
        if (!command.email || !command.email.includes("@")) {
            throw new Error("Valid email is required");
        }
        if (!command.name || command.name.trim() === "") {
            throw new Error("Name is required");
        }
        if (this.id !== null) {
            throw new Error("User already registered");
        }

        // Initialize aggregate (required before raising events)
        this.initialize(command.aggregateId);

        // Apply event (which will call the event handler)
        this.apply(
            new UserRegistered(command.aggregateId, command.email, command.name)
        );
    }

    @CommandHandler("ChangeUserEmailCommand")
    changeEmail(command: ChangeUserEmailCommand): void {
        // Validation - business rules
        if (this.id === null) {
            throw new Error("Cannot change email for non-existent user");
        }
        if (!command.newEmail || !command.newEmail.includes("@")) {
            throw new Error("Valid email is required");
        }
        if (command.newEmail === this.email) {
            throw new Error("New email must be different from current email");
        }

        // Apply event
        this.apply(
            new UserEmailChanged(this.id, this.email!, command.newEmail)
        );
    }

    // ------------------------------------------------------------------------
    // EVENT SOURCING HANDLERS - Update state only (no validation)
    // ------------------------------------------------------------------------

    @EventSourcingHandler("UserRegistered")
    private onUserRegistered(event: UserRegistered): void {
        // State update only - no business logic
        this.email = event.email;
        this.name = event.name;
    }

    @EventSourcingHandler("UserEmailChanged")
    private onUserEmailChanged(event: UserEmailChanged): void {
        // State update only - no business logic
        this.email = event.newEmail;
    }

    // ------------------------------------------------------------------------
    // Getters (for demonstration)
    // ------------------------------------------------------------------------

    getEmail(): string | null {
        return this.email;
    }

    getName(): string | null {
        return this.name;
    }

    getAggregateType(): string {
        return "User";
    }
}

// ============================================================================
// Main Example
// ============================================================================

async function main(): Promise<void> {
    // Setup event store client
    console.log("🧪 Using in-memory event store client");
    const client = new MemoryEventStoreClient();
    await client.connect();

    // Register events for serialization
    EventSerializer.registerEvent(
        "UserRegistered",
        UserRegistered as unknown as new () => UserRegistered
    );
    EventSerializer.registerEvent(
        "UserEmailChanged",
        UserEmailChanged as unknown as new () => UserEmailChanged
    );

    // Create repository for UserAggregate
    const repositoryFactory = new RepositoryFactory(client);
    const repository = repositoryFactory.createRepository(
        () => new UserAggregate(),
        "User"
    );

    try {
        const userId = randomUUID();

        console.log("\n📋 Example: Aggregate with Command Handlers\n");
        console.log("─".repeat(60));

        // ------------------------------------------------------------------------
        // 1. Register a new user (creation command)
        // ------------------------------------------------------------------------

        console.log("\n1️⃣  Registering new user...");

        const registerCommand = new RegisterUserCommand(
            userId,
            "john@example.com",
            "John Doe"
        );

        let aggregate = new UserAggregate();
        (aggregate as any).handleCommand(registerCommand);

        console.log(`   ✓ User registered: ${aggregate.getName()} (${aggregate.getEmail()})`);
        console.log(`   ✓ Uncommitted events: ${aggregate.getUncommittedEvents().length}`);

        // Save to event store
        await repository.save(aggregate);
        console.log("   ✓ Saved to event store");

        // ------------------------------------------------------------------------
        // 2. Change user email (update command)
        // ------------------------------------------------------------------------

        console.log("\n2️⃣  Changing user email...");

        // Load aggregate from event store
        aggregate = (await repository.load(userId))!;
        console.log(`   ✓ Loaded aggregate (version: ${aggregate.version})`);
        console.log(`   ✓ Current email: ${aggregate.getEmail()}`);

        const changeEmailCommand = new ChangeUserEmailCommand(
            userId,
            "john.doe@example.com"
        );

        (aggregate as any).handleCommand(changeEmailCommand);

        console.log(`   ✓ Email changed to: ${aggregate.getEmail()}`);
        console.log(`   ✓ Uncommitted events: ${aggregate.getUncommittedEvents().length}`);

        // Save to event store
        await repository.save(aggregate);
        console.log("   ✓ Saved to event store");

        // ------------------------------------------------------------------------
        // 3. Demonstrate event sourcing (rehydration)
        // ------------------------------------------------------------------------

        console.log("\n3️⃣  Rehydrating aggregate from events...");

        const rehydratedAggregate = (await repository.load(userId))!;
        console.log(`   ✓ Loaded aggregate (version: ${rehydratedAggregate.version})`);
        console.log(`   ✓ Email: ${rehydratedAggregate.getEmail()}`);
        console.log(`   ✓ Name: ${rehydratedAggregate.getName()}`);
        console.log(`   ✓ No uncommitted events: ${rehydratedAggregate.getUncommittedEvents().length}`);

        // ------------------------------------------------------------------------
        // 4. Read events from stream
        // ------------------------------------------------------------------------

        console.log("\n4️⃣  Reading events from stream...");
        const streamName = `User-${userId}`;
        const events = await client.readEvents(streamName);

        console.log(`   ✓ Stream contains ${events.length} events:`);
        events.forEach((envelope, idx) => {
            console.log(
                `      ${idx + 1}. ${envelope.event.eventType} (nonce: ${envelope.metadata.aggregateNonce})`
            );
        });

        // ------------------------------------------------------------------------
        // 5. Demonstrate business rule validation
        // ------------------------------------------------------------------------

        console.log("\n5️⃣  Testing business rule validation...");

        try {
            // Try to register user again (should fail)
            const duplicateAggregate = (await repository.load(userId))!;
            const duplicateCommand = new RegisterUserCommand(
                userId,
                "duplicate@example.com",
                "Duplicate"
            );
            (duplicateAggregate as any).handleCommand(duplicateCommand);
            console.log("   ❌ Should have thrown error!");
        } catch (error) {
            console.log(`   ✓ Correctly rejected: ${(error as Error).message}`);
        }

        try {
            // Try to change to same email (should fail)
            const sameEmailAggregate = (await repository.load(userId))!;
            const sameEmailCommand = new ChangeUserEmailCommand(
                userId,
                sameEmailAggregate.getEmail()!
            );
            (sameEmailAggregate as any).handleCommand(sameEmailCommand);
            console.log("   ❌ Should have thrown error!");
        } catch (error) {
            console.log(`   ✓ Correctly rejected: ${(error as Error).message}`);
        }

        console.log("\n" + "─".repeat(60));
        console.log("\n✨ Key Takeaways:");
        console.log("   • Commands express intent (@CommandHandler)");
        console.log("   • Events record what happened (@EventSourcingHandler)");
        console.log("   • Command handlers validate business rules");
        console.log("   • Event handlers update state only");
        console.log("   • Aggregates are loaded/saved via repository");
        console.log("   • Event sourcing enables time travel & audit trail");

    } finally {
        await client.disconnect();
    }

    console.log("\n🎉 Example complete\n");
}

if (require.main === module) {
    main().catch((error) => {
        console.error("❌ Example failed", error);
        process.exitCode = 1;
    });
}

