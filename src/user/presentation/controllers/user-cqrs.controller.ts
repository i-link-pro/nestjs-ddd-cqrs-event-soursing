import { Controller, Post, Get, Put, Param, Body, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UserCqrsService } from '../../application/services/user-cqrs.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { SimpleMediator } from '../../../shared/application/mediator.interface';
import { CreateUserCommand } from '../../application/commands/create-user.command';
import { UpdateUserCommand } from '../../application/commands/update-user.command';
import { ActivateUserCommand } from '../../application/commands/handlers/activate-user.handler';
import { GetUserQuery, GetUserByEmailQuery, GetUsersQuery } from '../../application/queries/get-user.query';
import { GetUserAnalyticsQuery, GetUserRecommendationsQuery, GetUserHealthCheckQuery } from '../../application/queries/user-analytics.query';

/**
 * CQRS контроллер для управления пользователями
 * 
 * Демонстрирует применение CQRS (Command Query Responsibility Segregation):
 * - Команды (Commands) для изменения состояния
 * - Запросы (Queries) для получения данных
 * - Медиатор для развязки контроллера от handlers
 * - Read Models для оптимизированного чтения
 */
@ApiTags('CQRS - Пользователи')
@Controller('cqrs/users')
export class UserCqrsController {
  constructor(
    private readonly userCqrsService: UserCqrsService,
    private readonly mediator: SimpleMediator
  ) {}

