/**
 * Event Sourcing - интерфейс хранилища событий
 * 
 * Event Store - центральное хранилище всех событий в системе.
 * Обеспечивает персистентность событий и их последовательное восстановление.
 */

export interface EventMetadata {
  /** Уникальный ID события */
  eventId: string;
  /** ID агрегата, к которому относится событие */
  aggregateId: string;
  /** Тип агрегата (User, Order, etc.) */
  aggregateType: string;
  /** Тип события (UserCreated, UserActivated, etc.) */
  eventType: string;
  /** Версия события для совместимости */
  eventVersion: number;
  /** Номер версии агрегата на момент события */
  aggregateVersion: number;
  /** Временная метка события */
  timestamp: Date;
  /** Дополнительные метаданные (userId, correlationId, etc.) */
  metadata?: Record<string, any>;
}

export interface StoredEvent {
  /** Метаданные события */
  metadata: EventMetadata;
  /** Сериализованные данные события */
  data: any;
}

export interface EventStore {
  /**
   * Сохранить события для агрегата
   * @param aggregateId ID агрегата
   * @param events События для сохранения
   * @param expectedVersion Ожидаемая версия агрегата (для оптимистичной блокировки)
   */
  saveEvents(
    aggregateId: string,
    events: any[],
    expectedVersion: number
  ): Promise<void>;

  /**
   * Получить все события для агрегата
   * @param aggregateId ID агрегата
   * @param fromVersion Начальная версия (для оптимизации с снепшотами)
   */
  getEventsForAggregate(
    aggregateId: string,
    fromVersion?: number
  ): Promise<StoredEvent[]>;

  /**
   * Получить события по типу агрегата
   * @param aggregateType Тип агрегата
   * @param fromDate Начальная дата
   * @param toDate Конечная дата
   */
  getEventsByAggregateType(
    aggregateType: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<StoredEvent[]>;

  /**
   * Получить все события после определенной временной метки
   * Полезно для создания read models и проекций
   */
  getEventsAfter(timestamp: Date): Promise<StoredEvent[]>;
} 