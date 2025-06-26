import { BaseEntity } from '@shared/domain/base-entity';
import { Email } from '../value-objects/email';
import { UserName } from '../value-objects/user-name';

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
 * Сущность User в доменном слое
 * 
 * Это основная сущность домена пользователей. Она содержит:
 * - Бизнес-логику работы с пользователем
 * - Объекты-значения (Email, UserName)
 * - Доменные методы и правила
 * 
 * Важно: эта сущность не знает о том, как она сохраняется в БД
 */
export class User extends BaseEntity {
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
   * Доменный метод с бизнес-логикой
   */
  public activate(): void {
    if (this._status === UserStatus.BLOCKED) {
      throw new Error('Заблокированный пользователь не может быть активирован');
    }

    this._status = UserStatus.ACTIVE;
    this.touch();
  }

  /**
   * Заблокировать пользователя
   * Доменный метод с бизнес-логикой
   */
  public block(): void {
    if (this._status === UserStatus.BLOCKED) {
      throw new Error('Пользователь уже заблокирован');
    }

    this._status = UserStatus.BLOCKED;
    this.touch();
  }

  /**
   * Подтвердить email
   * Доменный метод с бизнес-логикой
   */
  public verifyEmail(): void {
    if (this._emailVerifiedAt) {
      throw new Error('Email уже подтвержден');
    }

    this._emailVerifiedAt = new Date();
    
    // Если пользователь был в статусе PENDING, активируем его
    if (this._status === UserStatus.PENDING) {
      this._status = UserStatus.ACTIVE;
    }

    this.touch();
  }

  /**
   * Записать время последнего входа
   */
  public recordLogin(): void {
    this._lastLoginAt = new Date();
    this.touch();
  }

  /**
   * Изменить имя пользователя
   * @param newUserName - новое имя
   */
  public changeUserName(newUserName: UserName): void {
    this._userName = newUserName;
    this.touch();
  }

  /**
   * Изменить email
   * @param newEmail - новый email
   */
  public changeEmail(newEmail: Email): void {
    this._email = newEmail;
    // При смене email сбрасываем подтверждение
    this._emailVerifiedAt = null;
    this.touch();
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
} 