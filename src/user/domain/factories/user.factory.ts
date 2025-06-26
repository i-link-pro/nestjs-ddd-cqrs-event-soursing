import { User, UserStatus } from '../entities/user-aggregate';
import { Email } from '../value-objects/email';
import { UserName } from '../value-objects/user-name';

/**
 * Интерфейс для данных создания пользователя
 */
export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  autoVerifyEmail?: boolean;
  initialStatus?: UserStatus;
}

/**
 * Интерфейс для данных восстановления пользователя из БД
 */
export interface RestoreUserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  emailVerifiedAt?: Date;
}

/**
 * Фабрика для создания и восстановления пользователей
 * 
 * В DDD фабрики отвечают за создание сложных объектов и агрегатов.
 * Они инкапсулируют логику создания и обеспечивают:
 * - Правильную инициализацию объектов
 * - Валидацию при создании
 * - Скрытие сложности конструирования
 * - Единообразное создание объектов
 */
export class UserFactory {
  
  /**
   * Создать нового пользователя
   * @param data - данные для создания пользователя
   * @returns новый экземпляр пользователя
   */
  static create(data: CreateUserData): User {
    // Валидация входных данных
    this.validateCreateData(data);

    // Создание объектов-значений
    const email = Email.create(data.email);
    const userName = UserName.create(data.firstName, data.lastName);

    // Создание пользователя
    const user = new User(
      email,
      userName,
      undefined, // ID будет сгенерирован автоматически
      data.initialStatus || UserStatus.PENDING
    );

    // Автоматическая верификация email, если требуется
    if (data.autoVerifyEmail) {
      user.verifyEmail();
    }

    return user;
  }

  /**
   * Создать пользователя с автоматической верификацией email
   * Удобный метод для административного создания пользователей
   */
  static createVerified(email: string, firstName: string, lastName: string): User {
    return this.create({
      email,
      firstName,
      lastName,
      autoVerifyEmail: true,
      initialStatus: UserStatus.ACTIVE
    });
  }

  /**
   * Создать тестового пользователя
   * Для использования в тестах и разработке
   */
  static createTestUser(
    emailPrefix: string = 'test',
    domain: string = 'example.com'
  ): User {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    
    return this.create({
      email: `${emailPrefix}_${timestamp}_${randomSuffix}@${domain}`,
      firstName: 'Test',
      lastName: 'User',
      autoVerifyEmail: true,
      initialStatus: UserStatus.ACTIVE
    });
  }

  /**
   * Восстановить пользователя из данных персистентности
   * Используется репозиторием при загрузке из БД
   */
  static restore(data: RestoreUserData): User {
    // Валидация данных восстановления
    this.validateRestoreData(data);

    // Создание объектов-значений
    const email = new Email(data.email);
    const userName = new UserName(data.firstName, data.lastName);

    // Восстановление пользователя без событий
    return User.restore(
      data.id,
      email,
      userName,
      data.status,
      data.createdAt,
      data.updatedAt,
      data.lastLoginAt,
      data.emailVerifiedAt
    );
  }

  /**
   * Создать пользователя из внешних данных (например, OAuth)
   */
  static createFromExternalProvider(
    providerId: string,
    email: string,
    firstName: string,
    lastName: string,
    isEmailVerified: boolean = true
  ): User {
    const userData: CreateUserData = {
      email,
      firstName,
      lastName,
      autoVerifyEmail: isEmailVerified,
      initialStatus: isEmailVerified ? UserStatus.ACTIVE : UserStatus.PENDING
    };

    const user = this.create(userData);
    
    // Здесь можно добавить логику связывания с внешним провайдером
    // Например, добавить доменное событие о создании через OAuth
    
    return user;
  }

  /**
   * Валидация данных для создания пользователя
   */
  private static validateCreateData(data: CreateUserData): void {
    if (!data.email?.trim()) {
      throw new Error('Email обязателен для создания пользователя');
    }

    if (!data.firstName?.trim()) {
      throw new Error('Имя обязательно для создания пользователя');
    }

    if (!data.lastName?.trim()) {
      throw new Error('Фамилия обязательна для создания пользователя');
    }

    // Дополнительные валидации могут быть добавлены здесь
  }

  /**
   * Валидация данных для восстановления пользователя
   */
  private static validateRestoreData(data: RestoreUserData): void {
    if (!data.id?.trim()) {
      throw new Error('ID обязателен для восстановления пользователя');
    }

    if (!data.email?.trim()) {
      throw new Error('Email обязателен для восстановления пользователя');
    }

    if (!data.firstName?.trim()) {
      throw new Error('Имя обязательно для восстановления пользователя');
    }

    if (!data.lastName?.trim()) {
      throw new Error('Фамилия обязательна для восстановления пользователя');
    }

    if (!Object.values(UserStatus).includes(data.status)) {
      throw new Error(`Недопустимый статус пользователя: ${data.status}`);
    }

    if (!(data.createdAt instanceof Date)) {
      throw new Error('Дата создания должна быть объектом Date');
    }

    if (!(data.updatedAt instanceof Date)) {
      throw new Error('Дата обновления должна быть объектом Date');
    }
  }
} 