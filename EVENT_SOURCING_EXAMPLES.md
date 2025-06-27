# Event Sourcing в NestJS DDD Example

🔄 **Руководство по Event Sourcing с подробными примерами**

## 📖 Что такое Event Sourcing?

**Event Sourcing** — это архитектурный паттерн, при котором состояние приложения хранится как последовательность событий, а не как текущий снимок данных. Вместо обновления записей в базе данных, мы добавляем новые события, описывающие произошедшие изменения.

### 🎯 Ключевые концепции

1. **Event Store** — хранилище всех событий в системе
2. **Aggregate** — бизнес-объект, который генерирует события
3. **Event Stream** — последовательность событий для конкретного агрегата
4. **Replay** — восстановление состояния агрегата из событий
5. **Snapshot** — снимок состояния для оптимизации производительности
6. **Projection** — построение read models из событий

### ✅ Преимущества Event Sourcing

- **Полная история изменений** — ничего не теряется
- **Временные запросы** — "какое было состояние месяц назад?"
- **Отладка и аудит** — полная трассировка изменений
- **Масштабируемость чтения** — множество оптимизированных проекций
- **Устойчивость к ошибкам** — можно пересоздать состояние
- **Бизнес-аналитика** — богатые данные для анализа

### ❌ Недостатки Event Sourcing

- **Сложность** — требует глубокого понимания
- **Консистентность** — eventual consistency
- **Производительность** — replay может быть медленным
- **Схема событий** — сложно изменять формат событий
- **Запросы** — сложные joined запросы могут быть проблематичными

## 🏗️ Архитектура Event Sourcing в проекте

```
src/
├── shared/event-sourcing/
│   ├── event-store.interface.ts          # Интерфейс Event Store
│   ├── event-sourced-aggregate.ts        # Базовый класс для агрегатов
│   └── event-sourced-repository.interface.ts # Интерфейс репозитория
│
└── user/
    ├── domain/entities/
    │   └── user-event-sourced.aggregate.ts # User агрегат с Event Sourcing
    ├── infrastructure/event-sourcing/
    │   ├── in-memory-event-store.ts        # Реализация Event Store
    │   └── user-event-sourced.repository.ts # Event Sourced репозиторий
    └── presentation/controllers/
        └── user-event-sourcing.controller.ts # API для демонстрации
```

## 🔧 Компоненты Event Sourcing

### 1. Event Store Interface

```typescript
export interface EventStore {
  // Сохранить события для агрегата
  saveEvents(aggregateId: string, events: any[], expectedVersion: number): Promise<void>;
  
  // Получить события агрегата
  getEventsForAggregate(aggregateId: string, fromVersion?: number): Promise<StoredEvent[]>;
  
  // Получить события по типу агрегата
  getEventsByAggregateType(aggregateType: string, fromDate?: Date, toDate?: Date): Promise<StoredEvent[]>;
  
  // Получить события после timestamp
  getEventsAfter(timestamp: Date): Promise<StoredEvent[]>;
}
```

### 2. Event Sourced Aggregate

```typescript
export abstract class EventSourcedAggregateRoot {
  protected _id: string;
  protected _version: number = 0;
  private _uncommittedEvents: BaseDomainEvent[] = [];

  // Применить событие к агрегату
  protected applyEvent(event: BaseDomainEvent, isNew: boolean = true): void {
    this.when(event);              // Изменить состояние
    this._version++;               // Увеличить версию
    if (isNew) {
      this._uncommittedEvents.push(event); // Добавить в очередь
    }
  }

  // Обработчик событий - реализуется в наследниках
  protected abstract when(event: BaseDomainEvent): void;

  // Восстановить из истории событий
  public static fromHistory<T>(events: BaseDomainEvent[]): T;
}
```

### 3. User Event Sourced Aggregate

```typescript
export class UserEventSourcedAggregate extends EventSourcedAggregateRoot {
  private _email: Email;
  private _userName: UserName;
  private _status: UserStatus;

  // Команда: создать пользователя
  public static create(email: Email, userName: UserName): UserEventSourcedAggregate {
    const user = new UserEventSourcedAggregate();
    const event = new UserCreatedEvent(user.id, email.value, userName.firstName, userName.lastName);
    user.applyEvent(event);
    return user;
  }

  // Команда: активировать пользователя
  public activate(): void {
    if (this._status === UserStatus.BLOCKED) {
      throw new Error('Заблокированный пользователь не может быть активирован');
    }
    const event = new UserActivatedEvent(this.id, this._email.value);
    this.applyEvent(event);
  }

  // Обработчик событий
  protected when(event: BaseDomainEvent): void {
    switch (event.constructor.name) {
      case 'UserCreatedEvent':
        this.whenUserCreated(event as UserCreatedEvent);
        break;
      case 'UserActivatedEvent':
        this.whenUserActivated(event as UserActivatedEvent);
        break;
      // ... другие события
    }
  }

  private whenUserCreated(event: UserCreatedEvent): void {
    this._email = Email.create(event.email);
    this._userName = UserName.create(event.firstName, event.lastName);
    this._status = UserStatus.PENDING;
  }

  private whenUserActivated(event: UserActivatedEvent): void {
    this._status = UserStatus.ACTIVE;
  }
}
```

