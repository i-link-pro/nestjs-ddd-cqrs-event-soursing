import { Injectable } from '@nestjs/common';
import { CommandHandler } from '@shared/application/command.interface';
import { User } from '../../../domain/entities/user-aggregate';
import { UserRepositoryInterface } from '../../../domain/repositories/user.repository.interface';
import { UserDomainServiceEnhanced } from '../../../domain/services/user-domain-service.enhanced';

/**
 * Команда активации пользователя
 */
export class ActivateUserCommand {
  constructor(public readonly userId: string) {}

  validate(): void {
    if (!this.userId?.trim()) {
      throw new Error('ID пользователя обязателен');
    }
  }
}

/**
 * Обработчик команды активации пользователя
 */
@Injectable()
export class ActivateUserHandler implements CommandHandler<ActivateUserCommand, User> {
  constructor(
    private readonly userRepository: UserRepositoryInterface,
    private readonly userDomainService: UserDomainServiceEnhanced
  ) {}

  async handle(command: ActivateUserCommand): Promise<User> {
    console.log(`🎯 Обрабатываем команду: ActivateUserCommand для ${command.userId}`);

    // 1. Валидация команды
    command.validate();

    // 2. Загрузка агрегата
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new Error(`Пользователь с ID ${command.userId} не найден`);
    }

    // 3. Проверка бизнес-правил через спецификацию
    const canActivate = this.userDomainService.canUserBeActivated(user);
    if (!canActivate.canActivate) {
      throw new Error(canActivate.reason || 'Пользователь не может быть активирован');
    }

    // 4. Выполнение доменной операции
    user.activate();

    // 5. Сохранение изменений
    const activatedUser = await this.userRepository.update(user);

    console.log(`✅ Пользователь активирован через CQRS: ${activatedUser.id}`);
    
    return activatedUser;
  }
} 