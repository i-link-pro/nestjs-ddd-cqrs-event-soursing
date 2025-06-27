import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { UserTypeOrmEntity } from './infrastructure/entities/user.typeorm-entity';

// Controllers
import { UserController } from './presentation/controllers/user.controller';
import { UserCqrsController } from './presentation/controllers/user-cqrs.controller';
import { UserEventSourcingController } from './presentation/controllers/user-event-sourcing.controller';

// Domain Services
import { UserDomainService } from './domain/services/user.domain-service';
import { UserDomainServiceEnhanced } from './domain/services/user-domain-service.enhanced';

// Application Services
import { UserApplicationService } from './application/services/user.application-service';
import { UserCqrsService } from './application/services/user-cqrs.service';

// Repository interfaces and implementations
import { UserRepositoryInterface } from './domain/repositories/user.repository.interface';
import { UserRepository } from './infrastructure/repositories/user.repository';
import { UserAggregateRepository } from './infrastructure/repositories/user-aggregate.repository';

// CQRS Read Model components
import { UserReadModelRepositoryInterface } from './infrastructure/read-models/user-read-model.repository.interface';
import { UserReadModelRepository } from './infrastructure/read-models/user-read-model.repository';

// CQRS Command Handlers
import { CreateUserHandler } from './application/commands/handlers/create-user.handler';
import { UpdateUserHandler } from './application/commands/handlers/update-user.handler';
import { ActivateUserHandler } from './application/commands/handlers/activate-user.handler';

// CQRS Query Handlers
import { GetUserHandler, GetUserByEmailHandler } from './application/queries/handlers/get-user.handler';
import { GetUsersHandler } from './application/queries/handlers/get-users.handler';
import { 
  GetUserAnalyticsHandler, 
  GetUserRecommendationsHandler, 
  GetUserHealthCheckHandler 
} from './application/queries/handlers/user-analytics.handler';

// CQRS Infrastructure
import { SimpleMediator } from '@shared/application/mediator.interface';

// Event Sourcing
import { EventStore } from '../shared/event-sourcing/event-store.interface';
import { InMemoryEventStore } from './infrastructure/event-sourcing/in-memory-event-store';
import { UserEventSourcedRepository } from './infrastructure/event-sourcing/user-event-sourced.repository';

// Токены для DI
export const USER_REPOSITORY_TOKEN = 'USER_REPOSITORY';
export const USER_READ_MODEL_REPOSITORY_TOKEN = 'USER_READ_MODEL_REPOSITORY';
export const EVENT_STORE_TOKEN = 'EVENT_STORE';

/**
 * Модуль домена пользователей с поддержкой CQRS и Event Sourcing
 * 
 * Этот модуль демонстрирует:
 * 1. Классическую DDD архитектуру
 * 2. CQRS паттерн с разделением команд и запросов
 * 3. Read Models для оптимизированного чтения
 * 4. Command и Query handlers
 * 5. Медиатор для развязки компонентов
 * 6. Event Sourcing для хранения состояния как последовательности событий
 * 7. Event Store для персистентности событий
 * 8. Снимки (Snapshots) для оптимизации производительности
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserTypeOrmEntity])
  ],
  controllers: [
    UserController,              // Классический DDD контроллер
    UserCqrsController,         // CQRS контроллер
    UserEventSourcingController // Event Sourcing контроллер
  ],
  providers: [
    // === ДОМЕННЫЕ СЕРВИСЫ ===
    UserDomainService,
    UserDomainServiceEnhanced,

    // === СЕРВИСЫ ПРИЛОЖЕНИЯ ===
    UserApplicationService,  // Классический подход
    UserCqrsService,        // CQRS подход

    // === РЕПОЗИТОРИИ ===
    {
      provide: USER_REPOSITORY_TOKEN,
      useClass: UserAggregateRepository  // Используем агрегат репозиторий по умолчанию
    },
    UserRepository,  // Простой репозиторий для совместимости
    UserAggregateRepository,  // Агрегат репозиторий

    // === CQRS READ MODELS ===
    {
      provide: USER_READ_MODEL_REPOSITORY_TOKEN,
      useClass: UserReadModelRepository
    },

    // === EVENT SOURCING ===
    {
      provide: EVENT_STORE_TOKEN,
      useClass: InMemoryEventStore
    },
    InMemoryEventStore,
    UserEventSourcedRepository,

    // === CQRS COMMAND HANDLERS ===
    CreateUserHandler,
    UpdateUserHandler,
    ActivateUserHandler,

    // === CQRS QUERY HANDLERS ===
    GetUserHandler,
    GetUserByEmailHandler,
    GetUsersHandler,
    GetUserAnalyticsHandler,
    GetUserRecommendationsHandler,
    GetUserHealthCheckHandler,

    // === CQRS МЕДИАТОР ===
    {
      provide: SimpleMediator,
      useFactory: (
        // Command Handlers
        createUserHandler: CreateUserHandler,
        updateUserHandler: UpdateUserHandler,
        activateUserHandler: ActivateUserHandler,
        
        // Query Handlers
        getUserHandler: GetUserHandler,
        getUserByEmailHandler: GetUserByEmailHandler,
        getUsersHandler: GetUsersHandler,
        getUserAnalyticsHandler: GetUserAnalyticsHandler,
        getUserRecommendationsHandler: GetUserRecommendationsHandler,
        getUserHealthCheckHandler: GetUserHealthCheckHandler
      ) => {
        const mediator = new SimpleMediator();

        // Регистрируем Command Handlers
        mediator.registerCommandHandler(
          require('./application/commands/create-user.command').CreateUserCommand,
          createUserHandler
        );
        mediator.registerCommandHandler(
          require('./application/commands/update-user.command').UpdateUserCommand,
          updateUserHandler
        );
        mediator.registerCommandHandler(
          require('./application/commands/handlers/activate-user.handler').ActivateUserCommand,
          activateUserHandler
        );

        // Регистрируем Query Handlers
        mediator.registerQueryHandler(
          require('./application/queries/get-user.query').GetUserQuery,
          getUserHandler
        );
        mediator.registerQueryHandler(
          require('./application/queries/get-user.query').GetUserByEmailQuery,
          getUserByEmailHandler
        );
        mediator.registerQueryHandler(
          require('./application/queries/get-user.query').GetUsersQuery,
          getUsersHandler
        );
        mediator.registerQueryHandler(
          require('./application/queries/user-analytics.query').GetUserAnalyticsQuery,
          getUserAnalyticsHandler
        );
        mediator.registerQueryHandler(
          require('./application/queries/user-analytics.query').GetUserRecommendationsQuery,
          getUserRecommendationsHandler
        );
        mediator.registerQueryHandler(
          require('./application/queries/user-analytics.query').GetUserHealthCheckQuery,
          getUserHealthCheckHandler
        );

        return mediator;
      },
      inject: [
        // Command Handlers
        CreateUserHandler,
        UpdateUserHandler,
        ActivateUserHandler,
        
        // Query Handlers
        GetUserHandler,
        GetUserByEmailHandler,
        GetUsersHandler,
        GetUserAnalyticsHandler,
        GetUserRecommendationsHandler,
        GetUserHealthCheckHandler
      ]
    }
  ],
  exports: [
    // Экспортируем для использования в других модулях
    UserApplicationService,
    UserCqrsService,
    USER_REPOSITORY_TOKEN,
    USER_READ_MODEL_REPOSITORY_TOKEN,
    UserDomainService,
    UserDomainServiceEnhanced
  ],
})
export class UserModule {} 