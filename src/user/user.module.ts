import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Domain
import { UserDomainService } from './domain/services/user.domain-service';

// Application  
import { UserApplicationService } from './application/services/user.application-service';

// Infrastructure
import { UserTypeOrmEntity } from './infrastructure/entities/user.typeorm-entity';
import { UserRepository } from './infrastructure/repositories/user.repository';
import { UserRepositoryInterface } from './domain/repositories/user.repository.interface';

// Presentation
import { UserController } from './presentation/controllers/user.controller';

/**
 * Модуль пользователей
 * 
 * В DDD каждый домен имеет свой модуль, который:
 * 1. Регистрирует все зависимости домена
 * 2. Экспортирует публичные сервисы для других доменов
 * 3. Инкапсулирует внутреннюю структуру домена
 * 
 * Важные принципы:
 * - Интерфейсы из доменного слоя связываются с реализациями из инфраструктуры
 * - Сервисы приложения используют интерфейсы, а не конкретные реализации
 * - Модуль скрывает детали реализации от других модулей
 */
@Module({
  imports: [
    // Регистрация TypeORM сущности для пользователей
    TypeOrmModule.forFeature([UserTypeOrmEntity])
  ],
  controllers: [
    // Регистрация контроллеров (презентационный слой)
    UserController
  ],
  providers: [
    // Доменный сервис
    UserDomainService,
    
    // Сервис приложения
    UserApplicationService,
    
    // Привязка интерфейса репозитория к его реализации
    // Это ключевой момент DDD - доменный слой зависит от абстракции,
    // а инфраструктурный слой предоставляет конкретную реализацию
    {
      provide: UserRepositoryInterface,
      useClass: UserRepository,
    },
    
    // Также регистрируем репозиторий как отдельный провайдер
    // для использования в сервисах
    UserRepository,
  ],
  exports: [
    // Экспортируем сервисы, которые могут понадобиться другим доменам
    UserApplicationService,
    UserDomainService,
    UserRepositoryInterface,
  ],
})
export class UserModule {
  constructor() {
    console.log('📦 UserModule инициализирован');
    console.log('🔗 Настроены зависимости:');
    console.log('   - UserController -> UserApplicationService');
    console.log('   - UserApplicationService -> UserRepositoryInterface');
    console.log('   - UserRepositoryInterface -> UserRepository (TypeORM)');
    console.log('   - UserApplicationService -> UserDomainService');
  }
} 