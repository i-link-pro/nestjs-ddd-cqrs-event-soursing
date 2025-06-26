# NestJS DDD Example

🏗️ **Пример проекта NestJS с архитектурой Domain-Driven Design (DDD)**

Этот проект демонстрирует, как правильно структурировать NestJS приложение по принципам Domain-Driven Design. Он содержит подробные комментарии, объясняющие каждый аспект DDD архитектуры.

## 📚 Что такое Domain-Driven Design (DDD)?

**Domain-Driven Design** — это подход к разработке программного обеспечения, который фокусируется на сложности бизнес-логики, а не на технических деталях. Основные принципы:

### 🎯 Ключевые концепции DDD

1. **Domain (Домен)** — основная область бизнеса, для которой создается ПО
2. **Bounded Context (Ограниченный контекст)** — границы, в которых модель остается целостной
3. **Entity (Сущность)** — объект с уникальной идентичностью
4. **Value Object (Объект-значение)** — объект без идентичности, определяемый атрибутами
5. **Aggregate (Агрегат)** — группа связанных сущностей с единым корнем
6. **Aggregate Root (Корень агрегата)** — единственная точка входа в агрегат
7. **Repository (Репозиторий)** — абстракция для доступа к данным
8. **Domain Service (Доменный сервис)** — бизнес-логика, не принадлежащая сущности
9. **Application Service (Сервис приложения)** — координация бизнес-операций
10. **Domain Events (Доменные события)** — события, происходящие в домене
11. **Specifications (Спецификации)** — инкапсуляция бизнес-правил
12. **Factories (Фабрики)** — создание сложных объектов

## 🏛️ Архитектура проекта

Проект структурирован по **слоистой архитектуре** с четкими границами между слоями:

```
src/
├── shared/                    # Общие компоненты
│   └── domain/
│       ├── base-entity.ts     # Базовый класс для сущностей
│       ├── base-value-object.ts # Базовый класс для объектов-значений
│       └── repository.interface.ts # Базовый интерфейс репозитория
│
├── user/                      # Домен пользователей
│   ├── domain/               # Доменный слой
│   │   ├── entities/
│   │   │   ├── user.entity.ts           # Старая версия (для сравнения)
│   │   │   └── user-aggregate.ts        # Агрегат пользователя
│   │   ├── value-objects/
│   │   │   ├── email.ts
│   │   │   └── user-name.ts
│   │   ├── events/                      # Доменные события
│   │   │   ├── user-created.event.ts
│   │   │   ├── user-activated.event.ts
│   │   │   ├── user-blocked.event.ts
│   │   │   ├── user-email-verified.event.ts
│   │   │   └── user-email-changed.event.ts
│   │   ├── specifications/              # Спецификации бизнес-правил
│   │   │   ├── user-can-be-activated.specification.ts
│   │   │   ├── user-can-be-deleted.specification.ts
│   │   │   └── premium-user.specification.ts
│   │   ├── factories/                   # Фабрики для создания объектов
│   │   │   └── user.factory.ts
│   │   ├── repositories/
│   │   │   └── user.repository.interface.ts
│   │   └── services/
│   │       ├── user.domain-service.ts
│   │       └── user-domain-service.enhanced.ts
│   │
│   ├── application/          # Слой приложения
│   │   ├── commands/
│   │   │   ├── create-user.command.ts
│   │   │   └── update-user.command.ts
│   │   └── services/
│   │       └── user.application-service.ts
│   │
│   ├── infrastructure/       # Инфраструктурный слой
│   │   ├── entities/
│   │   │   └── user.typeorm-entity.ts
│   │   └── repositories/
│   │       ├── user.repository.ts
│   │       └── user-aggregate.repository.ts  # Репозиторий для агрегата
│   │
│   ├── presentation/         # Слой представления
│   │   ├── controllers/
│   │   │   └── user.controller.ts
│   │   └── dto/
│   │       ├── create-user.dto.ts
│   │       └── user-response.dto.ts
│   │
│   └── user.module.ts        # Модуль домена
│
├── order/                    # Домен заказов (пример)
│   ├── domain/
│   │   └── entities/
│   │       └── order.entity.ts
│   └── order.module.ts
│
├── app.module.ts             # Корневой модуль
└── main.ts                   # Точка входа
```

