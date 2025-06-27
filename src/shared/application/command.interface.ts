/**
 * Базовый интерфейс для команд в CQRS
 * 
 * Команды представляют намерения изменить состояние системы.
 * Они содержат только данные, необходимые для выполнения операции.
 */
export interface Command {
  /**
   * Валидация команды
   * Проверяет структуру и базовые правила
   */
  validate(): void;
}

/**
 * Интерфейс для обработчиков команд
 */
export interface CommandHandler<TCommand extends Command, TResult = void> {
  /**
   * Обработать команду
   * @param command - команда для обработки
   * @returns результат выполнения команды
   */
  handle(command: TCommand): Promise<TResult>;
}

/**
 * Результат выполнения команды
 */
export interface CommandResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  events?: any[];
} 