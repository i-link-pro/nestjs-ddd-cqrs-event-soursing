import { BaseEntity } from './base-entity';
import { DomainEvent } from '../../shared/domain/domain-event';

/**
 * Базовый класс для корней агрегатов в DDD
 * 
 * Агрегат - это группа связанных сущностей, которые рассматриваются 
 * как единое целое для целей обеспечения согласованности данных.
 * 
 * Корень агрегата - это единственная сущность, через которую 
 * внешние объекты могут ссылаться на любые объекты внутри агрегата.
 * 
 * Ключевые принципы:
 * - Только корень агрегата может быть получен через репозиторий
 * - Объекты вне агрегата не могут ссылаться на внутренние объекты
 * - Корень агрегата отвечает за инвариантность агрегата
 * - Доменные события публикуются через корень агрегата
 */
export abstract class AggregateRoot extends BaseEntity {
  private _domainEvents: DomainEvent[] = [];

  /**
   * Получить все доменные события
   */
  public get domainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  /**
   * Добавить доменное событие
   * События будут опубликованы после сохранения агрегата
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
    console.log(`📢 Доменное событие добавлено: ${event.constructor.name}`);
  }

  /**
   * Очистить все доменные события
   * Обычно вызывается после публикации событий
   */
  public clearDomainEvents(): void {
    this._domainEvents = [];
  }

  /**
   * Проверить, есть ли непубликованные события
   */
  public hasUnpublishedEvents(): boolean {
    return this._domainEvents.length > 0;
  }

  /**
   * Пометить агрегат как измененный
   * Вызывается при любом изменении состояния агрегата
   */
  protected markAsModified(): void {
    this.touch();
  }
} 