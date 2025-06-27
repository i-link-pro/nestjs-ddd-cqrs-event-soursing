# CQRS Примеры использования

🎯 **Практические примеры использования CQRS паттерна в NestJS DDD проекте**

Этот документ содержит подробные примеры команд и запросов для демонстрации CQRS архитектуры.

## 📑 Содержание

1. [Команды (Commands) - Изменение состояния](#команды-commands---изменение-состояния)
2. [Запросы (Queries) - Чтение данных](#запросы-queries---чтение-данных)
3. [Сравнение Classic vs CQRS](#сравнение-classic-vs-cqrs)
4. [Демонстрационные сценарии](#демонстрационные-сценарии)
5. [Мониторинг и логирование](#мониторинг-и-логирование)

---

## Команды (Commands) - Изменение состояния

### 🆕 Создание пользователя

```bash
# CQRS Command
curl -X POST http://localhost:3000/cqrs/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "firstName": "Alice",
    "lastName": "Smith"
  }'
```

**Ожидаемый ответ:**
```json
{
  "message": "Пользователь создан через CQRS",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alice@example.com",
    "userName": {
      "firstName": "Alice",
      "lastName": "Smith",
      "fullName": "Alice Smith"
    },
    "status": "pending",
    "isEmailVerified": false
  },
  "pattern": "Command"
}
```

### ✏️ Обновление пользователя

```bash
# Обновление имени
curl -X PUT http://localhost:3000/cqrs/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Alicia"
  }'

# Обновление email
curl -X PUT http://localhost:3000/cqrs/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alicia.smith@example.com"
  }'

# Полное обновление
curl -X PUT http://localhost:3000/cqrs/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alicia.updated@example.com",
    "firstName": "Alicia",
    "lastName": "Johnson"
  }'
```

### 🔄 Активация пользователя

```bash
curl -X PUT http://localhost:3000/cqrs/users/550e8400-e29b-41d4-a716-446655440000/activate
```

**Ожидаемый ответ:**
```json
{
  "message": "Пользователь активирован через CQRS",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active"
  },
  "pattern": "Command"
}
```

---

## Запросы (Queries) - Чтение данных

### 👤 Получение пользователя по ID

```bash
curl http://localhost:3000/cqrs/users/550e8400-e29b-41d4-a716-446655440000
```

**Ожидаемый ответ (Read Model):**
```json
{
  "message": "Пользователь получен через CQRS Query",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alice@example.com",
    "firstName": "Alice",
    "lastName": "Smith",
    "fullName": "Alice Smith",
    "status": "active",
    "isEmailVerified": true,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:45:00.000Z",
    "lastLoginAt": "2024-01-15T11:30:00.000Z",
    "emailVerifiedAt": "2024-01-15T10:35:00.000Z",
    "daysSinceLastLogin": 0,
    "daysSinceCreation": 5,
    "trustLevel": "high",
    "isPremium": true
  },
  "pattern": "Query",
  "readModel": true
}
```

### 📋 Получение списка пользователей с фильтрацией

```bash
# Базовый запрос
curl "http://localhost:3000/cqrs/users"

# С пагинацией
curl "http://localhost:3000/cqrs/users?page=1&limit=5"

# С фильтрацией по статусу
curl "http://localhost:3000/cqrs/users?status=active"

# С фильтрацией по подтверждению email
curl "http://localhost:3000/cqrs/users?emailVerified=true"

# Комплексная фильтрация
curl "http://localhost:3000/cqrs/users?page=2&limit=10&status=active&emailVerified=true&sortBy=createdAt&sortOrder=DESC"
```

**Ожидаемый ответ:**
```json
{
  "message": "Список пользователей получен через CQRS Query",
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "alice@example.com",
        "fullName": "Alice Smith",
        "trustLevel": "high",
        "isPremium": true,
        "daysSinceCreation": 5
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrevious": false
    }
  },
  "pattern": "Query",
  "readModel": true
}
```

### 📊 Аналитика пользователей

```bash
# Аналитика за месяц (по умолчанию)
curl "http://localhost:3000/cqrs/users/analytics/overview"

# Аналитика за день
curl "http://localhost:3000/cqrs/users/analytics/overview?period=day"

# Аналитика за неделю
curl "http://localhost:3000/cqrs/users/analytics/overview?period=week"

# Аналитика за год
curl "http://localhost:3000/cqrs/users/analytics/overview?period=year"
```

**Ожидаемый ответ:**
```json
{
  "message": "Аналитика получена через CQRS Query",
  "data": {
    "period": "month",
    "timestamp": "2024-01-15T12:00:00.000Z",
    "overview": {
      "totalUsers": 1000,
      "activeUsers": 750,
      "emailVerifiedUsers": 800,
      "premiumUsers": 150,
      "activeRate": "75.00%",
      "verificationRate": "80.00%",
      "premiumRate": "15.00%"
    },
    "statusDistribution": {
      "active": 750,
      "pending": 200,
      "blocked": 50
    },
    "trustLevelDistribution": {
      "low": 200,
      "medium": 400,
      "high": 300,
      "premium": 100
    },
    "periodData": {
      "period": "month",
      "startDate": "2023-12-15T12:00:00.000Z",
      "endDate": "2024-01-15T12:00:00.000Z",
      "trends": {
        "registrations": "Примерный тренд за month",
        "activations": "Примерный тренд за month",
        "emailVerifications": "Примерный тренд за month"
      }
    }
  },
  "pattern": "Query",
  "period": "month"
}
```

---

## Сравнение Classic vs CQRS

### 🔄 Создание пользователя

**Классический подход:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@example.com",
    "firstName": "Bob",
    "lastName": "Wilson"
  }'
```

**CQRS подход:**
```bash
curl -X POST http://localhost:3000/cqrs/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@example.com",
    "firstName": "Bob",
    "lastName": "Wilson"
  }'
```

### 📖 Получение пользователя

**Классический ответ:**
```json
{
  "id": "user-id",
  "email": "bob@example.com",
  "userName": {
    "firstName": "Bob",
    "lastName": "Wilson"
  },
  "status": "pending"
}
```

**CQRS ответ (Read Model):**
```json
{
  "id": "user-id",
  "email": "bob@example.com",
  "firstName": "Bob",
  "lastName": "Wilson",
  "fullName": "Bob Wilson",
  "status": "pending",
  "isEmailVerified": false,
  "isActive": false,
  "daysSinceCreation": 0,
  "trustLevel": "low",
  "isPremium": false,
  "readModel": true
}
```

### 🎯 Ключевые различия

| Аспект | Классический | CQRS |
|--------|-------------|------|
| **Модель данных** | Domain Model | Read Model |
| **Оптимизация** | Универсальная | Специализированная |
| **Предвычисления** | Нет | Да (trustLevel, isPremium) |
| **Сложность** | Простая | Средняя |
| **Производительность** | Стандартная | Оптимизированная |

---

## Демонстрационные сценарии

### 🎭 Сценарий 1: Создание и анализ

```bash
curl -X POST http://localhost:3000/cqrs/users/demo/create-and-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "firstName": "Demo",
    "lastName": "User"
  }'
```

**Что происходит:**
1. ✅ **Command**: Создание пользователя
2. 📖 **Query**: Получение Read Model
3. 📊 **Query**: Получение аналитики
4. 🔄 **Демонстрация**: Показ разделения команд и запросов

**Ожидаемый ответ:**
```json
{
  "message": "Демонстрация CQRS: создание и анализ",
  "data": {
    "user": { /* созданный пользователь */ },
    "readModel": { /* Read Model с предвычислениями */ },
    "analytics": { /* текущая аналитика */ }
  },
  "explanation": {
    "command": "Создание пользователя изменило состояние системы",
    "query1": "Получение Read Model для UI",
    "query2": "Получение аналитики для дашборда",
    "benefits": [
      "Разделение ответственности",
      "Оптимизированные модели чтения",
      "Масштабируемость запросов и команд"
    ]
  }
}
```

### 🎭 Сценарий 2: Пакетные операции

```bash
curl -X POST http://localhost:3000/cqrs/users/demo/batch-operations \
  -H "Content-Type: application/json" \
  -d '[
    {
      "type": "create",
      "data": {
        "email": "batch1@example.com",
        "firstName": "Batch",
        "lastName": "User1"
      }
    },
    {
      "type": "create",
      "data": {
        "email": "batch2@example.com", 
        "firstName": "Batch",
        "lastName": "User2"
      }
    },
    {
      "type": "activate",
      "data": {
        "userId": "existing-user-id"
      }
    }
  ]'
```

**Ожидаемый ответ:**
```json
{
  "message": "Пакетные операции через CQRS выполнены",
  "data": [
    {
      "success": true,
      "operation": "create",
      "result": { /* созданный пользователь 1 */ }
    },
    {
      "success": true,
      "operation": "create", 
      "result": { /* созданный пользователь 2 */ }
    },
    {
      "success": false,
      "operation": "activate",
      "error": "Пользователь с ID existing-user-id не найден"
    }
  ],
  "summary": {
    "total": 3,
    "successful": 2,
    "failed": 1
  },
  "pattern": "CQRS Batch Processing"
}
```

---

## Мониторинг и логирование

### 📊 Логи в консоли

При выполнении команд и запросов в консоли сервера будут отображаться логи:

```
🎯 CQRS Command: CreateUser для alice@example.com
🏭 UserFactory: создание нового пользователя alice@example.com
✅ Пользователь создан: 550e8400-e29b-41d4-a716-446655440000
📨 Доменное событие добавлено: UserCreatedEvent
✅ Пользователь создан через CQRS: 550e8400-e29b-41d4-a716-446655440000

📖 CQRS Query: GetUser для 550e8400-e29b-41d4-a716-446655440000
✅ Пользователь найден: alice@example.com

📊 CQRS Query: GetUserAnalytics (период: month)
✅ Аналитика рассчитана: 1000 пользователей проанализировано
```

### 🔍 Мониторинг производительности

```bash
# Создание пользователя (измерение времени)
time curl -X POST http://localhost:3000/cqrs/users \
  -H "Content-Type: application/json" \
  -d '{"email":"perf@test.com","firstName":"Performance","lastName":"Test"}'

# Запрос пользователя (измерение времени)
time curl http://localhost:3000/cqrs/users/USER_ID
```

### 📈 Сравнение производительности

```bash
# Классический подход
time curl http://localhost:3000/users

# CQRS подход (с Read Model)
time curl http://localhost:3000/cqrs/users
```

**Ожидаемые результаты:**
- CQRS запросы должны быть быстрее благодаря Read Models
- Команды могут быть немного медленнее из-за дополнительных слоев
- Аналитические запросы значительно быстрее с предвычислениями

---

## 🎯 Практические упражнения

### 1. Базовые операции
1. Создайте 5 пользователей через CQRS
2. Активируйте 3 из них
3. Получите список активных пользователей
4. Посмотрите аналитику

### 2. Сравнение подходов
1. Создайте пользователя через классический API
2. Создайте пользователя через CQRS API
3. Сравните ответы и время выполнения
4. Изучите логи в консоли

### 3. Продвинутые сценарии
1. Используйте пакетные операции
2. Протестируйте фильтрацию и сортировку
3. Получите аналитику за разные периоды
4. Создайте нагрузочный тест

### 4. Обработка ошибок
1. Попробуйте создать пользователя с некорректными данными
2. Попробуйте получить несуществующего пользователя
3. Попробуйте активировать заблокированного пользователя
4. Изучите обработку ошибок в CQRS

---

## 🚀 Следующие шаги

После изучения этих примеров попробуйте:

1. **Добавить новые команды**: DeleteUser, BlockUser, VerifyEmail
2. **Добавить новые запросы**: GetInactiveUsers, GetPremiumUsers
3. **Создать новые Read Models**: UserAnalyticsReadModel, UserStatsReadModel
4. **Реализовать кэширование**: для часто запрашиваемых Read Models
5. **Добавить валидацию**: более сложные бизнес-правила в спецификациях

---

🎓 **Изучение CQRS требует практики - экспериментируйте с примерами!** 