  /**
   * Создать пользователя (Command)
   */
  @Post()
  @ApiOperation({ 
    summary: 'Создать пользователя (CQRS Command)',
    description: 'Выполняет команду создания пользователя через медиатор'
  })
  @ApiResponse({ status: 201, description: 'Пользователь успешно создан' })
  async createUser(@Body() createUserDto: CreateUserDto) {
    try {
      const command = new CreateUserCommand(
        createUserDto.email,
        createUserDto.firstName,
        createUserDto.lastName
      );

      const result = await this.mediator.send(command);

      return {
        success: true,
        message: 'Пользователь создан через CQRS',
        data: result.data,
        cqrs: {
          commandHandled: true,
          readModelGenerated: true,
          handlerUsed: 'CreateUserHandler'
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Получить пользователя по ID (Query)
   */
  @Get(':id')
  @ApiOperation({ 
    summary: 'Получить пользователя (CQRS Query)',
    description: 'Выполняет запрос получения пользователя через Read Model'
  })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  async getUser(@Param('id') id: string) {
    try {
      const query = new GetUserQuery(id);
      const result = await this.mediator.query(query);

      if (!result) {
        throw new NotFoundException('Пользователь не найден');
      }

      return {
        success: true,
        data: result,
        cqrs: {
          queryHandled: true,
          readModelUsed: true,
          handlerUsed: 'GetUserHandler',
          optimizedForRead: true
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Получить пользователя по email (Query)
   */
  @Get('by-email/:email')
  @ApiOperation({ 
    summary: 'Получить пользователя по email (CQRS Query)',
    description: 'Выполняет оптимизированный запрос поиска по email'
  })
  @ApiParam({ name: 'email', description: 'Email пользователя' })
  async getUserByEmail(@Param('email') email: string) {
    try {
      const query = new GetUserByEmailQuery(email);
      const result = await this.mediator.query(query);

      if (!result) {
        throw new NotFoundException('Пользователь не найден');
      }

      return {
        success: true,
        data: result,
        cqrs: {
          queryHandled: true,
          readModelUsed: true,
          handlerUsed: 'GetUserByEmailHandler',
          optimizedForRead: true
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Получить список пользователей с фильтрацией (Query)
   */
  @Get()
  @ApiOperation({ 
    summary: 'Получить список пользователей (CQRS Query)',
    description: 'Выполняет запрос списка пользователей с фильтрацией через Read Model'
  })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество на странице' })
  @ApiQuery({ name: 'status', required: false, description: 'Статус пользователя' })
  @ApiQuery({ name: 'emailVerified', required: false, description: 'Email подтвержден' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Поле для сортировки' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Порядок сортировки (ASC/DESC)' })
  async getUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
    @Query('emailVerified') emailVerified?: string,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: string = 'DESC'
  ) {
    try {
      const query = new GetUsersQuery(
        parseInt(page),
        parseInt(limit),
        status,
        emailVerified ? emailVerified === 'true' : undefined,
        sortBy,
        sortOrder.toUpperCase() as 'ASC' | 'DESC'
      );

      const result = await this.mediator.query(query) as any;

      return {
        success: true,
        data: result?.items || [],
        pagination: {
          page: result?.page || parseInt(page),
          limit: result?.limit || parseInt(limit),
          total: result?.total || 0,
          totalPages: result?.totalPages || 0
        },
        cqrs: {
          queryHandled: true,
          readModelUsed: true,
          handlerUsed: 'GetUsersHandler',
          optimizedForRead: true,
          filtersApplied: {
            status: !!status,
            emailVerified: emailVerified !== undefined,
            sorting: `${sortBy} ${sortOrder}`
          }
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Обновить пользователя (Command)
   */
  @Put(':id')
  @ApiOperation({ 
    summary: 'Обновить пользователя (CQRS Command)',
    description: 'Выполняет команду обновления пользователя'
  })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateData: { firstName?: string; lastName?: string }
  ) {
    try {
      const command = new UpdateUserCommand(
        id,
        updateData.firstName,
        updateData.lastName
      );

      const result = await this.mediator.send(command);

      return {
        success: true,
        message: 'Пользователь обновлен через CQRS',
        data: result.data,
        cqrs: {
          commandHandled: true,
          readModelUpdated: true,
          handlerUsed: 'UpdateUserHandler'
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Активировать пользователя (Command)
   */
  @Put(':id/activate')
  @ApiOperation({ 
    summary: 'Активировать пользователя (CQRS Command)',
    description: 'Выполняет команду активации пользователя'
  })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  async activateUser(@Param('id') id: string) {
    try {
      const command = new ActivateUserCommand(id);
      const result = await this.mediator.send(command);

      return {
        success: true,
        message: 'Пользователь активирован через CQRS',
        data: result.data,
        cqrs: {
          commandHandled: true,
          readModelUpdated: true,
          handlerUsed: 'ActivateUserHandler'
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Получить аналитику пользователей (Query)
   */
  @Get('analytics/overview')
  @ApiOperation({ 
    summary: 'Аналитика пользователей (CQRS Query)',
    description: 'Выполняет запрос аналитических данных через специализированный Read Model'
  })
  @ApiQuery({ name: 'period', required: false, description: 'Период аналитики (day/week/month)' })
  async getUserAnalytics(@Query('period') period: string = 'month') {
    try {
      // Валидация периода
      const validPeriods = ['day', 'week', 'month', 'year'];
      const validatedPeriod = validPeriods.includes(period) ? period as 'day' | 'week' | 'month' | 'year' : 'month';
      
      const query = new GetUserAnalyticsQuery(validatedPeriod);
      const result = await this.mediator.query(query);

      return {
        success: true,
        data: result,
        cqrs: {
          queryHandled: true,
          analyticalReadModel: true,
          handlerUsed: 'GetUserAnalyticsHandler',
          period: validatedPeriod,
          optimizedForAnalytics: true
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Получить рекомендации для пользователя (Query)
   */
  @Get(':id/recommendations')
  @ApiOperation({ 
    summary: 'Рекомендации для пользователя (CQRS Query)',
    description: 'Выполняет запрос персонализированных рекомендаций'
  })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  async getUserRecommendations(@Param('id') id: string) {
    try {
      const query = new GetUserRecommendationsQuery(id);
      const result = await this.mediator.query(query);

      return {
        success: true,
        data: result,
        cqrs: {
          queryHandled: true,
          personalizedReadModel: true,
          handlerUsed: 'GetUserRecommendationsHandler',
          userId: id
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Health check системы (Query)
   */
  @Get('health/check')
  @ApiOperation({ 
    summary: 'Health check системы (CQRS Query)',
    description: 'Выполняет проверку состояния системы через CQRS'
  })
  async getHealthCheck() {
    try {
      const query = new GetUserHealthCheckQuery('system');
      const result = await this.mediator.query(query);

      return {
        success: true,
        data: result,
        cqrs: {
          queryHandled: true,
          systemReadModel: true,
          handlerUsed: 'GetUserHealthCheckHandler'
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Демо: создание и анализ пользователя (Command + Query)
   */
  @Post('demo/create-and-analyze')
  @ApiOperation({ 
    summary: 'Демо: создание и анализ (CQRS)',
    description: 'Демонстрирует последовательное выполнение Command и Query через медиатор'
  })
  async demoCreateAndAnalyze(@Body() createUserDto: CreateUserDto) {
    try {
      // 1. Команда: создать пользователя
      const createCommand = new CreateUserCommand(
        createUserDto.email,
        createUserDto.firstName,
        createUserDto.lastName
      );
      const createResult = await this.mediator.send(createCommand);
      const createdUserData = createResult.data as any;

      // 2. Запрос: получить созданного пользователя
      const getUserQuery = new GetUserQuery(createdUserData?.id || 'unknown');
      const getUserResult = await this.mediator.query(getUserQuery);

      // 3. Запрос: получить общую аналитику
      const analyticsQuery = new GetUserAnalyticsQuery('day');
      const analyticsResult = await this.mediator.query(analyticsQuery);

      return {
        success: true,
        message: 'Демонстрация CQRS завершена',
        demo: {
          step1_command: {
            type: 'CreateUserCommand',
            handler: 'CreateUserHandler',
            result: createResult.data
          },
          step2_query: {
            type: 'GetUserQuery',
            handler: 'GetUserHandler',
            result: getUserResult
          },
          step3_analytics: {
            type: 'GetUserAnalyticsQuery',
            handler: 'GetUserAnalyticsHandler',
            result: analyticsResult
          }
        },
        cqrs: {
          commandsExecuted: 1,
          queriesExecuted: 2,
          mediatorUsed: true,
          readModelsUsed: true
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Демо: пакетные операции (Multiple Commands)
   */
  @Post('demo/batch-operations')
  @ApiOperation({ 
    summary: 'Демо: пакетные операции (CQRS)',
    description: 'Демонстрирует выполнение множественных команд через CQRS'
  })
  async demoBatchOperations(@Body() operations: Array<{
    type: 'create' | 'update' | 'activate';
    data: any;
  }>) {
    try {
      const results = [];

      for (const operation of operations) {
        let command;
        let result;

        switch (operation.type) {
          case 'create':
            command = new CreateUserCommand(
              operation.data.email,
              operation.data.firstName,
              operation.data.lastName
            );
            result = await this.mediator.send(command);
            const createdUserData = result.data as any;
            results.push({
              operation: 'create',
              command: 'CreateUserCommand',
              success: true,
              userId: createdUserData?.id || 'unknown',
              email: createdUserData?.email || operation.data.email
            });
            break;

          case 'update':
            command = new UpdateUserCommand(
              operation.data.userId,
              operation.data.firstName,
              operation.data.lastName
            );
            result = await this.mediator.send(command);
            const updatedUserData = result.data as any;
            results.push({
              operation: 'update',
              command: 'UpdateUserCommand',
              success: true,
              userId: updatedUserData?.id || operation.data.userId
            });
            break;

          case 'activate':
            command = new ActivateUserCommand(operation.data.userId);
            result = await this.mediator.send(command);
            const activatedUserData = result.data as any;
            results.push({
              operation: 'activate',
              command: 'ActivateUserCommand',
              success: true,
              userId: activatedUserData?.id || operation.data.userId,
              status: activatedUserData?.status || 'unknown'
            });
            break;

          default:
            results.push({
              operation: operation.type,
              success: false,
              error: 'Неизвестная операция'
            });
        }
      }

      return {
        success: true,
        message: 'Пакетные операции CQRS завершены',
        demo: {
          totalOperations: operations.length,
          results,
          successfulOperations: results.filter(r => r.success).length
        },
        cqrs: {
          batchProcessing: true,
          mediatorUsed: true,
          multipleCommandHandlers: true
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
} 