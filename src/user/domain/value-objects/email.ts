import { BaseValueObject } from '@shared/domain/base-value-object';

/**
 * Объект-значение Email для домена User
 * 
 * В DDD Email - это классический пример объекта-значения.
 * Он не имеет идентичности, но имеет важные бизнес-правила валидации.
 */
export class Email extends BaseValueObject<string> {
  /**
   * Регулярное выражение для валидации email
   */
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(email: string) {
    super(email);
  }

  /**
   * Валидация email адреса
   * @param email - email для валидации
   * @throws Error если email невалидный
   */
  protected validate(email: string): void {
    if (!email) {
      throw new Error('Email не может быть пустым');
    }

    if (!Email.EMAIL_REGEX.test(email)) {
      throw new Error('Некорректный формат email адреса');
    }

    if (email.length > 254) {
      throw new Error('Email слишком длинный (максимум 254 символа)');
    }
  }

  /**
   * Получить домен из email
   * @returns строка с доменом
   */
  public getDomain(): string {
    return this._value.split('@')[1];
  }

  /**
   * Получить локальную часть email (до @)
   * @returns строка с локальной частью
   */
  public getLocalPart(): string {
    return this._value.split('@')[0];
  }

  /**
   * Проверить, является ли email корпоративным
   * @param corporateDomains - список корпоративных доменов
   * @returns true если email корпоративный
   */
  public isCorporate(corporateDomains: string[]): boolean {
    return corporateDomains.includes(this.getDomain());
  }

  /**
   * Статический метод для создания Email
   * @param email - строка с email
   * @returns экземпляр Email
   */
  public static create(email: string): Email {
    return new Email(email.toLowerCase().trim());
  }
} 