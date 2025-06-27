import { Injectable } from '@nestjs/common';
import { EventStore, StoredEvent, EventMetadata } from '../../../shared/event-sourcing/event-store.interface';
import { BaseDomainEvent } from '../../../shared/domain/domain-event';
import { ConcurrencyError } from '../../../shared/event-sourcing/event-sourced-repository.interface';

/**
 * In-Memory реализация Event Store
 * 
 * Простая реализация для демонстрации и тестирования.
 * В production следует использовать специализированные Event Store
 * (EventStore, Apache Kafka, PostgreSQL с JSONB, MongoDB и т.д.)
 */
@Injectable()
export class InMemoryEventStore implements EventStore {
  private events: Map<string, StoredEvent[]> = new Map();
  private versions: Map<string, number> = new Map();

  /**
   * Сохранить события для агрегата
   */
  async saveEvents(
    aggregateId: string,
    events: BaseDomainEvent[],
    expectedVersion: number
  ): Promise<void> {
    // Проверяем текущую версию агрегата (оптимистичная блокировка)
    const currentVersion = this.versions.get(aggregateId) || 0;
    if (currentVersion !== expectedVersion) {
      throw new ConcurrencyError(aggregateId, expectedVersion, currentVersion);
    }

    // Получаем существующие события агрегата
    const aggregateEvents = this.events.get(aggregateId) || [];

    // Преобразуем доменные события в StoredEvent
    let versionCounter = currentVersion;
    const storedEvents: StoredEvent[] = events.map(event => {
      versionCounter++;
      
      const metadata: EventMetadata = {
        eventId: crypto.randomUUID(),
        aggregateId: aggregateId,
        aggregateType: this.getAggregateTypeFromEvent(event),
        eventType: event.constructor.name,
        eventVersion: 1, // Версия схемы события
        aggregateVersion: versionCounter,
        timestamp: event.occurredAt,
        metadata: {
          correlationId: crypto.randomUUID(),
          userId: aggregateId // Для простоты
        }
      };

      return {
        metadata,
        data: this.serializeEvent(event)
      };
    });

    // Сохраняем события
    aggregateEvents.push(...storedEvents);
    this.events.set(aggregateId, aggregateEvents);
    this.versions.set(aggregateId, versionCounter);

    console.log(`✅ Сохранено ${events.length} событий для агрегата ${aggregateId}, новая версия: ${versionCounter}`);
  }

  /**
   * Получить все события для агрегата
   */
  async getEventsForAggregate(
    aggregateId: string,
    fromVersion?: number
  ): Promise<StoredEvent[]> {
    const events = this.events.get(aggregateId) || [];
    
    if (fromVersion !== undefined) {
      return events.filter(event => event.metadata.aggregateVersion > fromVersion);
    }
    
    return events;
  }

  /**
   * Получить события по типу агрегата
   */
  async getEventsByAggregateType(
    aggregateType: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<StoredEvent[]> {
    const allEvents: StoredEvent[] = [];
    
    for (const events of this.events.values()) {
      for (const event of events) {
        if (event.metadata.aggregateType === aggregateType) {
          if (fromDate && event.metadata.timestamp < fromDate) continue;
          if (toDate && event.metadata.timestamp > toDate) continue;
          allEvents.push(event);
        }
      }
    }
    
    return allEvents.sort((a, b) => 
      a.metadata.timestamp.getTime() - b.metadata.timestamp.getTime()
    );
  }

  /**
   * Получить все события после определенной временной метки
   */
  async getEventsAfter(timestamp: Date): Promise<StoredEvent[]> {
    const allEvents: StoredEvent[] = [];
    
    for (const events of this.events.values()) {
      for (const event of events) {
        if (event.metadata.timestamp > timestamp) {
          allEvents.push(event);
        }
      }
    }
    
    return allEvents.sort((a, b) => 
      a.metadata.timestamp.getTime() - b.metadata.timestamp.getTime()
    );
  }

  // === Вспомогательные методы ===

  /**
   * Получить тип агрегата из события
   */
  private getAggregateTypeFromEvent(event: BaseDomainEvent): string {
    // Простая логика - берем из названия события
    if (event.constructor.name.startsWith('User')) {
      return 'User';
    }
    return 'Unknown';
  }

  /**
   * Сериализовать событие в JSON
   */
  private serializeEvent(event: BaseDomainEvent): any {
    return {
      type: event.constructor.name,
      aggregateId: event.aggregateId,
      occurredAt: event.occurredAt.toISOString(),
      ...this.getEventData(event)
    };
  }

  /**
   * Получить данные события
   */
  private getEventData(event: BaseDomainEvent): any {
    // Извлекаем данные события (исключая базовые поля)
    const eventData = { ...event } as any;
    delete eventData.aggregateId;
    delete eventData.occurredAt;
    delete eventData.aggregateVersion;
    
    return eventData;
  }

  // === Методы для отладки и тестирования ===

  /**
   * Получить статистику Event Store
   */
  getStatistics(): {
    totalAggregates: number;
    totalEvents: number;
    aggregates: Array<{ id: string; version: number; eventsCount: number }>;
  } {
    const aggregates: Array<{ id: string; version: number; eventsCount: number }> = [];
    let totalEvents = 0;

    for (const [aggregateId, events] of this.events.entries()) {
      const version = this.versions.get(aggregateId) || 0;
      aggregates.push({
        id: aggregateId,
        version,
        eventsCount: events.length
      });
      totalEvents += events.length;
    }

    return {
      totalAggregates: this.events.size,
      totalEvents,
      aggregates
    };
  }

  /**
   * Очистить все события (для тестов)
   */
  clear(): void {
    this.events.clear();
    this.versions.clear();
  }

  /**
   * Получить события агрегата в удобочитаемом формате
   */
  getEventHistory(aggregateId: string): Array<{
    version: number;
    eventType: string;
    timestamp: Date;
    data: any;
  }> {
    const events = this.events.get(aggregateId) || [];
    
    return events.map(event => ({
      version: event.metadata.aggregateVersion,
      eventType: event.metadata.eventType,
      timestamp: event.metadata.timestamp,
      data: event.data
    }));
  }
} 