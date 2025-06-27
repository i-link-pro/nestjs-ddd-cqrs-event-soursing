# Продвинутые паттерны DDD в NestJS

Этот файл содержит примеры использования продвинутых паттернов DDD, добавленных в проект.

## 🏛️ Aggregates (Агрегаты)

### Что такое агрегат?

**Агрегат** — это группа связанных объектов, которые рассматриваются как единое целое для целей обеспечения согласованности данных.

**Корень агрегата** — единственная сущность, через которую внешние объекты могут ссылаться на любые объекты внутри агрегата.

### Пример использования

```typescript
// Создание нового пользователя (агрегата)
const user = User.create('john@example.com', 'John', 'Doe');

// Изменение состояния агрегата
user.activate(); // Автоматически создает доменное событие

// Проверка событий
console.log(user.domainEvents); // [UserCreatedEvent, UserActivatedEvent]

// Сохранение агрегата
await userRepository.save(user); // События будут опубликованы
```

### Ключевые принципы

1. **Только корень агрегата доступен через репозиторий**
2. **Внешние объекты не могут ссылаться на внутренние объекты агрегата**
3. **Агрегат обеспечивает инвариантность данных**
4. **Доменные события публикуются через корень агрегата**

## 📢 Domain Events (Доменные события)

### Что это?

**Доменные события** представляют то, что произошло в домене и может быть интересно другим частям системы.

### Примеры событий

```typescript
// Создание пользователя
const user = User.create('jane@example.com', 'Jane', 'Smith');
// Событие: UserCreatedEvent

// Активация пользователя  
user.activate();
// Событие: UserActivatedEvent

// Смена email
user.changeEmail(Email.create('jane.smith@example.com'));
// Событие: UserEmailChangedEvent

// Блокировка пользователя
user.block('Нарушение правил');
// Событие: UserBlockedEvent
```

### Структура события

```typescript
export class UserCreatedEvent extends BaseDomainEvent {
  public readonly email: string;
  public readonly fullName: string;

  constructor(userId: string, email: string, fullName: string) {
    super(userId, 'User');
    this.email = email;
    this.fullName = fullName;
  }
}
```

### Обработка событий

В реальном проекте события обрабатываются так:

```typescript
// Обработчик события
@EventHandler(UserCreatedEvent)
export class UserCreatedHandler implements DomainEventHandler<UserCreatedEvent> {
  async handle(event: UserCreatedEvent): Promise<void> {
    // Отправить приветственный email
    await this.emailService.sendWelcomeEmail(event.email, event.fullName);
    
    // Создать профиль пользователя
    await this.profileService.createProfile(event.aggregateId);
    
    // Отправить аналитику
    await this.analyticsService.trackUserRegistration(event);
  }
}
```

## 📋 Specifications (Спецификации)

### Что это?

**Спецификация** инкапсулирует бизнес-правило, которое можно комбинировать с другими спецификациями.

### Простые спецификации

```typescript
// Проверка возможности активации
const canActivateSpec = new UserCanBeActivatedSpecification();
const result = canActivateSpec.isSatisfiedBy(user);

if (!result) {
  const reason = canActivateSpec.getFailureReason(user);
  throw new Error(reason);
}

user.activate();
```

### Комбинирование спецификаций

```typescript
const premiumSpec = PremiumUserSpecification.forRegularUsers();
const corporateSpec = PremiumUserSpecification.forCorporateUsers();
const canDeleteSpec = new UserCanBeDeletedSpecification();

// Логическое ИЛИ: премиум ИЛИ корпоративный
const anyPremiumSpec = premiumSpec.or(corporateSpec);

// Логическое И: премиум И может быть удален
const premiumDeletableSpec = anyPremiumSpec.and(canDeleteSpec);

// Логическое НЕ: не премиум
const nonPremiumSpec = premiumSpec.not();

// Использование
if (anyPremiumSpec.isSatisfiedBy(user)) {
  console.log('Пользователь имеет премиум статус');
}
```

### Использование в доменном сервисе

```typescript
export class UserDomainServiceEnhanced {
  private readonly canBeActivatedSpec = new UserCanBeActivatedSpecification();
  private readonly canBeDeletedSpec = new UserCanBeDeletedSpecification();

  canUserBeActivated(user: User): { canActivate: boolean; reason?: string } {
    const canActivate = this.canBeActivatedSpec.isSatisfiedBy(user);
    const reason = canActivate ? undefined : this.canBeActivatedSpec.getFailureReason(user);
    
    return { canActivate, reason };
  }
}
```

