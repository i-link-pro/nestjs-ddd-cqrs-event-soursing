import { BaseValueObject } from '@shared/domain/base-value-object';

/**
 * Интерфейс для данных имени пользователя
 */
interface UserNameData {
  firstName: string;
  lastName: string;
}

/**
 * Объект-значение UserName для домена User
 * 
 * Инкапсулирует имя и фамилию пользователя с соответствующими
 * бизнес-правилами валидации.
 */
export class UserName extends BaseValueObject<UserNameData> {
  constructor(firstName: string, lastName: string) {
    super({ firstName: firstName.trim(), lastName: lastName.trim() });
  }

  /**
   * Валидация имени пользователя
   * @param value - данные имени для валидации
   * @throws Error если имя невалидное
   */
  protected validate(value: UserNameData): void {
    if (!value.firstName || !value.lastName) {
      throw new Error('Имя и фамилия обязательны');
    }

    if (value.firstName.length < 2 || value.firstName.length > 50) {
      throw new Error('Имя должно содержать от 2 до 50 символов');
    }

    if (value.lastName.length < 2 || value.lastName.length > 50) {
      throw new Error('Фамилия должна содержать от 2 до 50 символов');
    }

    // Проверка на наличие только букв и пробелов
    const nameRegex = /^[a-zA-ZА-Яа-яёЁ\s-]+$/;
    if (!nameRegex.test(value.firstName) || !nameRegex.test(value.lastName)) {
      throw new Error('Имя и фамилия должны содержать только буквы, пробелы и дефисы');
    }
  }

  /**
   * Получить имя
   * @returns строка с именем
   */
  public get firstName(): string {
    return this._value.firstName;
  }

  /**
   * Получить фамилию
   * @returns строка с фамилией
   */
  public get lastName(): string {
    return this._value.lastName;
  }

  /**
   * Получить полное имя
   * @returns строка с полным именем
   */
  public getFullName(): string {
    return `${this._value.firstName} ${this._value.lastName}`;
  }

  /**
   * Получить инициалы
   * @returns строка с инициалами
   */
  public getInitials(): string {
    return `${this._value.firstName[0]}.${this._value.lastName[0]}.`;
  }

  /**
   * Статический метод для создания UserName
   * @param firstName - имя
   * @param lastName - фамилия
   * @returns экземпляр UserName
   */
  public static create(firstName: string, lastName: string): UserName {
    return new UserName(firstName, lastName);
  }
} 