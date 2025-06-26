import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  HttpStatus,
  HttpException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiCreatedResponse,
  ApiOkResponse
} from '@nestjs/swagger';
import { UserApplicationService } from '../../application/services/user.application-service';
import { CreateUserCommand } from '../../application/commands/create-user.command';
import { UpdateUserCommand } from '../../application/commands/update-user.command';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';

/**
 * Контроллер для работы с пользователями
 * 
 * Презентационный слой в DDD отвечает за:
 * 1. Обработку HTTP запросов
 * 2. Валидацию входящих данных
 * 3. Преобразование данных в команды для Application Service
 * 4. Форматирование ответов для клиента
 * 5. Обработку ошибок
 * 
 * Контроллер НЕ содержит бизнес-логику - он только координирует
 * взаимодействие между клиентом и сервисом приложения.
 */
@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userApplicationService: UserApplicationService
  ) {}

  /**
   * Создать нового пользователя
   */
  @Post()
  @ApiOperation({ 
    summary: 'Создать пользователя',
    description: 'Создает нового пользователя в системе'
  })
  @ApiCreatedResponse({ 
    description: 'Пользователь успешно создан',
    type: UserResponseDto
  })
  @ApiBadRequestResponse({ 
    description: 'Некорректные данные или пользователь уже существует'
  })
  async createUser(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      const command = new CreateUserCommand(
        createUserDto.email,
        createUserDto.firstName,
        createUserDto.lastName
      );

      const user = await this.userApplicationService.createUser(command);
      return UserResponseDto.fromDomain(user);
    } catch (error) {
      throw new HttpException(
        error.message || 'Ошибка создания пользователя',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Получить всех пользователей
   */
  @Get()
  @ApiOperation({ 
    summary: 'Получить всех пользователей',
    description: 'Возвращает список всех пользователей в системе'
  })
  @ApiOkResponse({ 
    description: 'Список пользователей получен успешно',
    type: [UserResponseDto]
  })
  async getAllUsers(): Promise<UserResponseDto[]> {
    try {
      const users = await this.userApplicationService.getAllUsers();
      return UserResponseDto.fromDomainArray(users);
    } catch (error) {
      throw new HttpException(
        error.message || 'Ошибка получения пользователей',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Получить пользователя по ID
   */
  @Get(':id')
  @ApiOperation({ 
    summary: 'Получить пользователя по ID',
    description: 'Возвращает данные пользователя по его уникальному идентификатору'
  })
  @ApiParam({ 
    name: 'id',
    description: 'Уникальный идентификатор пользователя'
  })
  @ApiOkResponse({ 
    description: 'Данные пользователя получены успешно',
    type: UserResponseDto
  })
  @ApiNotFoundResponse({ 
    description: 'Пользователь не найден'
  })
  async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
    try {
      const user = await this.userApplicationService.getUserById(id);
      return UserResponseDto.fromDomain(user);
    } catch (error) {
      throw new HttpException(
        error.message || 'Пользователь не найден',
        HttpStatus.NOT_FOUND
      );
    }
  }

  /**
   * Обновить пользователя
   */
  @Put(':id')
  @ApiOperation({ 
    summary: 'Обновить пользователя',
    description: 'Обновляет данные пользователя'
  })
  @ApiParam({ 
    name: 'id',
    description: 'Уникальный идентификатор пользователя'
  })
  @ApiOkResponse({ 
    description: 'Пользователь успешно обновлен',
    type: UserResponseDto
  })
  @ApiNotFoundResponse({ 
    description: 'Пользователь не найден'
  })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: Partial<CreateUserDto>
  ): Promise<UserResponseDto> {
    try {
      const command = new UpdateUserCommand(
        id,
        updateUserDto.firstName,
        updateUserDto.lastName,
        updateUserDto.email
      );

      const user = await this.userApplicationService.updateUser(command);
      return UserResponseDto.fromDomain(user);
    } catch (error) {
      const status = error.message.includes('не найден') 
        ? HttpStatus.NOT_FOUND 
        : HttpStatus.BAD_REQUEST;
      
      throw new HttpException(
        error.message || 'Ошибка обновления пользователя',
        status
      );
    }
  }

  /**
   * Активировать пользователя
   */
  @Put(':id/activate')
  @ApiOperation({ 
    summary: 'Активировать пользователя',
    description: 'Активирует пользователя в системе'
  })
  @ApiParam({ 
    name: 'id',
    description: 'Уникальный идентификатор пользователя'
  })
  @ApiOkResponse({ 
    description: 'Пользователь успешно активирован',
    type: UserResponseDto
  })
  async activateUser(@Param('id') id: string): Promise<UserResponseDto> {
    try {
      const user = await this.userApplicationService.activateUser(id);
      return UserResponseDto.fromDomain(user);
    } catch (error) {
      throw new HttpException(
        error.message || 'Ошибка активации пользователя',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Заблокировать пользователя
   */
  @Put(':id/block')
  @ApiOperation({ 
    summary: 'Заблокировать пользователя',
    description: 'Блокирует пользователя в системе'
  })
  @ApiParam({ 
    name: 'id',
    description: 'Уникальный идентификатор пользователя'
  })
  @ApiOkResponse({ 
    description: 'Пользователь успешно заблокирован',
    type: UserResponseDto
  })
  async blockUser(@Param('id') id: string): Promise<UserResponseDto> {
    try {
      const user = await this.userApplicationService.blockUser(id);
      return UserResponseDto.fromDomain(user);
    } catch (error) {
      throw new HttpException(
        error.message || 'Ошибка блокировки пользователя',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Подтвердить email пользователя
   */
  @Put(':id/verify-email')
  @ApiOperation({ 
    summary: 'Подтвердить email',
    description: 'Подтверждает email адрес пользователя'
  })
  @ApiParam({ 
    name: 'id',
    description: 'Уникальный идентификатор пользователя'
  })
  @ApiOkResponse({ 
    description: 'Email успешно подтвержден',
    type: UserResponseDto
  })
  async verifyEmail(@Param('id') id: string): Promise<UserResponseDto> {
    try {
      const user = await this.userApplicationService.verifyUserEmail(id);
      return UserResponseDto.fromDomain(user);
    } catch (error) {
      throw new HttpException(
        error.message || 'Ошибка подтверждения email',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Удалить пользователя
   */
  @Delete(':id')
  @ApiOperation({ 
    summary: 'Удалить пользователя',
    description: 'Удаляет пользователя из системы'
  })
  @ApiParam({ 
    name: 'id',
    description: 'Уникальный идентификатор пользователя'
  })
  @ApiOkResponse({ 
    description: 'Пользователь успешно удален'
  })
  @ApiNotFoundResponse({ 
    description: 'Пользователь не найден'
  })
  async deleteUser(@Param('id') id: string): Promise<{ message: string }> {
    try {
      await this.userApplicationService.deleteUser(id);
      return { message: 'Пользователь успешно удален' };
    } catch (error) {
      const status = error.message.includes('не найден') 
        ? HttpStatus.NOT_FOUND 
        : HttpStatus.BAD_REQUEST;
      
      throw new HttpException(
        error.message || 'Ошибка удаления пользователя',
        status
      );
    }
  }

  /**
   * Получить статистику пользователей
   */
  @Get('stats/overview')
  @ApiOperation({ 
    summary: 'Получить статистику пользователей',
    description: 'Возвращает общую статистику по пользователям'
  })
  @ApiOkResponse({ 
    description: 'Статистика получена успешно'
  })
  async getUsersStatistics() {
    try {
      return await this.userApplicationService.getUsersStatistics();
    } catch (error) {
      throw new HttpException(
        error.message || 'Ошибка получения статистики',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Получить рекомендации для пользователя
   */
  @Get(':id/recommendations')
  @ApiOperation({ 
    summary: 'Получить рекомендации для пользователя',
    description: 'Возвращает персонализированные рекомендации для пользователя'
  })
  @ApiParam({ 
    name: 'id',
    description: 'Уникальный идентификатор пользователя'
  })
  @ApiOkResponse({ 
    description: 'Рекомендации получены успешно'
  })
  async getUserRecommendations(@Param('id') id: string) {
    try {
      const recommendations = await this.userApplicationService.getUserRecommendations(id);
      return { recommendations };
    } catch (error) {
      throw new HttpException(
        error.message || 'Ошибка получения рекомендаций',
        HttpStatus.NOT_FOUND
      );
    }
  }
} 