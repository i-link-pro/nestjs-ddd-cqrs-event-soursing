import { EventSourcedAggregateRoot } from '../../../shared/event-sourcing/event-sourced-aggregate';
import { BaseDomainEvent } from '../../../shared/domain/domain-event';
import { Email } from '../value-objects/email';
import { UserName } from '../value-objects/user-name';
import { UserCreatedEvent } from '../events/user-created.event';
import { UserActivatedEvent } from '../events/user-activated.event';
import { UserBlockedEvent } from '../events/user-blocked.event';
import { UserEmailVerifiedEvent } from '../events/user-email-verified.event';
import { UserEmailChangedEvent } from '../events/user-email-changed.event';

/**
 * Статусы пользователя
 */
export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  BLOCKED = 'blocked'
}

/**
 * User агрегат с Event Sourcing
 * 
 * В Event Sourcing агрегат восстанавливает состояние из последовательности событий.
 * Каждое изменение создает новое событие, которое сохраняется в Event Store.
 * Состояние никогда не сохраняется напрямую - только события.
 */
export class UserEventSourcedAggregate extends EventSourcedAggregateRoot {
  private _email: Email;
  private _userName: UserName;
  private _status: UserStatus;
  private _isEmailVerified: boolean = false;
  private _createdAt: Date;
  private _lastLoginAt?: Date;

  /**
   * Конструктор агрегата (public для совместимости с базовым классом)
   */
  constructor(id?: string) {
    super(id);
  }

  // === Геттеры для доступа к состоянию ===

  public get email(): Email {
    return this._email;
  }

  public get userName(): UserName {
    return this._userName;
  }

  public get status(): UserStatus {
    return this._status;
  }

