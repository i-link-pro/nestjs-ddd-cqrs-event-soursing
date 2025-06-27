import { Injectable } from '@nestjs/common';
import { Mediator } from '@shared/application/mediator.interface';
import { CreateUserCommand } from '../commands/create-user.command';
import { UpdateUserCommand } from '../commands/update-user.command';
import { ActivateUserCommand } from '../commands/handlers/activate-user.handler';
import { GetUserQuery, GetUserByEmailQuery, GetUsersQuery } from '../queries/get-user.query';
import { GetUserAnalyticsQuery } from '../queries/user-analytics.query';
import { UserReadModel } from '../../infrastructure/read-models/user.read-model';
import { PaginatedResult } from '@shared/application/query.interface';

/**
 * CQRS сервис для пользователей
 * 
 * Этот сервис демонстрирует использование паттерна CQRS
 * через медиатор. В реальном проекте рекомендуется
 * использовать библиотеку @nestjs/cqrs.
 */
@Injectable()
export class UserCqrsService {
  constructor(private readonly mediator: Mediator) {}

  /**
   * === КОМАНДЫ (изменение состояния) ===
   */

  /**
   * Создать пользователя через CQRS
   */
  async createUser(data: {
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<any> {
    const command = new CreateUserCommand(
      data.email,
      data.firstName,
      data.lastName
    );

    const result = await this.mediator.send(command);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data;
  }

  /**
   * Обновить пользователя через CQRS
   */
  async updateUser(data: {
    userId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<any> {
    const command = new UpdateUserCommand(
      data.userId,
      data.email,
      data.firstName,
      data.lastName
    );

    const result = await this.mediator.send(command);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data;
  }

  /**
   * Активировать пользователя через CQRS
   */
  async activateUser(userId: string): Promise<any> {
    const command = new ActivateUserCommand(userId);

    const result = await this.mediator.send(command);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data;
  }

  /**
   * === ЗАПРОСЫ (чтение данных) ===
   */

  /**
   * Получить пользователя по ID через CQRS
   */
  async getUserById(userId: string): Promise<UserReadModel | null> {
    const query = new GetUserQuery(userId);
    return await this.mediator.query(query);
  }

  /**
   * Получить пользователя по email через CQRS
   */
  async getUserByEmail(email: string): Promise<UserReadModel | null> {
    const query = new GetUserByEmailQuery(email);
    return await this.mediator.query(query);
  }

  /**
   * Получить список пользователей через CQRS
   */
  async getUsers(params: {
    page?: number;
    limit?: number;
    status?: string;
    emailVerified?: boolean;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<PaginatedResult<UserReadModel>> {
    const query = new GetUsersQuery(
      params.page || 1,
      params.limit || 10,
      params.status,
      params.emailVerified,
      params.sortBy || 'createdAt',
      params.sortOrder || 'DESC'
    );

    return await this.mediator.query(query);
  }

  /**
   * Получить аналитику пользователей через CQRS
   */
  async getUserAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<any> {
    const query = new GetUserAnalyticsQuery(period);
    return await this.mediator.query(query);
  }

  /**
   * === ДЕМОНСТРАЦИЯ ПРЕИМУЩЕСТВ CQRS ===
   */

  /**
   * Сложная операция, демонстрирующая разделение команд и запросов
   */
  async createAndRetrieveUser(data: {
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<{
    user: any;
    readModel: UserReadModel | null;
    analytics: any;
  }> {
    console.log('🔄 Демонстрация CQRS: создание пользователя и сложный запрос');

    // 1. Команда: создание пользователя
    const user = await this.createUser(data);
    console.log('✅ Команда выполнена: пользователь создан');

    // 2. Запрос: получение read model
    const readModel = await this.getUserById(user.id);
    console.log('✅ Запрос выполнен: read model получена');

    // 3. Запрос: получение аналитики
    const analytics = await this.getUserAnalytics('month');
    console.log('✅ Запрос выполнен: аналитика получена');

    return {
      user,
      readModel,
      analytics
    };
  }

  /**
   * Пакетная обработка через CQRS
   */
  async batchProcessUsers(operations: Array<{
    type: 'create' | 'update' | 'activate';
    data: any;
  }>): Promise<any[]> {
    console.log(`🔄 Пакетная обработка ${operations.length} операций через CQRS`);

    const results = [];

    for (const operation of operations) {
      try {
        let result;

        switch (operation.type) {
          case 'create':
            result = await this.createUser(operation.data);
            break;
          case 'update':
            result = await this.updateUser(operation.data);
            break;
          case 'activate':
            result = await this.activateUser(operation.data.userId);
            break;
          default:
            throw new Error(`Неизвестный тип операции: ${operation.type}`);
        }

        results.push({
          success: true,
          operation: operation.type,
          result
        });

        console.log(`✅ Операция ${operation.type} выполнена успешно`);
      } catch (error) {
        results.push({
          success: false,
          operation: operation.type,
          error: error.message
        });

        console.log(`❌ Операция ${operation.type} завершилась с ошибкой: ${error.message}`);
      }
    }

    return results;
  }
} 