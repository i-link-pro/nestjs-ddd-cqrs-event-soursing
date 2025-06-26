import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

/**
 * Точка входа в приложение
 * Здесь настраиваем основные конфигурации NestJS приложения
 */
async function bootstrap() {
  // Создаем экземпляр NestJS приложения
  const app = await NestFactory.create(AppModule);

  // Настройка глобальной валидации
  // Используется для автоматической валидации DTO объектов
  app.useGlobalPipes(
    new ValidationPipe({
      // Автоматически преобразует типы данных
      transform: true,
      // Удаляет свойства, которых нет в DTO
      whitelist: true,
      // Выбрасывает ошибку, если присутствуют неожиданные свойства
      forbidNonWhitelisted: true,
    }),
  );

  // Настройка CORS для фронтенда
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Настройка Swagger документации
  const config = new DocumentBuilder()
    .setTitle('NestJS DDD Example API')
    .setDescription('API для демонстрации принципов Domain-Driven Design')
    .setVersion('1.0')
    .addTag('users', 'Операции с пользователями')
    .addTag('orders', 'Операции с заказами')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Запуск приложения на порту 3000
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Приложение запущено на порту ${port}`);
  console.log(`📚 Swagger документация доступна по адресу: http://localhost:${port}/api/docs`);
}

bootstrap(); 