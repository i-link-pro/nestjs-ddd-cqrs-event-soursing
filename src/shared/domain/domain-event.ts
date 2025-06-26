/**
 * Интерфейс для доменных событий
 * 
 * Доменные события представляют собой то, что произошло в домене,
 * что может быть интересно другим частям системы.
 * 
 * События помогают разделить агрегаты и обеспечить слабую связанность.
 */
export interface DomainEvent {
  /**
   * Уникальный идентификатор события
   */
  eventId: string;

  /**
   * Время возникновения события
   */
  occurredAt: Date;

  /**
   * Версия события (для эволюции событий)
   */
  eventVersion: number;

  /**
   * ID агрегата, который сгенерировал событие
   */
  aggregateId: string;

  /**
   * Тип агрегата
   */
  aggregateType: string;
}

/**
 * Базовый класс для доменных событий
 */
export abstract class BaseDomainEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredAt: Date;
  public readonly eventVersion: number = 1;
  public readonly aggregateId: string;
  public readonly aggregateType: string;

  constructor(aggregateId: string, aggregateType: string) {
    this.eventId = this.generateEventId();
    this.occurredAt = new Date();
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
  }

  /**
   * Генерация ID события
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Интерфейс для обработчиков доменных событий
 */
export interface DomainEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}

/**
 * Интерфейс для публикатора доменных событий
 */
export interface DomainEventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
} 