import { PaginatedResult } from '@shared/application/query.interface';
import { UserReadModel } from './user.read-model';

/**
 * Интерфейс репозитория для чтения пользователей в CQRS
 * 
 * Read Model репозитории оптимизированы для запросов чтения:
 * - Денормализованные структуры данных
 * - Индексы для быстрого поиска
 * - Предвычисленные агрегации
 * - Кэширование результатов
 */
export interface UserReadModelRepositoryInterface {
  /**
   * Найти пользователя по ID
   */
  findById(id: string): Promise<UserReadModel | null>;

  /**
   * Найти пользователя по email
   */
  findByEmail(email: string): Promise<UserReadModel | null>;

  /**
   * Найти пользователей с пагинацией и фильтрацией
   */
  findWithPagination(params: {
    page: number;
    limit: number;
    filters?: Record<string, any>;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<PaginatedResult<UserReadModel>>;

  /**
   * Найти активных пользователей
   */
  findActiveUsers(): Promise<UserReadModel[]>;

  /**
   * Найти пользователей по уровню доверия
   */
  findByTrustLevel(level: 'low' | 'medium' | 'high' | 'premium'): Promise<UserReadModel[]>;

  /**
   * Найти премиум пользователей
   */
  findPremiumUsers(): Promise<UserReadModel[]>;

  /**
   * Получить статистику пользователей
   */
  getStatistics(): Promise<{
    total: number;
    active: number;
    emailVerified: number;
    premium: number;
    byTrustLevel: Record<string, number>;
    byStatus: Record<string, number>;
  }>;

  /**
   * Найти неактивных пользователей
   */
  findInactiveUsers(days: number): Promise<UserReadModel[]>;

  /**
   * Поиск пользователей по тексту
   */
  searchUsers(searchTerm: string, limit?: number): Promise<UserReadModel[]>;

  /**
   * Получить топ пользователей по активности
   */
  getTopActiveUsers(limit?: number): Promise<UserReadModel[]>;
} 