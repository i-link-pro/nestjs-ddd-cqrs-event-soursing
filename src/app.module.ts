import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Импорты доменных модулей
import { UserModule } from './user/user.module';
import { OrderModule } from './order/order.module';

/**
 * Корневой модуль приложения
 * 
 * В DDD архитектуре этот модуль служит точкой сборки всех доменных модулей.
 * Здесь мы не размещаем бизнес-логику, а только конфигурируем инфраструктуру
 * и подключаем доменные модули.
 */
@Module({
  imports: [
    // Конфигурация окружения
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Конфигурация базы данных
    // В реальном проекте эти настройки должны быть в переменных окружения
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'ddd_example',
      // Автоматическое создание схемы БД (только для разработки!)
      synchronize: process.env.NODE_ENV !== 'production',
      // Автоматическое обнаружение entity
      autoLoadEntities: true,
      logging: process.env.NODE_ENV === 'development',
    }),

    // Доменные модули
    // Каждый домен инкапсулирует свою бизнес-логику
    UserModule,
    OrderModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  constructor() {
    console.log('🏗️  AppModule инициализирован');
    console.log('📦 Подключенные домены: User, Order');
  }
} 