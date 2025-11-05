# Banking System Architecture (⭐⭐⭐⭐ Expert - Python)

> **Note:** This is a detailed architectural outline demonstrating enterprise patterns in Python.  
> Use this as a reference for building mission-critical systems with VSA, CQRS, and Python.

## Overview

A banking system demonstrating:
- **Python implementation** with VSA
- **CQRS pattern** (Command Query Responsibility Segregation)
- **Saga orchestration** for transfers
- **Fraud detection** with real-time processing
- **Event sourcing** with PostgreSQL
- **FastAPI** backend
- **Security and compliance** patterns

## Bounded Contexts

### 1. Accounts Context
**Responsibility:** Account management and lifecycle

**Features:**
- Open account
- Close account
- Update account details
- Freeze/Unfreeze account
- Account statements

**Domain Events:**
- `AccountOpened`
- `AccountClosed`
- `AccountFrozen`
- `AccountUnfrozen`
- `AccountDetailsUpdated`

**Integration Events Published:**
- `AccountOpened` → Transactions, Reporting
- `AccountClosed` → Transactions
- `AccountFrozen` → Transactions

### 2. Transactions Context (Saga Coordinator)
**Responsibility:** Money transfers and transaction processing

**Features:**
- Transfer money (saga orchestration)
- Deposit money
- Withdraw money
- Transaction history
- Balance inquiry

**Domain Events:**
- `TransferInitiated`
- `MoneyDebited`
- `MoneyCredited`
- `TransferCompleted`
- `TransferFailed`

**Integration Events Published:**
- `MoneyTransferred` → FraudDetection, Reporting
- `MoneyDeposited` → Reporting
- `MoneyWithdrawn` → FraudDetection, Reporting

**Integration Events Subscribed:**
- `AccountOpened` (from Accounts)
- `AccountClosed` (from Accounts)
- `AccountFrozen` (from Accounts)
- `FraudDetected` (from FraudDetection)

### 3. Fraud Detection Context
**Responsibility:** Real-time fraud monitoring

**Features:**
- Monitor transactions
- Flag suspicious activity
- Block fraudulent transactions
- Risk scoring
- Pattern detection

**Domain Events:**
- `TransactionAnalyzed`
- `SuspiciousActivityDetected`
- `FraudDetected`
- `TransactionBlocked`

**Integration Events Published:**
- `FraudDetected` → Transactions, Accounts
- `TransactionBlocked` → Transactions

**Integration Events Subscribed:**
- `MoneyTransferred` (from Transactions)
- `MoneyWithdrawn` (from Transactions)

### 4. Reporting Context (CQRS Read Side)
**Responsibility:** Reports, analytics, and read models

**Features:**
- Account statements
- Transaction reports
- Analytics dashboard
- Audit logs
- Compliance reports

**Domain Events:** None (read-only context)

**Integration Events Subscribed:**
- `AccountOpened` (from Accounts)
- `MoneyTransferred` (from Transactions)
- `MoneyDeposited` (from Transactions)
- All events for audit log

## Saga Pattern: Money Transfer

### Happy Path Flow

```python
1. User initiates transfer
   └─> Transactions: TransferMoneyCommand

2. Transactions: Debit from account
   └─> Accounts: DebitAccountCommand
   └─> Domain Event: MoneyDebited

3. Transactions: Credit to account
   └─> Accounts: CreditAccountCommand
   └─> Domain Event: MoneyCredited

4. FraudDetection: Check transaction
   └─> Async analysis
   └─> If suspicious: FraudDetected event

5. If fraud detected:
   └─> Compensation: Reverse debit
   └─> Compensation: Reverse credit
   └─> Integration Event: TransferFailed

6. If no fraud:
   └─> Integration Event: MoneyTransferred
   └─> ✅ Transfer complete!
```

### Saga Implementation