## 📦 Слои архитектуры

### 1. 🏛️ Domain Layer (Доменный слой)

**Назначение**: Содержит бизнес-логику и правила предметной области.

**Что НЕ должно быть в доменном слое**:
- Детали инфраструктуры (БД, HTTP, файлы)
- Логика приложения (оркестрация, транзакции)
- UI логика

**Компоненты**:
- **Entities**: Объекты с уникальной идентичностью
- **Value Objects**: Неизменяемые объекты без идентичности
- **Domain Services**: Бизнес-логика, не относящаяся к конкретной сущности
- **Repository Interfaces**: Абстракции для доступа к данным

**Пример агрегата**:
```typescript
export class User extends AggregateRoot {
  private _email: Email;
  private _userName: UserName;
  private _status: UserStatus;

  public activate(): void {
    if (this._status === UserStatus.BLOCKED) {
      throw new Error('Заблокированный пользователь не может быть активирован');
    }
    this._status = UserStatus.ACTIVE;
    this.markAsModified();
    
    // Публикуем доменное событие
    this.addDomainEvent(new UserActivatedEvent(this.id, this._email.value));
  }
}
```

### 2. 🔧 Application Layer (Слой приложения)

**Назначение**: Координирует выполнение бизнес-операций.

**Обязанности**:
- Оркестрация доменных объектов
- Управление транзакциями
- Координация между доменами
- Выполнение команд пользователя

**Компоненты**:
- **Application Services**: Координируют бизнес-операции
- **Commands**: Представляют намерения пользователя
- **Query Handlers**: Обрабатывают запросы на чтение

**Пример сервиса приложения**:
```typescript
@Injectable()
export class UserApplicationService {
  async createUser(command: CreateUserCommand): Promise<User> {
    // 1. Валидация команды
    command.validate();
    
    // 2. Создание объектов-значений
    const email = Email.create(command.email);
    const userName = UserName.create(command.firstName, command.lastName);
    
    // 3. Доменная валидация
    await this.userDomainService.validateEmailUniqueness(email);
    
    // 4. Создание и сохранение сущности
    const user = new User(email, userName);
    return await this.userRepository.save(user);
  }
}
```

### 3. 🔌 Infrastructure Layer (Инфраструктурный слой)

**Назначение**: Обеспечивает техническую реализацию для доменного слоя.

**Обязанности**:
- Реализация репозиториев
- Интеграция с внешними сервисами
- Персистентность данных
- Конфигурация фреймворков

**Компоненты**:
- **Repository Implementations**: Конкретные реализации репозиториев
- **ORM Entities**: Сущности для работы с БД
- **External Service Adapters**: Адаптеры для внешних API

**Пример репозитория**:
```typescript
@Injectable()
export class UserRepository implements UserRepositoryInterface {
  constructor(
    @InjectRepository(UserTypeOrmEntity)
    private readonly ormRepository: Repository<UserTypeOrmEntity>
  ) {}

  async save(user: User): Promise<User> {
    const ormEntity = this.toOrmEntity(user);
    const saved = await this.ormRepository.save(ormEntity);
    return this.toDomainEntity(saved);
  }
}
```

### 4. 🌐 Presentation Layer (Слой представления)

**Назначение**: Обрабатывает взаимодействие с внешним миром.

**Обязанности**:
- Обработка HTTP запросов
- Валидация входящих данных
- Сериализация ответов
- Авторизация и аутентификация

**Компоненты**:
- **Controllers**: Обрабатывают HTTP запросы
- **DTOs**: Объекты для передачи данных
- **Middleware**: Промежуточные обработчики

