import { BaseDomainEvent } from '../domain/domain-event';

/**
 * Event Sourcing - базовый класс для агрегатов
 * 
 * Агрегат в Event Sourcing восстанавливает свое состояние
 * из последовательности событий, а не из снимка в БД.
 */
export abstract class EventSourcedAggregateRoot {
  protected _id: string;
  protected _version: number = 0;
  private _uncommittedEvents: BaseDomainEvent[] = [];

  constructor(id?: string) {
    this._id = id || crypto.randomUUID();
  }

  /**
   * Идентификатор агрегата
   */
  public get id(): string {
    return this._id;
  }

  /**
   * Текущая версия агрегата
   * Увеличивается с каждым новым событием
   */
  public get version(): number {
    return this._version;
  }

  /**
   * Получить неподтвержденные события
   * Эти события еще не сохранены в Event Store
   */
  public getUncommittedEvents(): BaseDomainEvent[] {
    return [...this._uncommittedEvents];
  }

  /**
   * Пометить события как подтвержденные
   * Вызывается после успешного сохранения в Event Store
   */
  public markEventsAsCommitted(): void {
    this._uncommittedEvents = [];
  }

  /**
   * Восстановить агрегат из истории событий
   * @param events Последовательность событий
   */
  public static fromHistory<T extends EventSourcedAggregateRoot>(
    this: new (id?: string) => T,
    events: BaseDomainEvent[]
  ): T {
    if (events.length === 0) {
      throw new Error('Нельзя восстановить агрегат из пустой истории событий');
    }

    // Получаем ID агрегата из первого события
    const aggregateId = events[0].aggregateId;
    const aggregate = new this(aggregateId);

    // Восстанавливаем состояние по событиям
    events.forEach(event => {
      aggregate.applyEvent(event, false);
    });

    return aggregate;
  }

  /**
   * Применить событие к агрегату
   * @param event Событие для применения
   * @param isNew Новое событие (true) или историческое (false)
   */
  public applyEvent(event: BaseDomainEvent, isNew: boolean = true): void {
    // Применяем изменения к состоянию агрегата
    this.when(event);

    // Увеличиваем версию
    this._version++;

    // Если это новое событие, добавляем в список неподтвержденных
    if (isNew) {
      (event as any).aggregateVersion = this._version; // Type assertion для совместимости
      this._uncommittedEvents.push(event);
    }
  }

  /**
   * Обработчик событий - должен быть реализован в наследниках
   * Применяет изменения состояния на основе события
   * @param event Событие для обработки
   */
  protected abstract when(event: BaseDomainEvent): void;

  /**
   * Создать снимок состояния агрегата
   * Используется для оптимизации - вместо воспроизведения
   * всех событий можно загрузить снимок и применить только новые события
   */
  public createSnapshot(): AggregateSnapshot {
    return {
      aggregateId: this._id,
      aggregateType: this.constructor.name,
      version: this._version,
      data: this.getSnapshotData(),
      timestamp: new Date()
    };
  }

  /**
   * Восстановить агрегат из снимка
   * @param snapshot Снимок состояния
   */
  public static fromSnapshot<T extends EventSourcedAggregateRoot>(
    this: new (id?: string) => T,
    snapshot: AggregateSnapshot
  ): T {
    const aggregate = new this(snapshot.aggregateId);
    aggregate._version = snapshot.version;
    aggregate.applySnapshotData(snapshot.data);
    return aggregate;
  }

  /**
   * Получить данные для снимка
   * Должно быть реализовано в наследниках
   */
  protected abstract getSnapshotData(): any;

  /**
   * Применить данные из снимка
   * Должно быть реализовано в наследниках
   * @param data Данные снимка
   */
  protected abstract applySnapshotData(data: any): void;
}

/**
 * Интерфейс снимка агрегата
 */
export interface AggregateSnapshot {
  aggregateId: string;
  aggregateType: string;
  version: number;
  data: any;
  timestamp: Date;
}

/**
 * Интерфейс хранилища снимков
 */
export interface SnapshotStore {
  /**
   * Сохранить снимок агрегата
   */
  saveSnapshot(snapshot: AggregateSnapshot): Promise<void>;

  /**
   * Получить последний снимок агрегата
   */
  getSnapshot(aggregateId: string): Promise<AggregateSnapshot | null>;

  /**
   * Удалить старые снимки (оптимизация)
   */
  cleanupSnapshots(aggregateId: string, keepLast: number): Promise<void>;
} 