```python
# transactions/transfer_money/TransferMoneySaga.py
class TransferMoneySaga:
    def __init__(self, event_store, event_bus, accounts_service):
        self.state = SagaState.STARTED
        self.compensations: List[Callable] = []
        
    async def execute(self, transfer: Transfer) -> None:
        try:
            # Step 1: Debit source account
            await self.debit_account(transfer)
            self.compensations.append(
                lambda: self.reverse_debit(transfer)
            )
            
            # Step 2: Credit destination account
            await self.credit_account(transfer)
            self.compensations.append(
                lambda: self.reverse_credit(transfer)
            )
            
            # Step 3: Check for fraud
            fraud_result = await self.check_fraud(transfer)
            if fraud_result.is_fraud:
                raise FraudDetectedException()
            
            # Step 4: Complete transfer
            await self.complete_transfer(transfer)
            self.state = SagaState.COMPLETED
            
        except Exception as e:
            await self.compensate()
            self.state = SagaState.FAILED
            raise
    
    async def compensate(self) -> None:
        # Execute compensations in reverse
        for compensation in reversed(self.compensations):
            await compensation()
```

## CQRS Pattern

### Command Side (Write Model)

```python
# accounts/open_account/OpenAccountHandler.py
class OpenAccountHandler:
    def __init__(self, event_store: EventStore):
        self.event_store = event_store
    
    async def handle(self, command: OpenAccountCommand) -> None:
        # Business logic
        # Validate
        # Create events
        # Store events
        
        event = AccountOpenedEvent(
            account_id=command.account_id,
            owner_name=command.owner_name,
            opened_at=datetime.now()
        )
        
        await self.event_store.append(command.account_id, event)
```

### Query Side (Read Model)

```python
# reporting/get_account_statement/AccountStatementQuery.py
class AccountStatementQuery:
    def __init__(self, read_db: ReadDatabase):
        self.read_db = read_db
    
    async def execute(self, account_id: str, 
                     from_date: datetime, 
                     to_date: datetime) -> AccountStatement:
        # Query optimized read model
        # No event sourcing here - direct database query
        
        transactions = await self.read_db.query("""
            SELECT * FROM account_transactions
            WHERE account_id = $1
            AND transaction_date BETWEEN $2 AND $3
            ORDER BY transaction_date DESC
        """, account_id, from_date, to_date)
        
        return AccountStatement(
            account_id=account_id,
            transactions=transactions,
            balance=self.calculate_balance(transactions)
        )
```

### Projection (Building Read Models)

```python
# reporting/projections/AccountTransactionsProjection.py
class AccountTransactionsProjection:
    def __init__(self, event_bus: EventBus, read_db: ReadDatabase):
        # Subscribe to all transaction events
        event_bus.subscribe('MoneyTransferred', self)
        event_bus.subscribe('MoneyDeposited', self)
        event_bus.subscribe('MoneyWithdrawn', self)
    
    async def handle(self, event: IntegrationEvent) -> None:
        # Update read model
        await self.read_db.execute("""
            INSERT INTO account_transactions 
            (account_id, type, amount, timestamp)
            VALUES ($1, $2, $3, $4)
        """, event.account_id, event.type, 
            event.amount, event.timestamp)
```

## Fraud Detection Algorithm

```python
# fraud_detection/check_transaction/FraudDetectionService.py
class FraudDetectionService:
    async def analyze_transaction(self, transaction: Transaction) -> FraudResult:
        score = 0
        flags = []
        
        # Rule 1: Large amount
        if transaction.amount > 10000:
            score += 30
            flags.append("Large amount")
        
        # Rule 2: Unusual time
        if self.is_unusual_time(transaction.timestamp):
            score += 20
            flags.append("Unusual time")
        
        # Rule 3: Multiple transactions
        recent_count = await self.count_recent_transactions(
            transaction.account_id, 
            minutes=10
        )
        if recent_count > 5:
            score += 40
            flags.append("Multiple transactions")
        
        # Rule 4: Geographic anomaly
        if await self.is_geographic_anomaly(transaction):
            score += 50
            flags.append("Geographic anomaly")
        
        is_fraud = score >= 70
        
        return FraudResult(
            is_fraud=is_fraud,
            risk_score=score,
            flags=flags
        )
```

## Tech Stack