## 🏭 Factories (Фабрики)

### Что это?

**Фабрики** отвечают за создание сложных объектов и агрегатов с правильной инициализацией.

### Создание пользователя

```typescript
// Простое создание
const user = UserFactory.create({
  email: 'user@example.com',
  firstName: 'User',
  lastName: 'Example'
});

// Создание с автоверификацией
const verifiedUser = UserFactory.createVerified(
  'admin@company.com',
  'Admin',
  'User'
);

// Создание тестового пользователя
const testUser = UserFactory.createTestUser('test', 'mycompany.com');

// Создание из внешнего провайдера (OAuth)
const oauthUser = UserFactory.createFromExternalProvider(
  'google_123456',
  'oauth@gmail.com', 
  'OAuth',
  'User',
  true // email уже подтвержден
);
```

### Восстановление из БД

```typescript
// В репозитории
private toDomainAggregate(ormEntity: UserTypeOrmEntity): User {
  return UserFactory.restore({
    id: ormEntity.id,
    email: ormEntity.email,
    firstName: ormEntity.firstName,
    lastName: ormEntity.lastName,
    status: ormEntity.status as UserStatus,
    createdAt: ormEntity.createdAt,
    updatedAt: ormEntity.updatedAt,
    lastLoginAt: ormEntity.lastLoginAt,
    emailVerifiedAt: ormEntity.emailVerifiedAt
  });
}
```

## 🔧 Практические примеры

### Комплексная бизнес-операция

```typescript
async function promoteUserToPremium(userId: string): Promise<void> {
  // 1. Загружаем агрегат
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new Error('Пользователь не найден');
  }

  // 2. Проверяем спецификации
  const premiumSpec = PremiumUserSpecification.forRegularUsers();
  if (premiumSpec.isSatisfiedBy(user)) {
    throw new Error('Пользователь уже является премиум');
  }

  // 3. Проверяем предусловия
  const canActivateSpec = new UserCanBeActivatedSpecification();
  if (!canActivateSpec.isSatisfiedBy(user)) {
    const reason = canActivateSpec.getFailureReason(user);
    throw new Error(`Нельзя активировать пользователя: ${reason}`);
  }

  // 4. Выполняем бизнес-операцию
  user.activate();
  user.verifyEmail(); // Если еще не подтвержден

  // 5. Сохраняем (события будут опубликованы)
  await userRepository.save(user);

  // События: UserActivatedEvent, UserEmailVerifiedEvent
}
```

### Анализ состояния пользователя

```typescript
async function analyzeUser(userId: string): Promise<UserAnalysis> {
  const user = await userRepository.findById(userId);
  const domainService = new UserDomainServiceEnhanced(userRepository);

  // Комплексный анализ
  const healthCheck = await domainService.performUserHealthCheck(user);

  return {
    user: UserResponseDto.fromDomain(user),
    health: healthCheck,
    recommendations: healthCheck.recommendations,
    canPerformActions: {
      activate: healthCheck.canBeActivated.canActivate,
      delete: healthCheck.canBeDeleted.canDelete,
    }
  };
}
```

### Пакетная обработка с спецификациями

```typescript
async function findUsersForCleanup(): Promise<User[]> {
  const allUsers = await userRepository.findAll();
  const canDeleteSpec = new UserCanBeDeletedSpecification();
  const inactiveSpec = new UserInactiveSpecification(90); // 90 дней

  // Комбинируем спецификации
  const cleanupSpec = canDeleteSpec.and(inactiveSpec);

  // Фильтруем пользователей
  return allUsers.filter(user => cleanupSpec.isSatisfiedBy(user));
}
```

## 🎯 Рекомендации по использованию

### 1. Агрегаты

- **Делайте агрегаты маленькими** - лучше несколько маленьких, чем один большой
- **Один репозиторий на агрегат** - только корень агрегата сохраняется
- **Инварианты внутри агрегата** - агрегат должен быть всегда в валидном состоянии

### 2. Доменные события

