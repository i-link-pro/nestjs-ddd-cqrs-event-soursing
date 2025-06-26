/**
 * Команда для создания пользователя
 * 
 * В DDD команды представляют намерения изменить состояние системы.
 * Команды содержат только данные, необходимые для выполнения операции,
 * без логики их выполнения.
 */
export class CreateUserCommand {
  constructor(
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string
  ) {}

  /**
   * Валидация команды на уровне структуры
   * Проверяет наличие обязательных полей
   */
  validate(): void {
    if (!this.email?.trim()) {
      throw new Error('Email обязателен для заполнения');
    }

    if (!this.firstName?.trim()) {
      throw new Error('Имя обязательно для заполнения');
    }

    if (!this.lastName?.trim()) {
      throw new Error('Фамилия обязательна для заполнения');
    }
  }
} 