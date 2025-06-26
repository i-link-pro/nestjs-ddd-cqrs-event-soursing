import { User } from '../entities/user.entity';
import { Email } from '../value-objects/email';
import { UserRepositoryInterface } from '../repositories/user.repository.interface';

/**
 * Доменный сервис для работы с пользователями
 * 
 * Доменные сервисы в DDD используются для:
 * 1. Бизнес-логики, которая не принадлежит конкретной сущности
 * 2. Операций, затрагивающих несколько сущностей
 * 3. Сложных вычислений и валидаций
 * 
 * Доменные сервисы не должны содержать логику приложения,
 * они содержат только чистую бизнес-логику домена.
 */
export class UserDomainService {
  constructor(
    private readonly userRepository: UserRepositoryInterface
  ) {}

  /**
   * Проверить уникальность email при регистрации
   * @param email - объект-значение Email
   * @throws Error если email уже используется
   */
  async validateEmailUniqueness(email: Email): Promise<void> {
    const existingUser = await this.userRepository.findByEmail(email);
    
    if (existingUser) {
      throw new Error(`Пользователь с email ${email.value} уже существует`);
    }
  }

  /**
   * Проверить возможность смены email
   * @param user - пользователь
   * @param newEmail - новый email
   * @throws Error если смена email невозможна
   */
  async validateEmailChange(user: User, newEmail: Email): Promise<void> {
    // Проверяем, что новый email отличается от текущего
    if (user.email.equals(newEmail)) {
      throw new Error('Новый email совпадает с текущим');
    }

    // Проверяем уникальность нового email
    await this.validateEmailUniqueness(newEmail);
  }

  /**
   * Определить, является ли пользователь неактивным
   * Бизнес-правило: пользователь считается неактивным, если:
   * - Не входил в систему более 90 дней
   * - Или никогда не входил и зарегистрирован более 30 дней назад
   */
  isUserInactive(user: User): boolean {
    const INACTIVE_DAYS_WITH_LOGIN = 90;
    const INACTIVE_DAYS_WITHOUT_LOGIN = 30;

    const daysSinceLastLogin = user.getDaysSinceLastLogin();
    
    if (daysSinceLastLogin !== null) {
      // Пользователь когда-то входил в систему
      return daysSinceLastLogin > INACTIVE_DAYS_WITH_LOGIN;
    } else {
      // Пользователь никогда не входил в систему
      const now = new Date();
      const daysSinceCreation = Math.ceil(
        (now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceCreation > INACTIVE_DAYS_WITHOUT_LOGIN;
    }
  }

  /**
   * Определить приоритет пользователя для поддержки
   * Бизнес-правило основано на статусе и активности
   */
  getUserSupportPriority(user: User): 'high' | 'medium' | 'low' {
    if (user.isBlocked()) {
      return 'low';
    }

    if (!user.isEmailVerified()) {
      return 'medium';
    }

    if (this.isUserInactive(user)) {
      return 'low';
    }

    return 'high';
  }

  /**
   * Проверить, может ли пользователь быть удален
   * Бизнес-правила для безопасного удаления
   */
  async canUserBeDeleted(user: User): Promise<{ canDelete: boolean; reason?: string }> {
    // Заблокированных пользователей можно удалять
    if (user.isBlocked()) {
      return { canDelete: true };
    }

    // Неактивных пользователей можно удалять
    if (this.isUserInactive(user)) {
      return { canDelete: true };
    }

    // Активных пользователей удалять нельзя
    if (user.isActive() && !this.isUserInactive(user)) {
      return { 
        canDelete: false, 
        reason: 'Нельзя удалить активного пользователя' 
      };
    }

    return { canDelete: true };
  }

  /**
   * Сгенерировать рекомендации по работе с пользователем
   */
  generateUserRecommendations(user: User): string[] {
    const recommendations: string[] = [];

    if (!user.isEmailVerified()) {
      recommendations.push('Отправить напоминание о подтверждении email');
    }

    if (this.isUserInactive(user)) {
      recommendations.push('Отправить уведомление о возвращении');
    }

    const daysSinceLastLogin = user.getDaysSinceLastLogin();
    if (daysSinceLastLogin && daysSinceLastLogin > 30 && daysSinceLastLogin < 90) {
      recommendations.push('Отправить персонализированное предложение');
    }

    if (user.isActive() && user.isEmailVerified() && daysSinceLastLogin && daysSinceLastLogin < 7) {
      recommendations.push('Предложить премиум функции');
    }

    return recommendations;
  }
} 