import { BaseSpecification } from '@shared/domain/specification';
import { User, UserStatus } from '../entities/user-aggregate';

/**
 * Спецификация: Пользователь может быть удален
 * 
 * Инкапсулирует сложные бизнес-правила для определения,
 * может ли пользователь быть безопасно удален из системы.
 * 
 * Правила:
 * - Заблокированных пользователей можно удалять
 * - Неактивных пользователей (>90 дней без входа) можно удалять
 * - Активных пользователей нельзя удалять
 * - Новых пользователей без активности (>30 дней) можно удалять
 */
export class UserCanBeDeletedSpecification extends BaseSpecification<User> {
  private readonly INACTIVE_DAYS_WITH_LOGIN = 90;
  private readonly INACTIVE_DAYS_WITHOUT_LOGIN = 30;

  isSatisfiedBy(user: User): boolean {
    // Заблокированных пользователей можно удалять
    if (user.status === UserStatus.BLOCKED) {
      return true;
    }

    // Проверяем неактивность
    if (this.isUserInactive(user)) {
      return true;
    }

    // Активных пользователей нельзя удалять
    if (user.status === UserStatus.ACTIVE && !this.isUserInactive(user)) {
      return false;
    }

    return true;
  }

  /**
   * Получить причину, почему пользователь не может быть удален
   */
  getFailureReason(user: User): string | null {
    if (user.status === UserStatus.ACTIVE && !this.isUserInactive(user)) {
      return 'Нельзя удалить активного пользователя';
    }

    return null;
  }

  /**
   * Проверить, является ли пользователь неактивным
   */
  private isUserInactive(user: User): boolean {
    const daysSinceLastLogin = user.getDaysSinceLastLogin();
    
    if (daysSinceLastLogin !== null) {
      // Пользователь когда-то входил в систему
      return daysSinceLastLogin > this.INACTIVE_DAYS_WITH_LOGIN;
    } else {
      // Пользователь никогда не входил в систему
      const now = new Date();
      const daysSinceCreation = Math.ceil(
        (now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceCreation > this.INACTIVE_DAYS_WITHOUT_LOGIN;
    }
  }
} 