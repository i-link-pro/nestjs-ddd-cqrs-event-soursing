import { Injectable } from '@nestjs/common';
import { CommandHandler } from '@shared/application/command.interface';
import { CreateUserCommand } from '../create-user.command';
import { User } from '../../../domain/entities/user-aggregate';
import { UserFactory } from '../../../domain/factories/user.factory';
import { UserRepositoryInterface } from '../../../domain/repositories/user.repository.interface';
import { UserDomainService } from '../../../domain/services/user.domain-service';

/**
 * Обработчик команды создания пользователя в CQRS архитектуре
 * 
 * В CQRS обработчики команд отвечают за:
 * 1. Валидацию команды
 * 2. Выполнение бизнес-логики
 * 3. Сохранение изменений
 * 4. Публикацию событий
 * 
 * Каждая команда имеет свой специализированный обработчик.
 */
@Injectable()
export class CreateUserHandler implements CommandHandler<CreateUserCommand, User> {
  constructor(
    private readonly userRepository: UserRepositoryInterface,
    private readonly userDomainService: UserDomainService
  ) {}

  async handle(command: CreateUserCommand): Promise<User> {
    console.log(`🎯 Обрабатываем команду: CreateUserCommand для ${command.email}`);

    // 1. Валидация команды (структурная)
    command.validate();

    // 2. Создание объектов-значений и доменных сущностей
    const user = UserFactory.create({
      email: command.email,
      firstName: command.firstName,
      lastName: command.lastName
    });

    // 3. Доменная валидация (бизнес-правила)
    await this.userDomainService.validateEmailUniqueness(user.email);

    // 4. Сохранение агрегата (события будут опубликованы)
    const savedUser = await this.userRepository.save(user);

    console.log(`✅ Пользователь создан через CQRS: ${savedUser.id}`);
    
    return savedUser;
  }
} 