### Backend
- Python 3.11+
- FastAPI (async web framework)
- SQLAlchemy (ORM)
- PostgreSQL (event store + read models)
- Redis (caching)
- Celery (async tasks)
- Docker Compose

### Testing
- pytest
- pytest-asyncio
- httpx (async HTTP testing)
- Factory Boy (test fixtures)

### Monitoring
- Prometheus metrics
- Grafana dashboards
- Sentry error tracking
- OpenTelemetry tracing

## File Structure

```
04-banking-system-py/
├── pyproject.toml
├── src/
│   ├── contexts/
│   │   ├── accounts/
│   │   │   ├── open_account/
│   │   │   │   ├── OpenAccountCommand.py
│   │   │   │   ├── AccountOpenedEvent.py
│   │   │   │   ├── OpenAccountHandler.py
│   │   │   │   ├── AccountAggregate.py
│   │   │   │   └── test_open_account.py
│   │   │   ├── close_account/
│   │   │   └── freeze_account/
│   │   ├── transactions/
│   │   │   ├── transfer_money/
│   │   │   │   ├── TransferMoneyCommand.py
│   │   │   │   ├── TransferMoneySaga.py      # 🌟 Saga
│   │   │   │   ├── TransferMoneyHandler.py
│   │   │   │   └── test_transfer_money.py
│   │   │   ├── deposit_money/
│   │   │   └── _subscribers/
│   │   │       ├── account_opened_subscriber.py
│   │   │       └── fraud_detected_subscriber.py
│   │   ├── fraud_detection/
│   │   │   ├── check_transaction/
│   │   │   │   ├── FraudDetectionService.py
│   │   │   │   ├── RiskScorer.py
│   │   │   │   └── test_fraud_detection.py
│   │   │   └── _subscribers/
│   │   │       ├── money_transferred_subscriber.py
│   │   │       └── money_withdrawn_subscriber.py
│   │   └── reporting/
│   │       ├── get_account_statement/
│   │       │   ├── AccountStatementQuery.py
│   │       │   └── test_account_statement.py
│   │       ├── projections/
│   │       │   └── AccountTransactionsProjection.py
│   │       └── _subscribers/
│   ├── _shared/
│   │   ├── integration_events/
│   │   │   ├── accounts/
│   │   │   ├── transactions/
│   │   │   └── fraud_detection/
│   │   ├── sagas/
│   │   │   └── saga_orchestrator.py
│   │   └── types/
│   ├── infrastructure/
│   │   ├── event_store.py
│   │   ├── event_bus.py
│   │   ├── database.py
│   │   ├── cache.py
│   │   └── celery_app.py
│   └── api/
│       ├── main.py                    # FastAPI app
│       ├── routes/
│       │   ├── accounts.py
│       │   ├── transactions.py
│       │   └── reporting.py
│       └── middleware/
│           ├── auth.py
│           └── rate_limiting.py
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
        └── test_transfer_saga.py
```

## Security Considerations

### Authentication & Authorization
```python
from fastapi import Depends, HTTPException
from jose import JWTError, jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401)
        return user_id
    except JWTError:
        raise HTTPException(status_code=401)
```

### Encryption
- Sensitive data encrypted at rest
- AES-256 encryption for account numbers
- TLS 1.3 for data in transit

### Audit Logging
```python
class AuditLogger:
    async def log_transaction(self, transaction: Transaction, user: User):
        await self.audit_db.execute("""
            INSERT INTO audit_log 
            (user_id, action, entity_type, entity_id, timestamp)
            VALUES ($1, $2, $3, $4, $5)
        """, user.id, "TRANSFER", "Transaction", 
            transaction.id, datetime.now())
```

### Compliance
- GDPR compliance (data deletion)
- PCI DSS for payment data
- SOC 2 audit logging
- Data retention policies

## Performance Optimizations

