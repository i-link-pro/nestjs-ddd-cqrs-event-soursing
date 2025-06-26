import { BaseSpecification } from '@shared/domain/specification';
import { User, UserStatus } from '../entities/user-aggregate';

/**
 * Спецификация: Пользователь может быть активирован
 * 
 * Инкапсулирует бизнес-правила для определения,
 * может ли пользователь быть активирован.
 * 
 * Правила:
 * - Пользователь не должен быть заблокирован
 * - Пользователь не должен быть уже активным
 */
export class UserCanBeActivatedSpecification extends BaseSpecification<User> {
  
  isSatisfiedBy(user: User): boolean {
    // Заблокированные пользователи не могут быть активированы
    if (user.status === UserStatus.BLOCKED) {
      return false;
    }

    // Уже активированные пользователи не нуждаются в активации
    if (user.status === UserStatus.ACTIVE) {
      return false;
    }

    return true;
  }

  /**
   * Получить причину, почему пользователь не может быть активирован
   */
  getFailureReason(user: User): string | null {
    if (user.status === UserStatus.BLOCKED) {
      return 'Заблокированный пользователь не может быть активирован';
    }

    if (user.status === UserStatus.ACTIVE) {
      return 'Пользователь уже активен';
    }

    return null;
  }
} 