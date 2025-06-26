/**
 * Паттерн Specification (Спецификация) в DDD
 * 
 * Спецификация инкапсулирует бизнес-правило, которое можно комбинировать
 * с другими спецификациями с помощью логических операторов.
 * 
 * Преимущества:
 * - Переиспользование бизнес-правил
 * - Комбинирование правил
 * - Явное выражение бизнес-логики
 * - Легкое тестирование
 */
export interface Specification<T> {
  /**
   * Проверить, удовлетворяет ли объект спецификации
   */
  isSatisfiedBy(candidate: T): boolean;

  /**
   * Логическое И с другой спецификацией
   */
  and(other: Specification<T>): Specification<T>;

  /**
   * Логическое ИЛИ с другой спецификацией  
   */
  or(other: Specification<T>): Specification<T>;

  /**
   * Логическое НЕ
   */
  not(): Specification<T>;
}

/**
 * Базовая реализация спецификации
 */
export abstract class BaseSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;

  and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other);
  }

  or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other);
  }

  not(): Specification<T> {
    return new NotSpecification(this);
  }
}

/**
 * Спецификация для логического И
 */
class AndSpecification<T> extends BaseSpecification<T> {
  constructor(
    private readonly left: Specification<T>,
    private readonly right: Specification<T>
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

/**
 * Спецификация для логического ИЛИ
 */
class OrSpecification<T> extends BaseSpecification<T> {
  constructor(
    private readonly left: Specification<T>,
    private readonly right: Specification<T>
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }
}

/**
 * Спецификация для логического НЕ
 */
class NotSpecification<T> extends BaseSpecification<T> {
  constructor(private readonly spec: Specification<T>) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return !this.spec.isSatisfiedBy(candidate);
  }
} 