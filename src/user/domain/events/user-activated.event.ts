import { BaseDomainEvent } from '@shared/domain/domain-event';

/**
 * Доменное событие: Пользователь активирован
 * 
 * Публикуется при активации пользователя.
 * Может использоваться для:
 * - Уведомления о доступе к функциям
 * - Обновления статистики
 * - Интеграции с внешними системами
 */
export class UserActivatedEvent extends BaseDomainEvent {
  public readonly email: string;

  constructor(
    userId: string,
    email: string
  ) {
    super(userId, 'User');
    this.email = email;
  }
} 