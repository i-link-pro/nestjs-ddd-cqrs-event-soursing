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