## 🚀 Запуск проекта

### Предварительные требования

- Node.js 18+
- PostgreSQL 12+
- npm или yarn

### Установка

1. **Клонирование репозитория**:
```bash
git clone <repository-url>
cd nestjs-ddd-example
```

2. **Установка зависимостей**:
```bash
npm install
```

3. **Настройка окружения**:
```bash
cp .env.example .env
# Отредактируйте .env файл с вашими настройками
```

4. **Настройка базы данных**:
```bash
# Создайте базу данных PostgreSQL
createdb ddd_example

# Или через psql:
psql -U postgres -c "CREATE DATABASE ddd_example;"
```

5. **Запуск приложения**:
```bash
# Режим разработки
npm run start:dev

# Режим production
npm run build
npm run start:prod
```

## 📋 API Endpoints

### 👥 Users

- `POST /users` - Создать пользователя
- `GET /users` - Получить всех пользователей
- `GET /users/:id` - Получить пользователя по ID
- `PUT /users/:id` - Обновить пользователя
- `PUT /users/:id/activate` - Активировать пользователя
- `PUT /users/:id/block` - Заблокировать пользователя
- `PUT /users/:id/verify-email` - Подтвердить email
- `DELETE /users/:id` - Удалить пользователя
- `GET /users/stats/overview` - Статистика пользователей
- `GET /users/:id/recommendations` - Рекомендации для пользователя

### 📖 Документация API

После запуска приложения, Swagger документация доступна по адресу:
```
http://localhost:3000/api/docs
```

## 🧪 Примеры использования

### Создание пользователя

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Получение пользователя

```bash
curl http://localhost:3000/users/USER_ID
```

### Активация пользователя

```bash
curl -X PUT http://localhost:3000/users/USER_ID/activate
```

## 🎯 Ключевые особенности примера

### ✅ Что демонстрирует проект

1. **Правильное разделение на слои**
   - Четкие границы между слоями
   - Инверсия зависимостей
   - Чистая архитектура

2. **Доменная модель**
   - Rich Domain Model
   - Инкапсуляция бизнес-логики
   - Объекты-значения с валидацией

3. **Агрегаты и корни агрегатов**
   - User как корень агрегата
   - Инкапсуляция инвариантов
   - Управление доменными событиями

4. **Доменные события**
   - Публикация событий при изменениях
   - Слабая связанность между агрегатами
   - Возможность интеграции с внешними системами

5. **Спецификации**
   - Инкапсуляция бизнес-правил
   - Переиспользование логики
   - Комбинирование условий

6. **Фабрики**
   - Создание сложных объектов
   - Валидация при создании
   - Скрытие сложности конструирования

7. **Репозиторий паттерн**
   - Абстракция доступа к данным
   - Маппинг между доменными и инфраструктурными сущностями
   - Обработка доменных событий

8. **Валидация на разных уровнях**
   - Доменная валидация (бизнес-правила)
   - Валидация DTO (структура данных)
   - Валидация команд

9. **Обработка ошибок**
   - Доменные исключения
   - Правильная обработка в контроллерах

### 🔍 Важные детали реализации

1. **Объекты-значения** (`Email`, `UserName`)
   - Неизменяемость
   - Инкапсуляция валидации
   - Выразительность модели

2. **Агрегаты и события**
   - User как корень агрегата
   - Автоматическая публикация событий
   - Очистка событий после обработки

3. **Спецификации**
   - `UserCanBeActivatedSpecification`
   - `UserCanBeDeletedSpecification` 
   - `PremiumUserSpecification`
   - Комбинирование через AND/OR/NOT

4. **Фабрики**
   - `UserFactory.create()` для новых пользователей
   - `UserFactory.restore()` для восстановления из БД
   - `UserFactory.createTestUser()` для тестов

