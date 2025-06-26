import { BaseDomainEvent } from '@shared/domain/domain-event';

/**
 * Доменное событие: Email пользователя изменен
 * 
 * Публикуется при изменении email адреса пользователя.
 * Может использоваться для:
 * - Отправки уведомлений на старый и новый email
 * - Сброса сессий для безопасности
 * - Аудита изменений
 * - Обновления интеграций с внешними системами
 */
export class UserEmailChangedEvent extends BaseDomainEvent {
  public readonly oldEmail: string;
  public readonly newEmail: string;

  constructor(
    userId: string,
    oldEmail: string,
    newEmail: string
  ) {
    super(userId, 'User');
    this.oldEmail = oldEmail;
    this.newEmail = newEmail;
  }
} 