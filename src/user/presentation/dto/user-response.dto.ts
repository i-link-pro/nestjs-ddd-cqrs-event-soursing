import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../domain/entities/user.entity';

/**
 * DTO для ответа с данными пользователя
 * 
 * Этот DTO преобразует доменную сущность User в формат,
 * подходящий для отправки клиенту через API.
 */
export class UserResponseDto {
  @ApiProperty({ 
    description: 'Уникальный идентификатор пользователя',
    example: 'abc123def456'
  })
  id: string;

  @ApiProperty({ 
    description: 'Email адрес пользователя',
    example: 'user@example.com'
  })
  email: string;

  @ApiProperty({ 
    description: 'Имя пользователя',
    example: 'Иван'
  })
  firstName: string;

  @ApiProperty({ 
    description: 'Фамилия пользователя',
    example: 'Иванов'
  })
  lastName: string;

  @ApiProperty({ 
    description: 'Полное имя пользователя',
    example: 'Иван Иванов'
  })
  fullName: string;

  @ApiProperty({ 
    description: 'Статус пользователя',
    example: 'active',
    enum: ['active', 'inactive', 'blocked', 'pending']
  })
  status: string;

  @ApiProperty({ 
    description: 'Дата создания',
    example: '2024-01-15T10:30:00Z'
  })
  createdAt: string;

  @ApiProperty({ 
    description: 'Дата подтверждения email',
    example: '2024-01-15T10:30:00Z',
    nullable: true
  })
  emailVerifiedAt: string | null;

  @ApiProperty({ 
    description: 'Дата последнего входа',
    example: '2024-01-15T10:30:00Z',
    nullable: true
  })
  lastLoginAt: string | null;

  @ApiProperty({ 
    description: 'Подтвержден ли email',
    example: true
  })
  isEmailVerified: boolean;

  @ApiProperty({ 
    description: 'Активен ли пользователь',
    example: true
  })
  isActive: boolean;

  /**
   * Статический метод для создания DTO из доменной сущности
   * @param user - доменная сущность пользователя
   * @returns DTO для ответа
   */
  static fromDomain(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email.value;
    dto.firstName = user.userName.firstName;
    dto.lastName = user.userName.lastName;
    dto.fullName = user.userName.getFullName();
    dto.status = user.status;
    dto.createdAt = user.createdAt.toISOString();
    dto.emailVerifiedAt = user.emailVerifiedAt?.toISOString() || null;
    dto.lastLoginAt = user.lastLoginAt?.toISOString() || null;
    dto.isEmailVerified = user.isEmailVerified();
    dto.isActive = user.isActive();
    return dto;
  }

  /**
   * Преобразовать массив доменных сущностей в массив DTO
   * @param users - массив доменных сущностей
   * @returns массив DTO
   */
  static fromDomainArray(users: User[]): UserResponseDto[] {
    return users.map(user => UserResponseDto.fromDomain(user));
  }
} 