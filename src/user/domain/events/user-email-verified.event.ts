import { BaseDomainEvent } from '@shared/domain/domain-event';

/**
 * Доменное событие: Email пользователя подтвержден
 * 
 * Публикуется при подтверждении email адреса.
 * Может использоваться для:
 * - Предоставления доступа к премиум функциям
 * - Отправки уведомлений о успешной верификации
 * - Обновления уровня доверия пользователя
 * - Аналитики конверсий
 */
export class UserEmailVerifiedEvent extends BaseDomainEvent {
  public readonly email: string;

  constructor(
    userId: string,
    email: string
  ) {
    super(userId, 'User');
    this.email = email;
  }
} 