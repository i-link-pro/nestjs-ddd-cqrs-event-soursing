import { EventSourcedAggregateRoot } from './event-sourced-aggregate';

/**
 * Event Sourcing - интерфейс репозитория для агрегатов
 * 
 * Event Sourced репозиторий восстанавливает агрегаты из событий
 * и сохраняет новые события в Event Store.
 */
export interface EventSourcedRepository<T extends EventSourcedAggregateRoot> {
  /**
   * Получить агрегат по ID
   * Восстанавливает состояние из Event Store или снимка + события
   * @param id Идентификатор агрегата
   * @returns Агрегат или null если не найден
   */
  getById(id: string): Promise<T | null>;

  /**
   * Сохранить агрегат
   * Сохраняет неподтвержденные события в Event Store
   * @param aggregate Агрегат для сохранения
   */
  save(aggregate: T): Promise<void>;

  /**
   * Создать снимок агрегата
   * Полезно для оптимизации производительности
   * @param aggregate Агрегат для создания снимка
   */
  createSnapshot(aggregate: T): Promise<void>;

  /**
   * Получить версию агрегата без его загрузки
   * Полезно для проверки concurrency
   * @param id Идентификатор агрегата
   */
  getVersion(id: string): Promise<number>;

  /**
   * Проверить существование агрегата
   * @param id Идентификатор агрегата
   */
  exists(id: string): Promise<boolean>;
}

/**
 * Исключение при конфликте версий (Optimistic Concurrency Control)
 */
export class ConcurrencyError extends Error {
  constructor(
    public readonly aggregateId: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number
  ) {
    super(
      `Конфликт версий для агрегата ${aggregateId}. ` +
      `Ожидалась версия ${expectedVersion}, но актуальная версия ${actualVersion}`
    );
    this.name = 'ConcurrencyError';
  }
} 