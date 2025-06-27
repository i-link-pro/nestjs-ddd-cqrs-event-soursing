import { Injectable } from '@nestjs/common';
import { CommandHandler } from '@shared/application/command.interface';
import { UpdateUserCommand } from '../update-user.command';
import { User } from '../../../domain/entities/user-aggregate';
import { UserRepositoryInterface } from '../../../domain/repositories/user.repository.interface';
import { UserDomainService } from '../../../domain/services/user.domain-service';
import { Email } from '../../../domain/value-objects/email';
import { UserName } from '../../../domain/value-objects/user-name';

/**
 * Обработчик команды обновления пользователя в CQRS архитектуре
 */
@Injectable()
export class UpdateUserHandler implements CommandHandler<UpdateUserCommand, User> {
  constructor(
    private readonly userRepository: UserRepositoryInterface,
    private readonly userDomainService: UserDomainService
  ) {}

  async handle(command: UpdateUserCommand): Promise<User> {
    console.log(`🎯 Обрабатываем команду: UpdateUserCommand для ${command.userId}`);

    // 1. Валидация команды
    command.validate();

    // 2. Загрузка агрегата
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new Error(`Пользователь с ID ${command.userId} не найден`);
    }

    // 3. Обновление имени, если предоставлено
    if (command.firstName || command.lastName) {
      const firstName = command.firstName || user.userName.firstName;
      const lastName = command.lastName || user.userName.lastName;
      const newUserName = UserName.create(firstName, lastName);
      user.changeUserName(newUserName);
    }

    // 4. Обновление email, если предоставлен
    if (command.email) {
      const newEmail = Email.create(command.email);
      await this.userDomainService.validateEmailChange(user, newEmail);
      user.changeEmail(newEmail);
    }

    // 5. Сохранение изменений
    const updatedUser = await this.userRepository.update(user);

    console.log(`✅ Пользователь обновлен через CQRS: ${updatedUser.id}`);
    
    return updatedUser;
  }
} 