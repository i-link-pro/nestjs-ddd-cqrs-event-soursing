/**
 * Базовый класс для объектов-значений (Value Objects) в DDD
 * 
 * Объект-значение в DDD - это объект, который не имеет концептуальной идентичности
 * и описывается только своими атрибутами. Два объекта-значения равны, если равны
 * все их атрибуты.
 * 
 * Примеры: Email, Address, Money, Coordinate и т.д.
 */
export abstract class BaseValueObject<T> {
  protected readonly _value: T;

  constructor(value: T) {
    this.validate(value);
    this._value = Object.freeze(value);
  }

  /**
   * Получить значение объекта
   */
  public get value(): T {
    return this._value;
  }

  /**
   * Абстрактный метод валидации
   * Каждый объект-значение должен реализовать свою логику валидации
   */
  protected abstract validate(value: T): void;

  /**
   * Сравнение объектов-значений
   * Два объекта-значения равны, если равны их значения
   */
  public equals(other: BaseValueObject<T>): boolean {
    if (!other) return false;
    if (this === other) return true;
    
    return this.compareValues(this._value, other._value);
  }

  /**
   * Сравнение значений (может быть переопределено в наследниках)
   */
  protected compareValues(value1: T, value2: T): boolean {
    if (typeof value1 === 'object' && typeof value2 === 'object') {
      return JSON.stringify(value1) === JSON.stringify(value2);
    }
    return value1 === value2;
  }

  /**
   * Преобразование в строку для логирования и отладки
   */
  public toString(): string {
    return JSON.stringify(this._value);
  }
} 