## 🚀 Примеры использования API

### 📝 Создание пользователя с Event Sourcing

```bash
curl -X POST http://localhost:3000/event-sourcing/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Ответ:**
```json
{
  "success": true,
  "message": "Пользователь создан через Event Sourcing",
  "data": {
    "id": "uuid-123",
    "email": "john.doe@example.com",
    "fullName": "John Doe",
    "status": "pending",
    "version": 1,
    "isEmailVerified": false
  },
  "eventSourcing": {
    "eventsGenerated": 0,
    "currentVersion": 1
  }
}
```

### 🔍 Получение пользователя (восстановление из событий)

```bash
curl http://localhost:3000/event-sourcing/users/uuid-123
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "email": "john.doe@example.com",
    "fullName": "John Doe",
    "status": "pending",
    "version": 1,
    "isEmailVerified": false
  },
  "eventSourcing": {
    "restoredFromEvents": true,
    "currentVersion": 1
  }
}
```

### ✅ Активация пользователя

```bash
curl -X PUT http://localhost:3000/event-sourcing/users/uuid-123/activate
```

**Ответ:**
```json
{
  "success": true,
  "message": "Пользователь активирован",
  "data": {
    "id": "uuid-123",
    "status": "active",
    "version": 2
  },
  "eventSourcing": {
    "versionBefore": 1,
    "versionAfter": 2,
    "eventGenerated": "UserActivatedEvent"
  }
}
```

### 📧 Подтверждение email

```bash
curl -X PUT http://localhost:3000/event-sourcing/users/uuid-123/verify-email
```

### 📧 Изменение email

```bash
curl -X PUT http://localhost:3000/event-sourcing/users/uuid-123/change-email \
  -H "Content-Type: application/json" \
  -d '{"newEmail": "new.email@example.com"}'
```

### 🚫 Блокировка пользователя

```bash
curl -X PUT http://localhost:3000/event-sourcing/users/uuid-123/block \
  -H "Content-Type: application/json" \
  -d '{"reason": "Подозрительная активность"}'
```

## 📜 История событий и анализ

### 📋 Получение истории событий

```bash
curl http://localhost:3000/event-sourcing/users/uuid-123/events
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "aggregateId": "uuid-123",
    "totalEvents": 4,
    "currentVersion": 4,
    "events": [
      {
        "version": 1,
        "eventType": "UserCreatedEvent",
        "timestamp": "2024-01-01T10:00:00Z",
        "data": {
          "email": "john.doe@example.com",
          "firstName": "John",
          "lastName": "Doe"
        }
      },
      {
        "version": 2,
        "eventType": "UserActivatedEvent",
        "timestamp": "2024-01-01T10:05:00Z",
        "data": {
          "email": "john.doe@example.com"
        }
      },
      {
        "version": 3,
        "eventType": "UserEmailVerifiedEvent",
        "timestamp": "2024-01-01T10:10:00Z",
        "data": {
          "email": "john.doe@example.com"
        }
      },
      {
        "version": 4,
        "eventType": "UserEmailChangedEvent",
        "timestamp": "2024-01-01T10:15:00Z",
        "data": {
          "oldEmail": "john.doe@example.com",
          "newEmail": "new.email@example.com"
        }
      }
    ]
  }
}
```

### 🔄 Replay агрегата из событий

```bash
curl -X POST http://localhost:3000/event-sourcing/users/uuid-123/replay
```

**Ответ:**
```json
{
  "success": true,
  "message": "Агрегат успешно восстановлен из истории событий",
  "data": {
    "id": "uuid-123",
    "email": "new.email@example.com",
    "fullName": "John Doe",
    "status": "active",
    "version": 4,
    "isEmailVerified": false
  },
  "replay": {
    "totalEventsReplayed": 4,
    "finalVersion": 4,
    "replaySuccessful": true
  }
}
```

## 📊 Администрирование и аналитика

### 📈 Статистика Event Store

```bash
curl http://localhost:3000/event-sourcing/users/admin/event-store-stats
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "totalAggregates": 5,
    "totalEvents": 23,
    "aggregates": [
      {
        "id": "uuid-123",
        "version": 4,
        "eventsCount": 4
      },
      {
        "id": "uuid-456", 
        "version": 3,
        "eventsCount": 3
      }
    ]
  }
}
```

### 📅 Пользователи за период

```bash
curl "http://localhost:3000/event-sourcing/users/admin/created-between?fromDate=2024-01-01&toDate=2024-01-31"
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "period": {
      "from": "2024-01-01",
      "to": "2024-01-31"
    },
    "totalUsers": 3,
    "users": [
      {
        "userId": "uuid-123",
        "email": "john.doe@example.com",
        "fullName": "John Doe",
        "createdAt": "2024-01-01T10:00:00Z"
      }
    ]
  }
}
```

## 🎭 Демонстрационные возможности

### 🔄 Полный жизненный цикл пользователя

```bash
curl -X POST http://localhost:3000/event-sourcing/users/demo/user-lifecycle \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "firstName": "Demo",
    "lastName": "User"
  }'
