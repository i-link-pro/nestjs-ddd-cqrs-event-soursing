/**
 * Базовый класс для всех сущностей (Entity) в DDD
 * 
 * В Domain-Driven Design сущность - это объект, который имеет уникальную идентичность
 * и жизненный цикл. Сущности отличаются от объектов-значений тем, что их можно
 * различить по идентификатору, а не по содержимому.
 */
export abstract class BaseEntity {
  /**
   * Уникальный идентификатор сущности
   * В DDD каждая сущность должна иметь уникальный ID
   */
  protected _id: string;

  /**
   * Дата создания сущности
   */
  protected _createdAt: Date;

  /**
   * Дата последнего обновления сущности
   */
  protected _updatedAt: Date;

  constructor(id?: string) {
    this._id = id || this.generateId();
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Получить ID сущности
   * Геттер для доступа к приватному полю ID
   */
  public get id(): string {
    return this._id;
  }

  /**
   * Получить дату создания
   */
  public get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * Получить дату обновления
   */
  public get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Обновить временные метки
   * Вызывается при изменении сущности
   */
  protected touch(): void {
    this._updatedAt = new Date();
  }

  /**
   * Сравнение сущностей по ID
   * В DDD две сущности считаются равными, если у них одинаковый ID
   */
  public equals(other: BaseEntity): boolean {
    if (!other) return false;
    if (this === other) return true;
    return this._id === other._id;
  }

  /**
   * Генерация уникального ID
   * В реальном проекте можно использовать UUID или другой генератор
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
} 