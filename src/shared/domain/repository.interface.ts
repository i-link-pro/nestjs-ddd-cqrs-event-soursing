import { BaseEntity } from './base-entity';

/**
 * Базовый интерфейс репозитория в DDD
 * 
 * Репозиторий - это паттерн, который инкапсулирует логику доступа к данным
 * и обеспечивает более объектно-ориентированное представление слоя персистентности.
 * 
 * В DDD репозиторий принадлежит доменному слою, но его реализация - инфраструктурному.
 */
export interface BaseRepository<T extends BaseEntity> {
  /**
   * Сохранить сущность
   * @param entity - сущность для сохранения
   * @returns Promise с сохраненной сущностью
   */
  save(entity: T): Promise<T>;

  /**
   * Найти сущность по ID
   * @param id - уникальный идентификатор
   * @returns Promise с найденной сущностью или null
   */
  findById(id: string): Promise<T | null>;

  /**
   * Найти все сущности
   * @returns Promise с массивом всех сущностей
   */
  findAll(): Promise<T[]>;

  /**
   * Обновить сущность
   * @param entity - сущность для обновления
   * @returns Promise с обновленной сущностью
   */
  update(entity: T): Promise<T>;

  /**
   * Удалить сущность по ID
   * @param id - уникальный идентификатор
   * @returns Promise<void>
   */
  delete(id: string): Promise<void>;

  /**
   * Проверить существование сущности по ID
   * @param id - уникальный идентификатор
   * @returns Promise<boolean>
   */
  exists(id: string): Promise<boolean>;
}

/**
 * Расширенный интерфейс репозитория с пагинацией
 */
export interface PaginatedRepository<T extends BaseEntity> extends BaseRepository<T> {
  /**
   * Найти сущности с пагинацией
   * @param offset - смещение
   * @param limit - ограничение количества
   * @returns Promise с результатом пагинации
   */
  findWithPagination(offset: number, limit: number): Promise<{
    items: T[];
    total: number;
    hasMore: boolean;
  }>;
} 