import { Command, CommandResult } from './command.interface';
import { Query } from './query.interface';

/**
 * Интерфейс медиатора для CQRS
 * 
 * Медиатор обеспечивает развязку между отправителями команд/запросов
 * и их обработчиками. Это центральная точка для обработки всех
 * команд и запросов в приложении.
 */
export interface Mediator {
  /**
   * Отправить команду на выполнение
   * @param command - команда для выполнения
   * @returns результат выполнения команды
   */
  send<TResult = void>(command: Command): Promise<CommandResult<TResult>>;

  /**
   * Отправить запрос на выполнение
   * @param query - запрос для выполнения
   * @returns результат запроса
   */
  query<TResult>(query: Query): Promise<TResult>;

  /**
   * Опубликовать событие
   * @param event - событие для публикации
   */
  publish(event: any): Promise<void>;
}

/**
 * Простая реализация медиатора
 * В реальном проекте лучше использовать библиотеку типа @nestjs/cqrs
 */
export class SimpleMediator implements Mediator {
  private commandHandlers = new Map<string, any>();
  private queryHandlers = new Map<string, any>();
  private eventHandlers = new Map<string, any[]>();

  /**
   * Зарегистрировать обработчик команды
   */
  registerCommandHandler<T extends Command>(
    commandType: new (...args: any[]) => T,
    handler: any
  ): void {
    this.commandHandlers.set(commandType.name, handler);
  }

  /**
   * Зарегистрировать обработчик запроса
   */
  registerQueryHandler<T extends Query>(
    queryType: new (...args: any[]) => T,
    handler: any
  ): void {
    this.queryHandlers.set(queryType.name, handler);
  }

  /**
   * Зарегистрировать обработчик события
   */
  registerEventHandler(eventType: string, handler: any): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  async send<TResult = void>(command: Command): Promise<CommandResult<TResult>> {
    try {
      command.validate();
      
      const handler = this.commandHandlers.get(command.constructor.name);
      if (!handler) {
        throw new Error(`No handler found for command ${command.constructor.name}`);
      }

      const result = await handler.handle(command);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async query<TResult>(query: Query): Promise<TResult> {
    query.validate();
    
    const handler = this.queryHandlers.get(query.constructor.name);
    if (!handler) {
      throw new Error(`No handler found for query ${query.constructor.name}`);
    }

    return await handler.handle(query);
  }

  async publish(event: any): Promise<void> {
    const handlers = this.eventHandlers.get(event.constructor.name) || [];
    
    await Promise.all(
      handlers.map(handler => handler.handle(event))
    );
  }
} 