- **Называйте события в прошедшем времени** - UserCreated, OrderShipped
- **Событие = факт** - события описывают то, что уже произошло
- **Используйте для интеграции** - события помогают связать разные домены

### 3. Спецификации

- **Одна ответственность** - одна спецификация проверяет одно правило
- **Комбинируйте спецификации** - используйте AND/OR/NOT для сложной логики
- **Переиспользуйте** - спецификации можно использовать в разных местах

### 4. Фабрики

- **Сложная инициализация** - используйте фабрики для объектов с множеством зависимостей
- **Валидация при создании** - фабрика должна создавать только валидные объекты
- **Разные способы создания** - create, restore, createFromExternal

## 🚀 Следующие шаги

1. **Изучите код** - посмотрите на реализацию паттернов в проекте
2. **Экспериментируйте** - добавьте свои спецификации и события
3. **Расширьте** - создайте новые агрегаты и домены
4. **Тестируйте** - напишите тесты для бизнес-логики

Помните: **DDD — это не про технологии, а про бизнес-логику!**

## 📑 Содержание

1. [Агрегаты и Корни агрегатов](#агрегаты-и-корни-агрегатов)
2. [Доменные события](#доменные-события)
3. [Спецификации](#спецификации)
4. [Фабрики](#фабрики)
5. [Доменные сервисы](#доменные-сервисы)
6. [CQRS (Command Query Responsibility Segregation)](#cqrs-command-query-responsibility-segregation)

---

## Агрегаты и Корни агрегатов

### 🎯 Концепция

**Агрегат** — это группа доменных объектов, которые могут рассматриваться как единое целое для целей обеспечения согласованности данных.

**Корень агрегата** — единственный объект, через который внешний код может получить доступ к любому объекту внутри агрегата.

### 📝 Реализация в проекте

```typescript
// src/shared/domain/aggregate-root.ts
export abstract class AggregateRoot extends BaseEntity {
  private _domainEvents: DomainEvent[] = [];

  /**
   * Добавить доменное событие
   */
  protected addDomainEvent(domainEvent: DomainEvent): void {
    this._domainEvents.push(domainEvent);
    console.log(`📨 Доменное событие добавлено: ${domainEvent.constructor.name}`);
  }

  /**
   * Получить все доменные события
   */
  public getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  /**
   * Очистить доменные события
   */
  public clearDomainEvents(): void {
    console.log(`🧹 Очищено ${this._domainEvents.length} доменных событий`);
    this._domainEvents = [];
  }

  /**
   * Отметить агрегат как измененный
   */
  protected markAsModified(): void {
    this.updatedAt = new Date();
  }
}
```

```typescript
// src/user/domain/entities/user-aggregate.ts
export class User extends AggregateRoot {
  // Агрегат инкапсулирует бизнес-правила и события
  public activate(): void {
    if (this._status === UserStatus.BLOCKED) {
      throw new Error('Заблокированный пользователь не может быть активирован');
    }
    
    const previousStatus = this._status;
    this._status = UserStatus.ACTIVE;
    this.markAsModified();
    
    // Публикуем доменное событие
    this.addDomainEvent(new UserActivatedEvent(this.id, this._email.value));
    
    console.log(`🔄 Пользователь активирован: ${this._email.value} (было: ${previousStatus})`);
  }
}
```

### 🎯 Ключевые принципы агрегатов

1. **Единственная точка входа**: Доступ только через корень агрегата
2. **Границы транзакций**: Один агрегат = одна транзакция
3. **Инварианты**: Агрегат обеспечивает соблюдение бизнес-правил
4. **Событийность**: Агрегат публикует события об изменениях

---

## Доменные события

### 🎯 Концепция

**Доменные события** представляют факты, важные для бизнеса, которые произошли в системе.

### 📝 Реализация в проекте

```typescript
// src/shared/domain/domain-event.ts
export interface DomainEvent {
  readonly eventId: string;
  readonly occurredOn: Date;
  readonly eventType: string;
}

export abstract class BaseDomainEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventType: string;

  constructor(eventType: string) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
    this.eventType = eventType;
  }
}
```

```typescript
// src/user/domain/events/user-created.event.ts
export class UserCreatedEvent extends BaseDomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly userName: string
  ) {
    super('UserCreated');
  }

  toString(): string {
    return `UserCreatedEvent: User ${this.userName} (${this.email}) created with ID ${this.userId}`;
  }
}
```

### 🔄 Жизненный цикл событий

1. **Создание**: События создаются в агрегатах при изменении состояния
2. **Накопление**: События накапливаются в агрегате до сохранения
3. **Публикация**: События публикуются после успешного сохранения
4. **Обработка**: События обрабатываются асинхронно

---

## Спецификации

### 🎯 Концепция

**Спецификация** инкапсулирует бизнес-правило в виде предиката, который можно комбинировать с другими спецификациями.

### 📝 Реализация в проекте

```typescript
// src/shared/domain/specification.ts
export abstract class BaseSpecification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;

  /**
   * Логическое И
   */
  and(other: BaseSpecification<T>): BaseSpecification<T> {
    return new AndSpecification(this, other);
  }

  /**
   * Логическое ИЛИ
   */
  or(other: BaseSpecification<T>): BaseSpecification<T> {
    return new OrSpecification(this, other);
  }

  /**
   * Логическое НЕ
   */
  not(): BaseSpecification<T> {
    return new NotSpecification(this);
  }
}
```

```typescript
// src/user/domain/specifications/user-can-be-activated.specification.ts
export class UserCanBeActivatedSpecification extends BaseSpecification<User> {
  isSatisfiedBy(user: User): boolean {
    // Пользователь может быть активирован, если:
    // 1. Он не заблокирован
    // 2. Email подтвержден
    // 3. Статус не "активный"
    
    const isNotBlocked = user.status !== UserStatus.BLOCKED;
    const isEmailVerified = user.isEmailVerified;
    const isNotActive = user.status !== UserStatus.ACTIVE;
    
    return isNotBlocked && isEmailVerified && isNotActive;
  }

  /**
   * Возвращает причину, почему спецификация не выполняется
   */
  getFailureReason(user: User): string | null {
    if (user.status === UserStatus.BLOCKED) {
      return 'Пользователь заблокирован';
    }
    
    if (!user.isEmailVerified) {
      return 'Email не подтвержден';
    }
    
    if (user.status === UserStatus.ACTIVE) {
      return 'Пользователь уже активен';
    }
    
    return null;
  }
}
```

### 🔄 Композиция спецификаций

```typescript
// Пример использования композиции спецификаций
const canBeActivated = new UserCanBeActivatedSpecification();
const isPremium = new PremiumUserSpecification();

// Комбинированная спецификация
const canBeActivatedPremium = canBeActivated.and(isPremium);

if (canBeActivatedPremium.isSatisfiedBy(user)) {
  user.activate();
  user.upgradeToPremium();
}
```

---

## Фабрики

### 🎯 Концепция

**Фабрика** инкапсулирует логику создания сложных объектов и агрегатов.

### 📝 Реализация в проекте

```typescript
// src/user/domain/factories/user.factory.ts
export class UserFactory {
  /**
   * Создать нового пользователя
   */
  static create(params: {
    email: string;
    firstName: string;
    lastName: string;
  }): User {
    console.log(`🏭 UserFactory: создание нового пользователя ${params.email}`);

    // 1. Создание объектов-значений
    const email = Email.create(params.email);
    const userName = UserName.create(params.firstName, params.lastName);

    // 2. Валидация
    UserFactory.validateCreationParams(email, userName);

    // 3. Создание агрегата
    const user = new User(email, userName);

    console.log(`✅ Пользователь создан: ${user.id}`);
    return user;
  }

  /**
   * Восстановить пользователя из данных БД
   */
  static restore(data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: UserStatus;
    isEmailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    console.log(`🔄 UserFactory: восстановление пользователя ${data.id}`);

    const email = Email.create(data.email);
    const userName = UserName.create(data.firstName, data.lastName);

    const user = User.restore(
      data.id,
      email,
      userName,
      data.status,
      data.isEmailVerified,
      data.createdAt,
      data.updatedAt
    );

    console.log(`✅ Пользователь восстановлен: ${data.email}`);
    return user;
  }

  /**
   * Создать пользователя с уже подтвержденным email
   */
  static createVerified(params: {
    email: string;
    firstName: string;
    lastName: string;
  }): User {
    const user = UserFactory.create(params);
    user.verifyEmail();  // Автоматически подтверждаем email
    
    console.log(`✅ Создан верифицированный пользователь: ${params.email}`);
    return user;
  }
}
```

---

## Доменные сервисы

### 🎯 Концепция

**Доменный сервис** содержит бизнес-логику, которая не принадлежит конкретной сущности.

### 📝 Реализация в проекте

```typescript
// src/user/domain/services/user-domain-service.enhanced.ts
@Injectable()
export class UserDomainServiceEnhanced {
  /**
   * Проверить, может ли пользователь быть активирован
   */
  canUserBeActivated(user: User): { canActivate: boolean; reason?: string } {
    const specification = new UserCanBeActivatedSpecification();
    
    if (specification.isSatisfiedBy(user)) {
      return { canActivate: true };
    }
    
    return {
      canActivate: false,
      reason: specification.getFailureReason(user)
    };
  }

  /**
   * Вычислить уровень доверия пользователя
   */
  calculateTrustLevel(user: User): 'low' | 'medium' | 'high' | 'premium' {
    let score = 0;

    // Базовые факторы
    if (user.isEmailVerified) score += 25;
    if (user.status === UserStatus.ACTIVE) score += 20;

    // Возраст аккаунта
    const daysSinceCreation = this.calculateDaysSince(user.createdAt);
    if (daysSinceCreation >= 365) score += 30;
    else if (daysSinceCreation >= 90) score += 20;
    else if (daysSinceCreation >= 30) score += 10;

    // Последняя активность
    if (user.lastLoginAt) {
      const daysSinceLogin = this.calculateDaysSince(user.lastLoginAt);
      if (daysSinceLogin <= 7) score += 25;
      else if (daysSinceLogin <= 30) score += 15;
      else if (daysSinceLogin <= 90) score += 5;
    }

    // Определяем уровень
    if (score >= 80) return 'premium';
    else if (score >= 60) return 'high';
    else if (score >= 40) return 'medium';
    else return 'low';
  }
}
```

---

## CQRS (Command Query Responsibility Segregation)

### 🎯 Концепция

**CQRS** — это паттерн, который разделяет операции чтения (queries) и записи (commands) данных, используя разные модели для каждого типа операций.

### 🏗️ Архитектура CQRS в проекте

```
┌─────────────────┐    ┌──────────────────┐
│    Commands     │    │     Queries      │
│   (изменения)   │    │    (чтение)      │
└─────────────────┘    └──────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌──────────────────┐
│ Command Handlers│    │ Query Handlers   │
└─────────────────┘    └──────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌──────────────────┐
│ Domain Models   │    │  Read Models     │
│  (для записи)   │    │ (для чтения)     │
└─────────────────┘    └──────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌──────────────────┐
│ Write Database  │    │ Read Database    │
└─────────────────┘    └──────────────────┘
```

### 📝 Команды (Commands)

```typescript
// src/shared/application/command.interface.ts
export interface Command {
  validate(): void;
}

export interface CommandHandler<TCommand extends Command, TResult = void> {
  handle(command: TCommand): Promise<TResult>;
}
```

```typescript
// src/user/application/commands/create-user.command.ts
export class CreateUserCommand implements Command {
  constructor(
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string
  ) {}

  validate(): void {
    if (!this.email?.trim()) {
      throw new Error('Email обязателен для заполнения');
    }
    // ... другие валидации
  }
}
```

```typescript
// src/user/application/commands/handlers/create-user.handler.ts
@Injectable()
export class CreateUserHandler implements CommandHandler<CreateUserCommand, User> {
  constructor(
    private readonly userRepository: UserRepositoryInterface,
    private readonly userDomainService: UserDomainService
  ) {}

  async handle(command: CreateUserCommand): Promise<User> {
    console.log(`🎯 CQRS Command: CreateUser для ${command.email}`);

    // 1. Валидация команды
    command.validate();

    // 2. Создание агрегата через фабрику
    const user = UserFactory.create({
      email: command.email,
      firstName: command.firstName,
      lastName: command.lastName
    });

    // 3. Доменная валидация
    await this.userDomainService.validateEmailUniqueness(user.email);

    // 4. Сохранение агрегата
    const savedUser = await this.userRepository.save(user);

    console.log(`✅ Пользователь создан через CQRS: ${savedUser.id}`);
    return savedUser;
  }
}
```

### 📝 Запросы (Queries)

```typescript
// src/shared/application/query.interface.ts
export interface Query {
  validate(): void;
}

export interface QueryHandler<TQuery extends Query, TResult> {
  handle(query: TQuery): Promise<TResult>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
```

```typescript
// src/user/application/queries/get-user.query.ts
export class GetUserQuery implements Query {
  constructor(public readonly userId: string) {}

  validate(): void {
    if (!this.userId?.trim()) {
      throw new Error('ID пользователя обязателен');
    }
  }
}

export class GetUsersQuery implements Query {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly status?: string,
    public readonly emailVerified?: boolean,
    public readonly sortBy: string = 'createdAt',
    public readonly sortOrder: 'ASC' | 'DESC' = 'DESC'
  ) {}

  validate(): void {
    if (this.page < 1) {
      throw new Error('Номер страницы должен быть больше 0');
    }
    
    if (this.limit < 1 || this.limit > 100) {
      throw new Error('Количество записей должно быть от 1 до 100');
    }
  }
}
```

### 📝 Read Models (Модели чтения)

```typescript
// src/user/infrastructure/read-models/user.read-model.ts
export class UserReadModel {
  public readonly id: string;
  public readonly email: string;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly fullName: string;
  public readonly status: string;
  public readonly isEmailVerified: boolean;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  // Предвычисленные поля для UI
  public readonly daysSinceLastLogin: number | null;
  public readonly daysSinceCreation: number;
  public readonly trustLevel: 'low' | 'medium' | 'high' | 'premium';
  public readonly isPremium: boolean;

  constructor(data: UserReadModelData) {
    // Инициализация всех полей
    this.id = data.id;
    this.email = data.email;
    // ... другие поля

    // Вычисляемые поля
    this.fullName = `${data.firstName} ${data.lastName}`;
    this.daysSinceCreation = this.calculateDaysSinceCreation();
    this.trustLevel = this.calculateTrustLevel();
    this.isPremium = this.calculateIsPremium();
  }

  /**
   * Создать read model из ORM entity
   */
  static fromOrmEntity(entity: UserTypeOrmEntity): UserReadModel {
    return new UserReadModel({
      id: entity.id,
      email: entity.email,
      firstName: entity.firstName,
      lastName: entity.lastName,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      lastLoginAt: entity.lastLoginAt,
      emailVerifiedAt: entity.emailVerifiedAt
    });
  }
}
```

### 📝 Query Handlers

```typescript
// src/user/application/queries/handlers/get-user.handler.ts
@Injectable()
export class GetUserHandler implements QueryHandler<GetUserQuery, UserReadModel | null> {
  constructor(
    private readonly userReadRepository: UserReadModelRepositoryInterface
  ) {}

  async handle(query: GetUserQuery): Promise<UserReadModel | null> {
    console.log(`📖 CQRS Query: GetUser для ${query.userId}`);

    query.validate();

    const user = await this.userReadRepository.findById(query.userId);
    
    if (user) {
      console.log(`✅ Пользователь найден: ${user.email}`);
    } else {
      console.log(`❌ Пользователь не найден: ${query.userId}`);
    }

    return user;
  }
}
```

### 📝 Медиатор (Mediator)

```typescript
// src/shared/application/mediator.interface.ts
export interface Mediator {
  send<TResult = void>(command: Command): Promise<CommandResult<TResult>>;
  query<TResult>(query: Query): Promise<TResult>;
  publish(event: any): Promise<void>;
}

export class SimpleMediator implements Mediator {
  private commandHandlers = new Map<string, any>();
  private queryHandlers = new Map<string, any>();

  async send<TResult = void>(command: Command): Promise<CommandResult<TResult>> {
    try {
      command.validate();
      
      const handler = this.commandHandlers.get(command.constructor.name);
      if (!handler) {
        throw new Error(`No handler found for command ${command.constructor.name}`);
      }

      const result = await handler.handle(command);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async query<TResult>(query: Query): Promise<TResult> {
    query.validate();
    
    const handler = this.queryHandlers.get(query.constructor.name);
    if (!handler) {
      throw new Error(`No handler found for query ${query.constructor.name}`);
    }

    return await handler.handle(query);
  }
}
```

### 📝 CQRS Service

```typescript
// src/user/application/services/user-cqrs.service.ts
@Injectable()
export class UserCqrsService {
  constructor(private readonly mediator: Mediator) {}

  // === КОМАНДЫ ===
  async createUser(data: CreateUserData): Promise<any> {
    const command = new CreateUserCommand(
      data.email,
      data.firstName,
      data.lastName
    );

    const result = await this.mediator.send(command);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data;
  }

  // === ЗАПРОСЫ ===
  async getUserById(userId: string): Promise<UserReadModel | null> {
    const query = new GetUserQuery(userId);
    return await this.mediator.query(query);
  }

  async getUsers(params: GetUsersParams): Promise<PaginatedResult<UserReadModel>> {
    const query = new GetUsersQuery(
      params.page,
      params.limit,
      params.status,
      params.emailVerified,
      params.sortBy,
      params.sortOrder
    );

    return await this.mediator.query(query);
  }
}
```

### 📝 CQRS Controller

```typescript
// src/user/presentation/controllers/user-cqrs.controller.ts
@ApiTags('Users CQRS')
@Controller('cqrs/users')
export class UserCqrsController {
  constructor(private readonly userCqrsService: UserCqrsService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Создать пользователя (CQRS Command)',
    description: 'Создает нового пользователя через CQRS архитектуру'
  })
  async createUser(@Body() createUserDto: CreateUserDto) {
    console.log('🎯 CQRS Command: CreateUser');
    
    const user = await this.userCqrsService.createUser({
      email: createUserDto.email,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName
    });

    return {
      message: 'Пользователь создан через CQRS',
      data: user,
      pattern: 'Command'
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Получить пользователя (CQRS Query)',
    description: 'Получает пользователя через CQRS запрос с Read Model'
  })
  async getUserById(@Param('id') id: string) {
    console.log('📖 CQRS Query: GetUser');
    
    const user = await this.userCqrsService.getUserById(id);
    
    if (!user) {
      throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
    }

    return {
      message: 'Пользователь получен через CQRS Query',
      data: user.toObject(),
      pattern: 'Query',
      readModel: true
    };
  }
}
```

### 🎯 Преимущества CQRS

1. **Разделение ответственности**
   - Команды фокусируются на бизнес-логике
   - Запросы оптимизированы для конкретных сценариев

2. **Масштабируемость**
   - Независимое масштабирование чтения и записи
   - Возможность использования разных БД

3. **Оптимизация**
   - Read Models оптимизированы для UI
   - Предвычисленные поля и агрегации

4. **Гибкость**
   - Разные модели данных для разных потребностей
   - Легкое добавление новых запросов

### 🎯 Недостатки CQRS

1. **Сложность**
   - Больше кода и компонентов
   - Сложнее для понимания

2. **Консистентность**
   - Eventual consistency между моделями
   - Необходимость синхронизации

3. **Дублирование**
   - Дублирование данных в read models
   - Больше места для хранения

### 🚀 Использование в проекте

```bash
# Создание пользователя через CQRS
curl -X POST http://localhost:3000/cqrs/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Получение пользователя через CQRS
curl http://localhost:3000/cqrs/users/USER_ID

# Получение списка с фильтрацией
curl "http://localhost:3000/cqrs/users?page=1&limit=10&status=active&emailVerified=true"

# Аналитика через CQRS
curl http://localhost:3000/cqrs/users/analytics/overview?period=month
```

### 📊 Мониторинг CQRS

В логах можно отследить разделение команд и запросов:

```
🎯 CQRS Command: CreateUser для john.doe@example.com
✅ Пользователь создан через CQRS: 12345

📖 CQRS Query: GetUser для 12345
✅ Пользователь найден: john.doe@example.com

📊 CQRS Query: GetUserAnalytics (период: month)
✅ Аналитика рассчитана: 1000 пользователей проанализировано
```

---

## 🎯 Заключение

Все эти паттерны работают вместе, создавая гибкую и масштабируемую архитектуру:

- **Агрегаты** обеспечивают целостность данных
- **События** обеспечивают слабую связанность
- **Спецификации** инкапсулируют бизнес-правила
- **Фабрики** управляют созданием объектов
- **Доменные сервисы** содержат кросс-агрегатную логику
- **CQRS** оптимизирует чтение и запись

Изучение этих паттернов поможет создавать более чистый, тестируемый и поддерживаемый код в сложных доменах. 