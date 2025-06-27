import { Injectable } from '@nestjs/common';
import { EventSourcedRepository, ConcurrencyError } from '../../../shared/event-sourcing/event-sourced-repository.interface';
import { EventStore, StoredEvent } from '../../../shared/event-sourcing/event-store.interface';
import { AggregateSnapshot, SnapshotStore } from '../../../shared/event-sourcing/event-sourced-aggregate';
import { UserEventSourcedAggregate } from '../../domain/entities/user-event-sourced.aggregate';
import { BaseDomainEvent } from '../../../shared/domain/domain-event';
import { UserCreatedEvent } from '../../domain/events/user-created.event';
import { UserActivatedEvent } from '../../domain/events/user-activated.event';
import { UserBlockedEvent } from '../../domain/events/user-blocked.event';
import { UserEmailVerifiedEvent } from '../../domain/events/user-email-verified.event';
import { UserEmailChangedEvent } from '../../domain/events/user-email-changed.event';

/**
 * Event Sourced репозиторий для User агрегата
 * 
 * Этот репозиторий:
 * 1. Восстанавливает агрегаты из событий (или снимков + события)
 * 2. Сохраняет новые события в Event Store
 * 3. Управляет снимками для оптимизации производительности
 */
@Injectable()
export class UserEventSourcedRepository implements EventSourcedRepository<UserEventSourcedAggregate> {
  constructor(
    private readonly eventStore: EventStore,
    private readonly snapshotStore?: SnapshotStore
  ) {}

  /**
   * Получить агрегат по ID
   * Восстанавливает состояние из событий или снимка + события
   */
  async getById(id: string): Promise<UserEventSourcedAggregate | null> {
    try {
      let aggregate: UserEventSourcedAggregate;
      let fromVersion = 0;

      // Пытаемся загрузить снимок для оптимизации
      if (this.snapshotStore) {
        const snapshot = await this.snapshotStore.getSnapshot(id);
        if (snapshot) {
          console.log(`📸 Загружен снимок для агрегата ${id}, версия ${snapshot.version}`);
          aggregate = UserEventSourcedAggregate.fromSnapshot(snapshot);
          fromVersion = snapshot.version;
        }
      }

      // Загружаем события после снимка (или все события, если снимка нет)
      const storedEvents = await this.eventStore.getEventsForAggregate(id, fromVersion);
      
      if (storedEvents.length === 0 && fromVersion === 0) {
        // Агрегат не найден
        return null;
      }

      // Если есть снимок, но нет новых событий
      if (storedEvents.length === 0 && fromVersion > 0) {
        return aggregate!;
      }

      // Преобразуем StoredEvent в доменные события
      const domainEvents = this.deserializeEvents(storedEvents);

      // Если есть снимок, применяем только новые события
      if (fromVersion > 0) {
        domainEvents.forEach(event => {
          aggregate.applyEvent(event, false);
        });
        return aggregate;
      }

      // Если снимка нет, восстанавливаем агрегат из всех событий
      return UserEventSourcedAggregate.fromHistory(domainEvents);

    } catch (error) {
      console.error(`❌ Ошибка при загрузке агрегата ${id}:`, error);
      throw error;
    }
  }

  /**
   * Сохранить агрегат
   * Сохраняет неподтвержденные события в Event Store
   */
  async save(aggregate: UserEventSourcedAggregate): Promise<void> {
    const uncommittedEvents = aggregate.getUncommittedEvents();
    
    if (uncommittedEvents.length === 0) {
      console.log(`ℹ️ Нет неподтвержденных событий для агрегата ${aggregate.id}`);
      return;
    }

    try {
      // Вычисляем ожидаемую версию для оптимистичной блокировки
      const expectedVersion = aggregate.version - uncommittedEvents.length;
      
      // Сохраняем события
      await this.eventStore.saveEvents(
        aggregate.id,
        uncommittedEvents,
        expectedVersion
      );

      // Помечаем события как подтвержденные
      aggregate.markEventsAsCommitted();

      console.log(`✅ Сохранено ${uncommittedEvents.length} событий для агрегата ${aggregate.id}`);

      // Автоматически создаем снимок каждые 10 событий
      if (this.snapshotStore && aggregate.version % 10 === 0) {
        await this.createSnapshot(aggregate);
      }

    } catch (error) {
      if (error instanceof ConcurrencyError) {
        console.error(`🔒 Конфликт версий при сохранении агрегата ${aggregate.id}:`, error.message);
      } else {
        console.error(`❌ Ошибка при сохранении агрегата ${aggregate.id}:`, error);
      }
      throw error;
    }
  }

