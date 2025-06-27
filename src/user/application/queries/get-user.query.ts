import { Query } from '@shared/application/query.interface';

/**
 * Запрос для получения пользователя по ID
 * 
 * В CQRS запросы предназначены только для чтения данных.
 * Они не должны изменять состояние системы.
 */
export class GetUserQuery implements Query {
  constructor(public readonly userId: string) {}

  validate(): void {
    if (!this.userId?.trim()) {
      throw new Error('ID пользователя обязателен');
    }
  }
}

/**
 * Запрос для получения пользователя по email
 */
export class GetUserByEmailQuery implements Query {
  constructor(public readonly email: string) {}

  validate(): void {
    if (!this.email?.trim()) {
      throw new Error('Email обязателен');
    }
  }
}

/**
 * Запрос для получения всех пользователей с фильтрацией
 */
export class GetUsersQuery implements Query {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly status?: string,
    public readonly emailVerified?: boolean,
    public readonly sortBy: string = 'createdAt',
    public readonly sortOrder: 'ASC' | 'DESC' = 'DESC'
  ) {}

  validate(): void {
    if (this.page < 1) {
      throw new Error('Номер страницы должен быть больше 0');
    }

    if (this.limit < 1 || this.limit > 100) {
      throw new Error('Количество записей должно быть от 1 до 100');
    }

    const allowedSortFields = ['createdAt', 'updatedAt', 'email', 'status'];
    if (!allowedSortFields.includes(this.sortBy)) {
      throw new Error(`Сортировка по полю ${this.sortBy} не поддерживается`);
    }
  }
} 