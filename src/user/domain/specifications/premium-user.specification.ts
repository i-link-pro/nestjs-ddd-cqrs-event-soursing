import { BaseSpecification } from '@shared/domain/specification';
import { User, UserStatus } from '../entities/user-aggregate';

/**
 * Спецификация: Премиум пользователь
 * 
 * Определяет критерии премиум пользователя для
 * предоставления особых привилегий и функций.
 * 
 * Правила для премиум статуса:
 * - Пользователь должен быть активен
 * - Email должен быть подтвержден
 * - Последний вход не более 30 дней назад
 * - Email из корпоративного домена (опционально)
 */
export class PremiumUserSpecification extends BaseSpecification<User> {
  private readonly MAX_DAYS_SINCE_LOGIN = 30;
  private readonly CORPORATE_DOMAINS = [
    'company.com',
    'enterprise.org',
    'business.net'
  ];

  constructor(private readonly requireCorporateEmail: boolean = false) {
    super();
  }

  isSatisfiedBy(user: User): boolean {
    // Пользователь должен быть активен
    if (user.status !== UserStatus.ACTIVE) {
      return false;
    }

    // Email должен быть подтвержден
    if (!user.isEmailVerified()) {
      return false;
    }

    // Проверяем активность пользователя
    const daysSinceLogin = user.getDaysSinceLastLogin();
    if (daysSinceLogin !== null && daysSinceLogin > this.MAX_DAYS_SINCE_LOGIN) {
      return false;
    }

    // Опциональная проверка корпоративного email
    if (this.requireCorporateEmail) {
      const emailDomain = user.email.getDomain();
      if (!this.CORPORATE_DOMAINS.includes(emailDomain)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Получить причины, почему пользователь не является премиум
   */
  getFailureReasons(user: User): string[] {
    const reasons: string[] = [];

    if (user.status !== UserStatus.ACTIVE) {
      reasons.push('Пользователь не активен');
    }

    if (!user.isEmailVerified()) {
      reasons.push('Email не подтвержден');
    }

    const daysSinceLogin = user.getDaysSinceLastLogin();
    if (daysSinceLogin !== null && daysSinceLogin > this.MAX_DAYS_SINCE_LOGIN) {
      reasons.push(`Последний вход более ${this.MAX_DAYS_SINCE_LOGIN} дней назад`);
    }

    if (this.requireCorporateEmail) {
      const emailDomain = user.email.getDomain();
      if (!this.CORPORATE_DOMAINS.includes(emailDomain)) {
        reasons.push('Email не из корпоративного домена');
      }
    }

    return reasons;
  }

  /**
   * Создать спецификацию для корпоративных премиум пользователей
   */
  static forCorporateUsers(): PremiumUserSpecification {
    return new PremiumUserSpecification(true);
  }

  /**
   * Создать спецификацию для обычных премиум пользователей
   */
  static forRegularUsers(): PremiumUserSpecification {
    return new PremiumUserSpecification(false);
  }
} 