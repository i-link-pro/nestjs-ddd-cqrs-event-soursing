import { BaseRepository } from '@shared/domain/repository.interface';
import { User } from '../entities/user-aggregate';
import { Email } from '../value-objects/email';

/**
 * Интерфейс репозитория для сущности User
 * 
 * В DDD интерфейс репозитория принадлежит доменному слою,
 * а его реализация - инфраструктурному слою.
 * 
 * Это позволяет доменному слою не зависеть от конкретной
 * технологии персистентности (БД, файлы, API и т.д.)
 */
export interface UserRepositoryInterface extends BaseRepository<User> {
  /**
   * Найти пользователя по email
   * @param email - объект-значение Email
   * @returns Promise с найденным пользователем или null
   */
  findByEmail(email: Email): Promise<User | null>;

  /**
   * Проверить существование пользователя с данным email
   * @param email - объект-значение Email
   * @returns Promise<boolean>
   */
  existsByEmail(email: Email): Promise<boolean>;

  /**
   * Найти активных пользователей
   * @returns Promise с массивом активных пользователей
   */
  findActiveUsers(): Promise<User[]>;

  /**
   * Найти пользователей с неподтвержденным email
   * @returns Promise с массивом пользователей
   */
  findUnverifiedUsers(): Promise<User[]>;

  /**
   * Найти пользователей, которые не входили в систему более N дней
   * @param days - количество дней
   * @returns Promise с массивом пользователей
   */
  findInactiveUsers(days: number): Promise<User[]>;

  /**
   * Получить количество пользователей по статусам
   * @returns Promise с объектом содержащим статистику
   */
  getUsersCountByStatus(): Promise<{
    active: number;
    inactive: number;
    blocked: number;
    pending: number;
  }>;
} 