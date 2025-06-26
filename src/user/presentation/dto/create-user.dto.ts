import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO для создания пользователя
 * 
 * DTO (Data Transfer Object) в презентационном слое служат для:
 * 1. Валидации входящих данных от клиента
 * 2. Документирования API через Swagger
 * 3. Трансформации данных в нужный формат
 * 
 * DTO не содержат бизнес-логику и служат только для передачи данных.
 */
export class CreateUserDto {
  @ApiProperty({ 
    description: 'Email адрес пользователя',
    example: 'user@example.com',
    format: 'email'
  })
  @IsEmail({}, { message: 'Некорректный формат email адреса' })
  @IsNotEmpty({ message: 'Email обязателен для заполнения' })
  email: string;

  @ApiProperty({ 
    description: 'Имя пользователя',
    example: 'Иван',
    minLength: 2,
    maxLength: 50
  })
  @IsString({ message: 'Имя должно быть строкой' })
  @IsNotEmpty({ message: 'Имя обязательно для заполнения' })
  @Length(2, 50, { message: 'Имя должно содержать от 2 до 50 символов' })
  firstName: string;

  @ApiProperty({ 
    description: 'Фамилия пользователя',
    example: 'Иванов',
    minLength: 2,
    maxLength: 50
  })
  @IsString({ message: 'Фамилия должна быть строкой' })
  @IsNotEmpty({ message: 'Фамилия обязательна для заполнения' })
  @Length(2, 50, { message: 'Фамилия должна содержать от 2 до 50 символов' })
  lastName: string;
} 