5. **Доменные сервисы**
   - Простой `UserDomainService`
   - Расширенный `UserDomainServiceEnhanced`
   - Использование спецификаций

6. **Команды и запросы**
   - CQRS подход
   - Четкое разделение намерений

7. **Dependency Injection**
   - Правильная настройка DI
   - Связывание интерфейсов с реализациями

## 📚 Рекомендации по изучению

### Порядок изучения кода

1. **Начните с базовых концепций**:
   - `src/shared/domain/` - базовые классы для всех доменов
   - `README.md` - общая архитектура
   - `ADVANCED_DDD_PATTERNS.md` - продвинутые паттерны с примерами

2. **Изучите доменный слой**:
   - `src/user/domain/entities/user-aggregate.ts` - основной агрегат
   - `src/user/domain/value-objects/` - объекты-значения
   - `src/user/domain/events/` - доменные события
   - `src/user/domain/specifications/` - спецификации бизнес-правил
   - `src/user/domain/factories/user.factory.ts` - фабрика пользователей
   - `src/user/domain/services/` - доменные сервисы

3. **Изучите слой приложения**:
   - `src/user/application/services/user.application-service.ts`
   - `src/user/application/commands/`

4. **Посмотрите на инфраструктуру**:
   - `src/user/infrastructure/repositories/user-aggregate.repository.ts`
   - `src/user/infrastructure/entities/user.typeorm-entity.ts`

5. **Завершите презентационным слоем**:
   - `src/user/presentation/controllers/user.controller.ts`
   - `src/user/presentation/dto/`

### Эксперименты

1. **Изучите продвинутые паттерны**:
   - Прочитайте `ADVANCED_DDD_PATTERNS.md`
   - Попробуйте примеры кода из документации
   - Создайте свои спецификации

2. **Добавьте новую функциональность**:
   - Реализуйте смену пароля с событиями
   - Добавьте роли пользователей как отдельный агрегат
   - Создайте систему уведомлений на основе событий

3. **Расширьте домен Order**:
   - Добавьте все слои архитектуры
   - Реализуйте взаимодействие с User доменом через события
   - Создайте API для заказов

4. **Добавьте новый домен**:
   - Product (товары) с агрегатом и событиями
   - Category (категории) как корень агрегата
   - Review (отзывы) с спецификациями модерации

## 🛠️ Расширение проекта

### Добавление нового домена

1. Создайте структуру папок
2. Реализуйте доменный слой
3. Добавьте слой приложения
4. Создайте инфраструктуру
5. Реализуйте презентационный слой
6. Настройте модуль

### Интеграция с внешними сервисами

- Email сервисы
- Push уведомления
- Платежные системы
- Аналитика

### Добавление middleware

- Логирование
- Метрики
- Кэширование
- Безопасность

## 🔐 Безопасность

Для production использования добавьте:

- JWT аутентификация
- Валидация входных данных
- Rate limiting
- HTTPS
- Шифрование паролей
- Аудит логи

## 📊 Мониторинг и логирование

Рекомендуется добавить:

- Structured logging
- Metrics сбор
- Health checks
- Error tracking
- Performance monitoring

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch
3. Добавьте подробные комментарии
4. Создайте Pull Request

## 📖 Дополнительные ресурсы

### Книги по DDD
- "Domain-Driven Design" - Eric Evans
- "Implementing Domain-Driven Design" - Vaughn Vernon
- "Clean Architecture" - Robert Martin

### Статьи и блоги
- [DDD Community](https://dddcommunity.org/)
- [Martin Fowler's Blog](https://martinfowler.com/)

### Видео и курсы
- Pluralsight DDD courses
- YouTube: "DDD Europe" channel

---

## 📄 Лицензия

MIT License - см. файл LICENSE для деталей.

---

**Важно**: Этот проект создан исключительно в образовательных целях. Для production использования требуется дополнительная настройка безопасности, тестирование и оптимизация.

🎓 **Счастливого изучения DDD!** 