```

**Ответ:**
```json
{
  "success": true,
  "message": "Демонстрация жизненного цикла пользователя завершена",
  "demo": {
    "userId": "uuid-demo",
    "finalState": {
      "email": "new.demo@example.com",
      "fullName": "Demo User",
      "status": "blocked",
      "version": 5,
      "isEmailVerified": false
    },
    "steps": [
      {
        "step": 1,
        "action": "Создание пользователя",
        "event": "UserCreatedEvent",
        "version": 1,
        "status": "pending"
      },
      {
        "step": 2,
        "action": "Подтверждение email",
        "event": "UserEmailVerifiedEvent",
        "version": 2,
        "isEmailVerified": true
      },
      {
        "step": 3,
        "action": "Активация пользователя",
        "event": "UserActivatedEvent",
        "version": 3,
        "status": "active"
      },
      {
        "step": 4,
        "action": "Изменение email",
        "event": "UserEmailChangedEvent",
        "version": 4,
        "newEmail": "new.demo@example.com",
        "isEmailVerified": false
      },
      {
        "step": 5,
        "action": "Блокировка пользователя",
        "event": "UserBlockedEvent",
        "version": 5,
        "status": "blocked"
      }
    ],
    "eventHistory": {
      "totalEvents": 5,
      "events": [
        "UserCreatedEvent",
        "UserEmailVerifiedEvent", 
        "UserActivatedEvent",
        "UserEmailChangedEvent",
        "UserBlockedEvent"
      ]
    }
  }
}
```

## 🔧 Сравнение подходов

### 📊 Традиционный CRUD vs Event Sourcing

| Аспект | Традиционный CRUD | Event Sourcing |
|--------|------------------|----------------|
| **Хранение** | Текущее состояние | События |
| **Обновления** | UPDATE запросы | Новые события |
| **История** | Потеряна | Полная история |
| **Отладка** | Сложная | Простая |
| **Производительность** | Быстрое чтение | Медленное восстановление |
| **Консистентность** | ACID | Eventual Consistency |
| **Сложность** | Простая | Высокая |

### 🔄 CQRS vs Event Sourcing vs Традиционный DDD

**Традиционный DDD** (`/users`):
```bash
POST /users          # Создать → сохранить в БД
GET /users/123       # Читать → загрузить из БД  
PUT /users/123       # Обновить → UPDATE в БД
```

**CQRS** (`/cqrs/users`):
```bash
POST /cqrs/users     # Command → Write Model
GET /cqrs/users/123  # Query → Read Model
PUT /cqrs/users/123  # Command → Write Model
```

**Event Sourcing** (`/event-sourcing/users`):
```bash
POST /event-sourcing/users     # Command → Event Store
GET /event-sourcing/users/123  # Query → Replay из Event Store
PUT /event-sourcing/users/123  # Command → Event Store
```

## 🎯 Практические кейсы использования

### 1. 🏦 Финансовые системы
```typescript
// Банковский счет с Event Sourcing
class BankAccount extends EventSourcedAggregateRoot {
  public withdraw(amount: Money): void {
    if (this.balance.isLessThan(amount)) {
      throw new InsufficientFundsError();
    }
    const event = new MoneyWithdrawnEvent(this.id, amount);
    this.applyEvent(event);
  }
}
```

### 2. 📝 Системы документооборота
```typescript
// Документ с версионированием
class Document extends EventSourcedAggregateRoot {
  public revise(content: string, author: UserId): void {
    const event = new DocumentRevisedEvent(this.id, content, author, ++this.revision);
    this.applyEvent(event);
  }
}
```

### 3. 🛒 E-commerce заказы
```typescript
// Заказ с отслеживанием статусов
class Order extends EventSourcedAggregateRoot {
  public ship(trackingNumber: string): void {
    if (this.status !== OrderStatus.PAID) {
      throw new Error('Можно отправить только оплаченный заказ');
    }
    const event = new OrderShippedEvent(this.id, trackingNumber);
    this.applyEvent(event);
  }
}
```

## 🛠️ Лучшие практики

### ✅ Что делать

1. **Дизайн событий**
   - Используйте прошедшее время (`UserCreated`, не `CreateUser`)
   - Делайте события неизменяемыми
   - Включайте всю необходимую информацию

2. **Версионирование**
   - Планируйте схему событий заранее
   - Используйте версионирование событий
   - Поддерживайте обратную совместимость

3. **Производительность**
   - Используйте снимки для больших агрегатов
   - Создавайте Read Models для запросов
   - Кэшируйте часто используемые агрегаты

4. **Ошибки**
   - Не храните валидационные ошибки как события
   - Отделяйте технические ошибки от бизнес-событий
   - Используйте идемпотентность

### ❌ Чего избегать

1. **Не изменяйте прошлые события**
2. **Не делайте события слишком мелкими**
3. **Не игнорируйте производительность replay**
4. **Не забывайте про eventual consistency**

## 🔮 Расширенные возможности

### 1. 📸 Снимки (Snapshots)

```typescript
export class UserEventSourcedAggregate {
  public createSnapshot(): AggregateSnapshot {
    return {
      aggregateId: this.id,
      version: this.version,
      data: {
        email: this._email.value,
        status: this._status,
        // ... другие поля
      }
    };
  }
}
```

### 2. 🎭 Проекции (Projections)

```typescript
export class UserStatsProjection {
  public async handle(event: BaseDomainEvent): Promise<void> {
    switch (event.constructor.name) {
      case 'UserCreatedEvent':
        await this.incrementUserCount();
        break;
      case 'UserActivatedEvent':
        await this.incrementActiveUsers();
        break;
    }
  }
}
```

### 3. 🔄 Sagas (Process Managers)

```typescript
export class UserOnboardingSaga {
  public async handle(event: UserCreatedEvent): Promise<void> {
    // Автоматические действия после создания пользователя
    await this.sendWelcomeEmail(event.email);
    await this.createUserProfile(event.aggregateId);
    await this.scheduleFollowUp(event.aggregateId);
  }
}
```

## 🔍 Отладка и мониторинг

### 📊 Метрики Event Store

```typescript
// Получить метрики
const stats = eventStore.getStatistics();
console.log(`Всего агрегатов: ${stats.totalAggregates}`);
console.log(`Всего событий: ${stats.totalEvents}`);
```

### 🔧 Инструменты разработчика

```bash
# Проверить историю агрегата
curl http://localhost:3000/event-sourcing/users/uuid-123/events

