/**
 * Команда для обновления пользователя
 */
export class UpdateUserCommand {
  constructor(
    public readonly userId: string,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly email?: string
  ) {}

  /**
   * Валидация команды
   */
  validate(): void {
    if (!this.userId?.trim()) {
      throw new Error('ID пользователя обязателен');
    }

    // Проверяем, что хотя бы одно поле для обновления предоставлено
    if (!this.firstName && !this.lastName && !this.email) {
      throw new Error('Необходимо указать хотя бы одно поле для обновления');
    }

    // Проверяем, что поля не пустые, если они предоставлены
    if (this.firstName !== undefined && !this.firstName.trim()) {
      throw new Error('Имя не может быть пустым');
    }

    if (this.lastName !== undefined && !this.lastName.trim()) {
      throw new Error('Фамилия не может быть пустой');
    }

    if (this.email !== undefined && !this.email.trim()) {
      throw new Error('Email не может быть пустым');
    }
  }
} 