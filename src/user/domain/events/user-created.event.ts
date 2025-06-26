import { BaseDomainEvent } from '@shared/domain/domain-event';

/**
 * Доменное событие: Пользователь создан
 * 
 * Публикуется при создании нового пользователя.
 * Другие домены могут подписаться на это событие для:
 * - Отправки приветственного email
 * - Создания профиля пользователя
 * - Аналитики и метрик
 * - Аудита операций
 */
export class UserCreatedEvent extends BaseDomainEvent {
  public readonly email: string;
  public readonly fullName: string;

  constructor(
    userId: string,
    email: string,
    fullName: string
  ) {
    super(userId, 'User');
    this.email = email;
    this.fullName = fullName;
  }
} 