import { BaseDomainEvent } from '@shared/domain/domain-event';

/**
 * Доменное событие: Пользователь заблокирован
 * 
 * Публикуется при блокировке пользователя.
 * Может использоваться для:
 * - Аудита безопасности
 * - Уведомления администраторов
 * - Автоматического отзыва сессий
 * - Интеграции с системами мониторинга
 */
export class UserBlockedEvent extends BaseDomainEvent {
  public readonly email: string;
  public readonly reason?: string;

  constructor(
    userId: string,
    email: string,
    reason?: string
  ) {
    super(userId, 'User');
    this.email = email;
    this.reason = reason;
  }
} 