# Пересоздать агрегат
curl -X POST http://localhost:3000/event-sourcing/users/uuid-123/replay

# Статистика Event Store
curl http://localhost:3000/event-sourcing/users/admin/event-store-stats
```

## 🎓 Заключение

Event Sourcing — мощный паттерн для систем, где важна полная история изменений:

### 🎯 Когда использовать Event Sourcing:
- **Аудит критически важен** (финансы, медицина, юридические системы)
- **Нужна полная история** изменений для анализа
- **Бизнес-события имеют ценность** сами по себе
- **Система должна быть устойчивой** к ошибкам
- **Требуется временная аналитика** ("что было месяц назад?")

### 🚫 Когда НЕ использовать Event Sourcing:
- **Простые CRUD операции** без бизнес-логики
- **Производительность критична** для всех операций  
- **Команда не готова к сложности**
- **Нет требований к аудиту** и истории

### 📚 Дальнейшее изучение:
1. Изучите этот пример Event Sourcing
2. Сравните с CQRS и традиционным DDD
3. Попробуйте создать свой агрегат с Event Sourcing
4. Изучите продвинутые возможности (снимки, проекции, sagas)
5. Рассмотрите production Event Stores (EventStore, Kafka, etc.)

**Event Sourcing открывает новые возможности для проектирования устойчивых и аудируемых систем!** 🚀 