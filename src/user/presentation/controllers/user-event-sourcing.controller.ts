import { Controller, Post, Get, Put, Param, Body, NotFoundException, BadRequestException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UserEventSourcedRepository } from '../../infrastructure/event-sourcing/user-event-sourced.repository';
import { UserEventSourcedAggregate } from '../../domain/entities/user-event-sourced.aggregate';
import { Email } from '../../domain/value-objects/email';
import { UserName } from '../../domain/value-objects/user-name';
import { CreateUserDto } from '../dto/create-user.dto';
import { InMemoryEventStore } from '../../infrastructure/event-sourcing/in-memory-event-store';

/**
 * Контроллер для демонстрации Event Sourcing
 * 
 * Показывает работу с агрегатами через Event Store:
 * - Создание агрегатов через события
 * - Восстановление состояния из событий
 * - Просмотр истории событий
 * - Replay агрегатов
 */
@ApiTags('Event Sourcing - Пользователи')
@Controller('event-sourcing/users')
export class UserEventSourcingController {
  constructor(
    private readonly userEventSourcedRepository: UserEventSourcedRepository,
    private readonly eventStore: InMemoryEventStore
  ) {}

  /**
   * Создать пользователя с Event Sourcing
   */
  @Post()
  @ApiOperation({ 
    summary: 'Создать пользователя (Event Sourcing)',
    description: 'Создает нового пользователя, сохраняя событие UserCreatedEvent в Event Store'
  })
  @ApiResponse({ status: 201, description: 'Пользователь успешно создан' })
  async createUser(@Body() createUserDto: CreateUserDto) {
    try {
      // Создаем объекты-значения
      const email = Email.create(createUserDto.email);
      const userName = UserName.create(createUserDto.firstName, createUserDto.lastName);

      // Создаем агрегат - это генерирует событие UserCreatedEvent
      const user = UserEventSourcedAggregate.create(email, userName);

      // Сохраняем агрегат - события сохраняются в Event Store
      await this.userEventSourcedRepository.save(user);

      return {
        success: true,
        message: 'Пользователь создан через Event Sourcing',
        data: {
          id: user.id,
          email: user.email.value,
          fullName: user.getFullName(),
          status: user.status,
          version: user.version,
          isEmailVerified: user.isEmailVerified
        },
        eventSourcing: {
          eventsGenerated: user.getUncommittedEvents().length,
          currentVersion: user.version
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Получить пользователя (восстановление из событий)
   */
  @Get(':id')
  @ApiOperation({ 
    summary: 'Получить пользователя (Event Sourcing)',
    description: 'Восстанавливает состояние пользователя из Event Store'
  })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  async getUser(@Param('id') id: string) {
    const user = await this.userEventSourcedRepository.getById(id);
    
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email.value,
        fullName: user.getFullName(),
        status: user.status,
        version: user.version,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      },
      eventSourcing: {
        restoredFromEvents: true,
        currentVersion: user.version
      }
    };
  }

  /**
   * Активировать пользователя
   */
  @Put(':id/activate')
  @ApiOperation({ 
    summary: 'Активировать пользователя',
    description: 'Активирует пользователя, генерируя событие UserActivatedEvent'
  })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  async activateUser(@Param('id') id: string) {
    const user = await this.userEventSourcedRepository.getById(id);
    
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const oldVersion = user.version;
    
    // Активируем пользователя - это генерирует событие
    user.activate();

    // Сохраняем изменения
    await this.userEventSourcedRepository.save(user);

    return {
      success: true,
      message: 'Пользователь активирован',
      data: {
        id: user.id,
        status: user.status,
        version: user.version
      },
      eventSourcing: {
        versionBefore: oldVersion,
        versionAfter: user.version,
        eventGenerated: 'UserActivatedEvent'
      }
    };
  }

  /**
   * Заблокировать пользователя
   */
  @Put(':id/block')
  @ApiOperation({ 
    summary: 'Заблокировать пользователя',
    description: 'Блокирует пользователя, генерируя событие UserBlockedEvent'
  })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  async blockUser(
    @Param('id') id: string,
    @Body() blockData: { reason: string }
  ) {
    const user = await this.userEventSourcedRepository.getById(id);
    
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const oldVersion = user.version;
    
    // Блокируем пользователя
    user.block(blockData.reason);

    // Сохраняем изменения
    await this.userEventSourcedRepository.save(user);

    return {
      success: true,
      message: 'Пользователь заблокирован',
      data: {
        id: user.id,
        status: user.status,
        version: user.version
      },
      eventSourcing: {
        versionBefore: oldVersion,
        versionAfter: user.version,
        eventGenerated: 'UserBlockedEvent'
      }
    };
  }

  /**
   * Подтвердить email пользователя
   */
  @Put(':id/verify-email')
  @ApiOperation({ 
    summary: 'Подтвердить email',
    description: 'Подтверждает email пользователя, генерируя событие UserEmailVerifiedEvent'
  })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  async verifyEmail(@Param('id') id: string) {
    const user = await this.userEventSourcedRepository.getById(id);
    
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const oldVersion = user.version;
    
    // Подтверждаем email
    user.verifyEmail();

    // Сохраняем изменения
    await this.userEventSourcedRepository.save(user);

    return {
      success: true,
      message: 'Email подтвержден',
      data: {
        id: user.id,
        isEmailVerified: user.isEmailVerified,
        version: user.version
      },
      eventSourcing: {
        versionBefore: oldVersion,
        versionAfter: user.version,
        eventGenerated: 'UserEmailVerifiedEvent'
      }
    };
  }

  /**
   * Изменить email пользователя
   */
  @Put(':id/change-email')
  @ApiOperation({ 
    summary: 'Изменить email',
    description: 'Изменяет email пользователя, генерируя событие UserEmailChangedEvent'
  })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  async changeEmail(
    @Param('id') id: string,
    @Body() emailData: { newEmail: string }
  ) {
    const user = await this.userEventSourcedRepository.getById(id);
    
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const oldEmail = user.email.value;
    const oldVersion = user.version;
    
    // Изменяем email
    const newEmail = Email.create(emailData.newEmail);
    user.changeEmail(newEmail);

    // Сохраняем изменения
    await this.userEventSourcedRepository.save(user);

    return {
      success: true,
      message: 'Email изменен',
      data: {
        id: user.id,
        oldEmail,
        newEmail: user.email.value,
        isEmailVerified: user.isEmailVerified, // Сбрасывается при смене email
        version: user.version
      },
      eventSourcing: {
        versionBefore: oldVersion,
        versionAfter: user.version,
        eventGenerated: 'UserEmailChangedEvent'
      }
    };
  }

  /**
   * Получить историю событий пользователя
   */
  @Get(':id/events')
  @ApiOperation({ 
    summary: 'История событий пользователя',
    description: 'Возвращает полную историю событий агрегата'
  })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  async getEventHistory(@Param('id') id: string) {
    const history = await this.userEventSourcedRepository.getEventHistory(id);
    
    if (history.length === 0) {
      throw new NotFoundException('Пользователь не найден или нет событий');
    }

    return {
      success: true,
      data: {
        aggregateId: id,
        totalEvents: history.length,
        currentVersion: history[history.length - 1]?.version || 0,
        events: history.map(event => ({
          version: event.version,
          eventType: event.eventType,
          timestamp: event.timestamp,
          data: event.data
        }))
      }
    };
  }

  /**
   * Replay агрегата из истории событий
   */
  @Post(':id/replay')
  @ApiOperation({ 
    summary: 'Replay агрегата из событий',
    description: 'Пересоздает агрегат из полной истории событий для проверки целостности'
  })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  async replayAggregate(@Param('id') id: string) {
    const user = await this.userEventSourcedRepository.replayFromHistory(id);
    
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const history = await this.userEventSourcedRepository.getEventHistory(id);

    return {
      success: true,
      message: 'Агрегат успешно восстановлен из истории событий',
      data: {
        id: user.id,
        email: user.email.value,
        fullName: user.getFullName(),
        status: user.status,
        version: user.version,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt
      },
      replay: {
        totalEventsReplayed: history.length,
        finalVersion: user.version,
        replaySuccessful: true
      }
    };
  }

  /**
   * Получить статистику Event Store
   */
  @Get('admin/event-store-stats')
  @ApiOperation({ 
    summary: 'Статистика Event Store',
    description: 'Возвращает статистику по всем агрегатам в Event Store'
  })
  async getEventStoreStatistics() {
    const stats = this.eventStore.getStatistics();

    return {
      success: true,
      data: {
        totalAggregates: stats.totalAggregates,
        totalEvents: stats.totalEvents,
        aggregates: stats.aggregates.map(agg => ({
          id: agg.id,
          version: agg.version,
          eventsCount: agg.eventsCount
        }))
      }
    };
  }

  /**
   * Получить пользователей, созданных за период
   */
  @Get('admin/created-between')
  @ApiOperation({ 
    summary: 'Пользователи за период',
    description: 'Возвращает пользователей, созданных в указанный период'
  })
  @ApiQuery({ name: 'fromDate', description: 'Начальная дата (YYYY-MM-DD)' })
  @ApiQuery({ name: 'toDate', description: 'Конечная дата (YYYY-MM-DD)' })
  async getUsersCreatedBetween(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string
  ) {
    if (!fromDate || !toDate) {
      throw new BadRequestException('Необходимо указать fromDate и toDate');
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException('Неверный формат даты. Используйте YYYY-MM-DD');
    }

    const users = await this.userEventSourcedRepository.getUsersCreatedBetween(from, to);

    return {
      success: true,
      data: {
        period: {
          from: from.toISOString().split('T')[0],
          to: to.toISOString().split('T')[0]
        },
        totalUsers: users.length,
        users: users.map(user => ({
          userId: user.userId,
          email: user.email,
          fullName: `${user.firstName} ${user.lastName}`,
          createdAt: user.createdAt
        }))
      }
    };
  }

  /**
   * Демо: создание и последовательные изменения пользователя
   */
  @Post('demo/user-lifecycle')
  @ApiOperation({ 
    summary: 'Демо: жизненный цикл пользователя',
    description: 'Демонстрирует полный жизненный цикл пользователя через Event Sourcing'
  })
  async demoUserLifecycle(@Body() createUserDto: CreateUserDto) {
    const results: any[] = [];

    try {
      // 1. Создание пользователя
      const email = Email.create(createUserDto.email);
      const userName = UserName.create(createUserDto.firstName, createUserDto.lastName);
      const user = UserEventSourcedAggregate.create(email, userName);
      await this.userEventSourcedRepository.save(user);
      
      results.push({
        step: 1,
        action: 'Создание пользователя',
        event: 'UserCreatedEvent',
        version: user.version,
        status: user.status
      });

      // 2. Подтверждение email
      user.verifyEmail();
      await this.userEventSourcedRepository.save(user);
      
      results.push({
        step: 2,
        action: 'Подтверждение email',
        event: 'UserEmailVerifiedEvent',
        version: user.version,
        isEmailVerified: user.isEmailVerified
      });

      // 3. Активация пользователя
      user.activate();
      await this.userEventSourcedRepository.save(user);
      
      results.push({
        step: 3,
        action: 'Активация пользователя',
        event: 'UserActivatedEvent',
        version: user.version,
        status: user.status
      });

      // 4. Изменение email
      const newEmail = Email.create(`new.${createUserDto.email}`);
      user.changeEmail(newEmail);
      await this.userEventSourcedRepository.save(user);
      
      results.push({
        step: 4,
        action: 'Изменение email',
        event: 'UserEmailChangedEvent',
        version: user.version,
        newEmail: user.email.value,
        isEmailVerified: user.isEmailVerified // Сброшено
      });

      // 5. Блокировка пользователя
      user.block('Демо-блокировка для тестирования');
      await this.userEventSourcedRepository.save(user);
      
      results.push({
        step: 5,
        action: 'Блокировка пользователя',
        event: 'UserBlockedEvent',
        version: user.version,
        status: user.status
      });

      // Получаем финальное состояние и историю
      const history = await this.userEventSourcedRepository.getEventHistory(user.id);

      return {
        success: true,
        message: 'Демонстрация жизненного цикла пользователя завершена',
        demo: {
          userId: user.id,
          finalState: {
            email: user.email.value,
            fullName: user.getFullName(),
            status: user.status,
            version: user.version,
            isEmailVerified: user.isEmailVerified
          },
          steps: results,
          eventHistory: {
            totalEvents: history.length,
            events: history.map(h => h.eventType)
          }
        }
      };

    } catch (error) {
      throw new BadRequestException(`Ошибка в демо: ${error.message}`);
    }
  }
} 