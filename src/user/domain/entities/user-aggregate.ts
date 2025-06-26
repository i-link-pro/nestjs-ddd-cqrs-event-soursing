import { AggregateRoot } from '@shared/domain/aggregate-root';
import { Email } from '../value-objects/email';
import { UserName } from '../value-objects/user-name';
import { UserCreatedEvent } from '../events/user-created.event';
import { UserActivatedEvent } from '../events/user-activated.event';
import { UserBlockedEvent } from '../events/user-blocked.event';
import { UserEmailVerifiedEvent } from '../events/user-email-verified.event';
import { UserEmailChangedEvent } from '../events/user-email-changed.event';

/**
 * Перечисление статусов пользователя
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
  PENDING = 'pending'
}

/**
 * Агрегат пользователя (User Aggregate)
 * 
 * User является корнем агрегата (Aggregate Root), так как:
 * 1. Имеет уникальную идентичность
 * 2. Управляет своими внутренними объектами
 * 3. Обеспечивает инвариантность данных
 * 4. Публикует доменные события при изменениях
 * 
 * В данном случае агрегат простой, но в реальных проектах
 * может содержать связанные сущности (например, UserProfile, UserPreferences)
 */
export class User extends AggregateRoot {
  private _email: Email;
  private _userName: UserName;
  private _status: UserStatus;
  private _lastLoginAt: Date | null;
  private _emailVerifiedAt: Date | null;

  constructor(
    email: Email,
    userName: UserName,
    id?: string,
    status: UserStatus = UserStatus.PENDING
  ) {
    super(id);
    this._email = email;
    this._userName = userName;
    this._status = status;
    this._lastLoginAt = null;
    this._emailVerifiedAt = null;

    // Публикуем событие создания пользователя только для новых пользователей
    if (!id) {
      this.addDomainEvent(new UserCreatedEvent(this.id, email.value, userName.getFullName()));
    }
  }

  /**
   * Получить email пользователя
   */
  public get email(): Email {
    return this._email;
  }

  /**
   * Получить имя пользователя
   */
  public get userName(): UserName {
    return this._userName;
  }

  /**
   * Получить статус пользователя
   */
  public get status(): UserStatus {
    return this._status;
  }

  /**
   * Получить дату последнего входа
   */
  public get lastLoginAt(): Date | null {
    return this._lastLoginAt;
  }

  /**
   * Получить дату подтверждения email
   */
  public get emailVerifiedAt(): Date | null {
    return this._emailVerifiedAt;
  }

  /**
   * Активировать пользователя
   * Доменный метод с бизнес-логикой и событиями
   */
  public activate(): void {
    // Бизнес-инвариант
    if (this._status === UserStatus.BLOCKED) {
      throw new Error('Заблокированный пользователь не может быть активирован');
    }

    if (this._status === UserStatus.ACTIVE) {
      return; // Уже активен, ничего не делаем
    }

    this._status = UserStatus.ACTIVE;
    this.markAsModified();

    // Публикуем доменное событие
    this.addDomainEvent(new UserActivatedEvent(this.id, this._email.value));
  }

  /**
   * Заблокировать пользователя
   * Доменный метод с бизнес-логикой и событиями
   */
  public block(reason?: string): void {
    if (this._status === UserStatus.BLOCKED) {
      throw new Error('Пользователь уже заблокирован');
    }

    this._status = UserStatus.BLOCKED;
    this.markAsModified();

    // Публикуем доменное событие
    this.addDomainEvent(new UserBlockedEvent(this.id, this._email.value, reason));
  }

  /**
   * Подтвердить email
   * Доменный метод с бизнес-логикой и событиями
   */
  public verifyEmail(): void {
    // Бизнес-инвариант
    if (this._emailVerifiedAt) {
      throw new Error('Email уже подтвержден');
    }

    this._emailVerifiedAt = new Date();
    
    // Если пользователь был в статусе PENDING, активируем его
    if (this._status === UserStatus.PENDING) {
      this._status = UserStatus.ACTIVE;
    }

    this.markAsModified();

    // Публикуем доменное событие
    this.addDomainEvent(new UserEmailVerifiedEvent(this.id, this._email.value));
  }

  /**
   * Записать время последнего входа
   */
  public recordLogin(): void {
    this._lastLoginAt = new Date();
    this.markAsModified();
  }

  /**
   * Изменить имя пользователя
   * @param newUserName - новое имя
   */
  public changeUserName(newUserName: UserName): void {
    // Проверяем, действительно ли имя изменилось
    if (this._userName.equals(newUserName)) {
      return;
    }

    this._userName = newUserName;
    this.markAsModified();
  }

  /**
   * Изменить email
   * @param newEmail - новый email
   */
  public changeEmail(newEmail: Email): void {
    // Проверяем, действительно ли email изменился
    if (this._email.equals(newEmail)) {
      return;
    }

    const oldEmail = this._email.value;
    this._email = newEmail;
    
    // При смене email сбрасываем подтверждение
    this._emailVerifiedAt = null;
    this.markAsModified();

    // Публикуем доменное событие
    this.addDomainEvent(new UserEmailChangedEvent(this.id, oldEmail, newEmail.value));
  }

  /**
   * Проверить, активен ли пользователь
   */
  public isActive(): boolean {
    return this._status === UserStatus.ACTIVE;
  }

  /**
   * Проверить, заблокирован ли пользователь
   */
  public isBlocked(): boolean {
    return this._status === UserStatus.BLOCKED;
  }

  /**
   * Проверить, подтвержден ли email
   */
  public isEmailVerified(): boolean {
    return this._emailVerifiedAt !== null;
  }

  /**
   * Получить количество дней с последнего входа
   */
  public getDaysSinceLastLogin(): number | null {
    if (!this._lastLoginAt) return null;
    
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this._lastLoginAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Статический метод для создания нового пользователя
   * Фабричный метод со всеми необходимыми валидациями
   */
  public static create(
    email: string,
    firstName: string,
    lastName: string
  ): User {
    const userEmail = Email.create(email);
    const userName = UserName.create(firstName, lastName);
    
    return new User(userEmail, userName);
  }

  /**
   * Статический метод для восстановления пользователя из персистентности
   * Используется репозиторием при загрузке из БД
   */
  public static restore(
    id: string,
    email: Email,
    userName: UserName,
    status: UserStatus,
    createdAt: Date,
    updatedAt: Date,
    lastLoginAt?: Date,
    emailVerifiedAt?: Date
  ): User {
    const user = new User(email, userName, id, status);
    
    // Восстанавливаем состояние без событий
    (user as any)._createdAt = createdAt;
    (user as any)._updatedAt = updatedAt;
    (user as any)._lastLoginAt = lastLoginAt || null;
    (user as any)._emailVerifiedAt = emailVerifiedAt || null;
    
    // Очищаем события, так как это восстановление, а не создание
    user.clearDomainEvents();
    
    return user;
  }
} 