  public get isEmailVerified(): boolean {
    return this._isEmailVerified;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get lastLoginAt(): Date | undefined {
    return this._lastLoginAt;
  }

  // === Фабричные методы ===

  /**
   * Создать нового пользователя
   * Генерирует событие UserCreatedEvent
   */
  public static create(email: Email, userName: UserName): UserEventSourcedAggregate {
    const user = new UserEventSourcedAggregate();
    
    // Применяем событие создания
    const event = new UserCreatedEvent(
      user.id,
      email.value,
      `${userName.firstName} ${userName.lastName}` // fullName
    );
    
    user.applyEvent(event);
    return user;
  }

  // Методы fromHistory и fromSnapshot наследуются от базового класса

  // === Команды агрегата ===

  /**
   * Активировать пользователя
   * Генерирует событие UserActivatedEvent
   */
  public activate(): void {
    // Бизнес-правило: нельзя активировать заблокированного пользователя
    if (this._status === UserStatus.BLOCKED) {
      throw new Error('Заблокированный пользователь не может быть активирован');
    }

    // Если уже активен, ничего не делаем
    if (this._status === UserStatus.ACTIVE) {
      return;
    }

    // Генерируем событие
    const event = new UserActivatedEvent(this.id, this._email.value);
    this.applyEvent(event);
  }

  /**
   * Заблокировать пользователя
   * Генерирует событие UserBlockedEvent
   */
  public block(reason: string): void {
    // Если уже заблокирован, ничего не делаем
    if (this._status === UserStatus.BLOCKED) {
      return;
    }

    // Генерируем событие
    const event = new UserBlockedEvent(this.id, this._email.value, reason);
    this.applyEvent(event);
  }

  /**
   * Подтвердить email
   * Генерирует событие UserEmailVerifiedEvent
   */
  public verifyEmail(): void {
    // Если уже подтвержден, ничего не делаем
    if (this._isEmailVerified) {
      return;
    }

    // Генерируем событие
    const event = new UserEmailVerifiedEvent(this.id, this._email.value);
    this.applyEvent(event);
  }

  /**
   * Изменить email
   * Генерирует событие UserEmailChangedEvent
   */
  public changeEmail(newEmail: Email): void {
    // Если email не изменился, ничего не делаем
    if (this._email.value === newEmail.value) {
      return;
    }

    // Генерируем событие
    const event = new UserEmailChangedEvent(
      this.id,
      this._email.value,
      newEmail.value
    );
    this.applyEvent(event);
  }

  /**
   * Зарегистрировать вход в систему
   */
  public recordLogin(): void {
    // Для простоты не создаем отдельное событие
    // В реальном проекте можно создать UserLoggedInEvent
    this._lastLoginAt = new Date();
  }

  // === Обработчик событий ===

  /**
   * Применить событие к состоянию агрегата
   * Это сердце Event Sourcing - как события изменяют состояние
   */
  protected when(event: BaseDomainEvent): void {
    switch (event.constructor.name) {
      case 'UserCreatedEvent':
        this.whenUserCreated(event as UserCreatedEvent);
        break;
      case 'UserActivatedEvent':
        this.whenUserActivated(event as UserActivatedEvent);
        break;
      case 'UserBlockedEvent':
        this.whenUserBlocked(event as UserBlockedEvent);
        break;
      case 'UserEmailVerifiedEvent':
        this.whenUserEmailVerified(event as UserEmailVerifiedEvent);
        break;
      case 'UserEmailChangedEvent':
        this.whenUserEmailChanged(event as UserEmailChangedEvent);
        break;
      default:
        // Игнорируем неизвестные события для обратной совместимости
        console.warn(`Неизвестное событие: ${event.constructor.name}`);
    }
  }

  /**
   * Обработать событие создания пользователя
   */
  private whenUserCreated(event: UserCreatedEvent): void {
    this._email = Email.create(event.email);
    // Разбираем fullName обратно на firstName и lastName
    const names = event.fullName.split(' ');
    const firstName = names[0] || '';
    const lastName = names.slice(1).join(' ') || '';
    this._userName = UserName.create(firstName, lastName);
    this._status = UserStatus.PENDING;
    this._isEmailVerified = false;
    this._createdAt = event.occurredAt;
  }

  /**
   * Обработать событие активации пользователя
   */
  private whenUserActivated(event: UserActivatedEvent): void {
    this._status = UserStatus.ACTIVE;
  }

  /**
   * Обработать событие блокировки пользователя
   */
  private whenUserBlocked(event: UserBlockedEvent): void {
    this._status = UserStatus.BLOCKED;
  }

  /**
   * Обработать событие подтверждения email
   */
  private whenUserEmailVerified(event: UserEmailVerifiedEvent): void {
    this._isEmailVerified = true;
  }

  /**
   * Обработать событие изменения email
   */
  private whenUserEmailChanged(event: UserEmailChangedEvent): void {
    this._email = Email.create(event.newEmail);
    this._isEmailVerified = false; // При смене email нужно подтверждать заново
  }

  // === Снимки (Snapshots) ===

  /**
   * Получить данные для снимка состояния
   */
  protected getSnapshotData(): any {
    return {
      email: this._email.value,
      firstName: this._userName.firstName,
      lastName: this._userName.lastName,
      status: this._status,
      isEmailVerified: this._isEmailVerified,
      createdAt: this._createdAt.toISOString(),
      lastLoginAt: this._lastLoginAt?.toISOString()
    };
  }

  /**
   * Применить данные из снимка
   */
  protected applySnapshotData(data: any): void {
    this._email = Email.create(data.email);
    this._userName = UserName.create(data.firstName, data.lastName);
    this._status = data.status;
    this._isEmailVerified = data.isEmailVerified;
    this._createdAt = new Date(data.createdAt);
    this._lastLoginAt = data.lastLoginAt ? new Date(data.lastLoginAt) : undefined;
  }

  // === Помощники ===

  /**
   * Проверить, может ли пользователь быть удален
   */
  public canBeDeleted(): boolean {
    // Бизнес-правило: можно удалять только заблокированных пользователей
    return this._status === UserStatus.BLOCKED;
  }

  /**
   * Проверить, является ли пользователь активным
   */
  public isActive(): boolean {
    return this._status === UserStatus.ACTIVE;
  }

  /**
   * Получить полное имя пользователя
   */
  public getFullName(): string {
    return `${this._userName.firstName} ${this._userName.lastName}`;
  }
} 