### Caching Strategy
```python
from redis import Redis
import json

class CachedAccountService:
    def __init__(self, redis: Redis, accounts_service):
        self.redis = redis
        self.accounts_service = accounts_service
    
    async def get_account(self, account_id: str) -> Account:
        # Try cache first
        cached = await self.redis.get(f"account:{account_id}")
        if cached:
            return Account.parse_raw(cached)
        
        # Fetch from service
        account = await self.accounts_service.get(account_id)
        
        # Cache for 5 minutes
        await self.redis.setex(
            f"account:{account_id}", 
            300, 
            account.json()
        )
        
        return account
```

### Database Optimizations
- Connection pooling
- Prepared statements
- Indexes on frequently queried columns
- Partitioning for large tables

### Async Processing
```python
from celery import Celery

celery_app = Celery('banking', broker='redis://localhost')

@celery_app.task
async def process_fraud_check(transaction_id: str):
    # Async fraud detection
    result = await fraud_service.analyze(transaction_id)
    await event_bus.publish('FraudCheckCompleted', result)
```

## Testing Strategy

### Unit Tests
```python
import pytest
from src.contexts.accounts.open_account import OpenAccountHandler

@pytest.mark.asyncio
async def test_open_account_successfully():
    # Arrange
    event_store = InMemoryEventStore()
    handler = OpenAccountHandler(event_store)
    command = OpenAccountCommand(
        account_id="acc-1",
        owner_name="John Doe"
    )
    
    # Act
    await handler.handle(command)
    
    # Assert
    events = await event_store.get_events("acc-1")
    assert len(events) == 1
    assert events[0].type == "AccountOpened"
```

### Integration Tests
```python
@pytest.mark.asyncio
async def test_transfer_money_saga():
    # Setup
    saga = TransferMoneySaga(event_store, event_bus, accounts_service)
    
    # Execute transfer
    await saga.execute(Transfer(
        from_account="acc-1",
        to_account="acc-2",
        amount=100.00
    ))
    
    # Verify
    assert saga.state == SagaState.COMPLETED
    events = await event_bus.get_published_events()
    assert "MoneyTransferred" in [e.type for e in events]
```

### E2E Tests
```python
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_api_transfer_flow(async_client: AsyncClient):
    # Create accounts
    acc1 = await async_client.post("/api/accounts", json={...})
    acc2 = await async_client.post("/api/accounts", json={...})
    
    # Transfer money
    response = await async_client.post("/api/transactions/transfer", json={
        "from_account": acc1["id"],
        "to_account": acc2["id"],
        "amount": 100.00
    })
    
    assert response.status_code == 200
    assert response.json()["status"] == "completed"
```

## Deployment

### Docker Compose
```yaml
version: '3.8'
services:
  postgres:
  redis:
  celery-worker:
  celery-beat:
  api:
  prometheus:
  grafana:
```

### Environment Variables
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SECRET_KEY=...
FRAUD_DETECTION_THRESHOLD=70
```

## Monitoring & Observability

### Metrics
- Transaction success rate
- Fraud detection accuracy
- Saga completion rate
- API latency (p50, p95, p99)
- Event processing lag

### Alerts
- Failed saga > 1%
- High fraud detection rate
- Database connection pool exhausted
- Memory usage > 80%

## Next Steps to Implement

1. Setup Python project (Poetry)
2. Implement Accounts context
3. Implement Transactions context with saga
4. Implement Fraud Detection context
5. Implement Reporting context (CQRS)
6. Setup event bus
7. Implement all subscribers
8. Create FastAPI REST API
9. Setup Celery for async
10. Add comprehensive tests
11. Setup Docker Compose
12. Add monitoring
13. Security hardening
14. Write deployment guide

## References

- [FastAPI](https://fastapi.tiangolo.com/)
- [Python Async](https://docs.python.org/3/library/asyncio.html)
- [Saga Pattern](https://microservices.io/patterns/data/saga.html)
- [CQRS](https://martinfowler.com/bliki/CQRS.html)

---

**Estimated Implementation Time:** 3-4 weeks  
**Complexity:** ⭐⭐⭐⭐ Expert  
**LOC:** ~3,500+  
**Language:** Python 3.11+

This architecture serves as a blueprint for building mission-critical systems with Python, VSA, and event sourcing.