  /**
   * Создать снимок агрегата
   */
  async createSnapshot(aggregate: UserEventSourcedAggregate): Promise<void> {
    if (!this.snapshotStore) {
      console.warn('⚠️ SnapshotStore не настроен');
      return;
    }

    try {
      const snapshot = aggregate.createSnapshot();
      await this.snapshotStore.saveSnapshot(snapshot);
      console.log(`📸 Создан снимок для агрегата ${aggregate.id}, версия ${snapshot.version}`);
    } catch (error) {
      console.error(`❌ Ошибка при создании снимка для агрегата ${aggregate.id}:`, error);
      throw error;
    }
  }

  /**
   * Получить версию агрегата без его загрузки
   */
  async getVersion(id: string): Promise<number> {
    const events = await this.eventStore.getEventsForAggregate(id);
    return events.length > 0 ? events[events.length - 1].metadata.aggregateVersion : 0;
  }

  /**
   * Проверить существование агрегата
   */
  async exists(id: string): Promise<boolean> {
    const events = await this.eventStore.getEventsForAggregate(id);
    return events.length > 0;
  }

  // === Вспомогательные методы ===

  /**
   * Преобразовать StoredEvent в доменные события
   */
  private deserializeEvents(storedEvents: StoredEvent[]): BaseDomainEvent[] {
    return storedEvents.map(storedEvent => {
      const eventType = storedEvent.metadata.eventType;
      const eventData = storedEvent.data;

      // Восстанавливаем событие на основе его типа
      switch (eventType) {
        case 'UserCreatedEvent':
          return new UserCreatedEvent(
            eventData.aggregateId,
            eventData.email,
            eventData.fullName || `${eventData.firstName || ''} ${eventData.lastName || ''}`.trim()
          );

        case 'UserActivatedEvent':
          return new UserActivatedEvent(
            eventData.aggregateId,
            eventData.email
          );

        case 'UserBlockedEvent':
          return new UserBlockedEvent(
            eventData.aggregateId,
            eventData.email,
            eventData.reason
          );

        case 'UserEmailVerifiedEvent':
          return new UserEmailVerifiedEvent(
            eventData.aggregateId,
            eventData.email
          );

        case 'UserEmailChangedEvent':
          return new UserEmailChangedEvent(
            eventData.aggregateId,
            eventData.oldEmail,
            eventData.newEmail
          );

        default:
          console.warn(`⚠️ Неизвестный тип события: ${eventType}`);
          // Возвращаем базовое событие для обратной совместимости
          return {
            aggregateId: eventData.aggregateId,
            occurredAt: new Date(eventData.occurredAt || new Date()),
            eventId: 'unknown',
            eventVersion: 1,
            aggregateType: 'User'
          } as BaseDomainEvent;
      }
    });
  }

  // === Методы для отладки и администрирования ===

  /**
   * Получить историю событий агрегата в читаемом формате
   */
  async getEventHistory(id: string): Promise<Array<{
    version: number;
    eventType: string;
    timestamp: Date;
    data: any;
  }>> {
    const events = await this.eventStore.getEventsForAggregate(id);
    
    return events.map(event => ({
      version: event.metadata.aggregateVersion,
      eventType: event.metadata.eventType,
      timestamp: event.metadata.timestamp,
      data: event.data
    }));
  }

  /**
   * Пересоздать агрегат из полной истории событий
   * Полезно для отладки и проверки целостности
   */
  async replayFromHistory(id: string): Promise<UserEventSourcedAggregate | null> {
    const storedEvents = await this.eventStore.getEventsForAggregate(id, 0);
    
    if (storedEvents.length === 0) {
      return null;
    }

    const domainEvents = this.deserializeEvents(storedEvents);
    return UserEventSourcedAggregate.fromHistory(domainEvents);
  }

  /**
   * Получить все агрегаты пользователей за период
   * Полезно для аналитики и отчетов
   */
  async getUsersCreatedBetween(fromDate: Date, toDate: Date): Promise<Array<{
    userId: string;
    email: string;
    fullName: string;
    createdAt: Date;
  }>> {
    const events = await this.eventStore.getEventsByAggregateType('User', fromDate, toDate);
    
    return events
      .filter(event => event.metadata.eventType === 'UserCreatedEvent')
      .map(event => ({
        userId: event.data.aggregateId,
        email: event.data.email,
        fullName: event.data.fullName || 'Unknown User',
        createdAt: event.metadata.timestamp
      }));
  }
}