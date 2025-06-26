import { Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email';
import { UserName } from '../../domain/value-objects/user-name';
import { UserRepositoryInterface } from '../../domain/repositories/user.repository.interface';
import { UserDomainService } from '../../domain/services/user.domain-service';
import { CreateUserCommand } from '../commands/create-user.command';
import { UpdateUserCommand } from '../commands/update-user.command';

/**
 * Сервис приложения для работы с пользователями
 * 
 * Сервисы приложения в DDD:
 * 1. Оркестрируют выполнение бизнес-операций
 * 2. Координируют работу между доменными объектами
 * 3. Управляют транзакциями
 * 4. Не содержат бизнес-логику (она в доменном слое)
 * 
 * Это слой между презентационным и доменным слоем.
 */
@Injectable()
export class UserApplicationService {
  constructor(
    private readonly userRepository: UserRepositoryInterface,
    private readonly userDomainService: UserDomainService
  ) {}

  /**
   * Создать нового пользователя
   * @param command - команда создания пользователя
   * @returns Promise с созданным пользователем
   */
  async createUser(command: CreateUserCommand): Promise<User> {
    // 1. Валидация команды
    command.validate();

    // 2. Создание объектов-значений
    const email = Email.create(command.email);
    const userName = UserName.create(command.firstName, command.lastName);

    // 3. Доменная валидация (проверка уникальности email)
    await this.userDomainService.validateEmailUniqueness(email);

    // 4. Создание доменной сущности
    const user = new User(email, userName);

    // 5. Сохранение через репозиторий
    const savedUser = await this.userRepository.save(user);

    console.log(`✅ Пользователь создан: ${savedUser.email.value}`);
    
    return savedUser;
  }

  /**
   * Получить пользователя по ID
   * @param userId - ID пользователя
   * @returns Promise с найденным пользователем
   * @throws Error если пользователь не найден
   */
  async getUserById(userId: string): Promise<User> {
    if (!userId?.trim()) {
      throw new Error('ID пользователя обязателен');
    }

    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new Error(`Пользователь с ID ${userId} не найден`);
    }

    return user;
  }

  /**
   * Получить пользователя по email
   * @param email - email пользователя
   * @returns Promise с найденным пользователем
   * @throws Error если пользователь не найден
   */
  async getUserByEmail(email: string): Promise<User> {
    if (!email?.trim()) {
      throw new Error('Email обязателен');
    }

    const emailVO = Email.create(email);
    const user = await this.userRepository.findByEmail(emailVO);
    
    if (!user) {
      throw new Error(`Пользователь с email ${email} не найден`);
    }

    return user;
  }

  /**
   * Получить всех пользователей
   * @returns Promise с массивом всех пользователей
   */
  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.findAll();
  }

  /**
   * Обновить пользователя
   * @param command - команда обновления пользователя
   * @returns Promise с обновленным пользователем
   */
  async updateUser(command: UpdateUserCommand): Promise<User> {
    // 1. Валидация команды
    command.validate();

    // 2. Получение существующего пользователя
    const user = await this.getUserById(command.userId);

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

    console.log(`✅ Пользователь обновлен: ${updatedUser.id}`);
    
    return updatedUser;
  }

  /**
   * Активировать пользователя
   * @param userId - ID пользователя
   * @returns Promise с активированным пользователем
   */
  async activateUser(userId: string): Promise<User> {
    const user = await this.getUserById(userId);
    
    user.activate();
    
    const updatedUser = await this.userRepository.update(user);
    
    console.log(`✅ Пользователь активирован: ${updatedUser.email.value}`);
    
    return updatedUser;
  }

  /**
   * Заблокировать пользователя
   * @param userId - ID пользователя
   * @returns Promise с заблокированным пользователем
   */
  async blockUser(userId: string): Promise<User> {
    const user = await this.getUserById(userId);
    
    user.block();
    
    const updatedUser = await this.userRepository.update(user);
    
    console.log(`⚠️ Пользователь заблокирован: ${updatedUser.email.value}`);
    
    return updatedUser;
  }

  /**
   * Подтвердить email пользователя
   * @param userId - ID пользователя
   * @returns Promise с пользователем с подтвержденным email
   */
  async verifyUserEmail(userId: string): Promise<User> {
    const user = await this.getUserById(userId);
    
    user.verifyEmail();
    
    const updatedUser = await this.userRepository.update(user);
    
    console.log(`✅ Email подтвержден: ${updatedUser.email.value}`);
    
    return updatedUser;
  }

  /**
   * Удалить пользователя
   * @param userId - ID пользователя
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    
    // Проверка возможности удаления через доменный сервис
    const canDelete = await this.userDomainService.canUserBeDeleted(user);
    
    if (!canDelete.canDelete) {
      throw new Error(canDelete.reason || 'Пользователь не может быть удален');
    }
    
    await this.userRepository.delete(userId);
    
    console.log(`🗑️ Пользователь удален: ${user.email.value}`);
  }

  /**
   * Получить статистику пользователей
   * @returns Promise с объектом статистики
   */
  async getUsersStatistics(): Promise<{
    total: number;
    byStatus: {
      active: number;
      inactive: number;
      blocked: number;
      pending: number;
    };
  }> {
    const [allUsers, statusCounts] = await Promise.all([
      this.userRepository.findAll(),
      this.userRepository.getUsersCountByStatus()
    ]);

    return {
      total: allUsers.length,
      byStatus: statusCounts
    };
  }

  /**
   * Получить рекомендации для пользователя
   * @param userId - ID пользователя
   * @returns Promise с массивом рекомендаций
   */
  async getUserRecommendations(userId: string): Promise<string[]> {
    const user = await this.getUserById(userId);
    return this.userDomainService.generateUserRecommendations(user);
  }
} 