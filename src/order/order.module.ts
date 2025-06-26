import { Module } from '@nestjs/common';

/**
 * Модуль заказов
 * 
 * Базовый пример второго домена в DDD архитектуре.
 * В полной реализации здесь были бы:
 * - Все слои архитектуры (Domain, Application, Infrastructure, Presentation)
 * - Репозитории и сервисы
 * - Контроллеры и DTO
 * 
 * Сейчас показана только доменная сущность для демонстрации структуры.
 */
@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class OrderModule {
  constructor() {
    console.log('📦 OrderModule инициализирован (базовая версия)');
    console.log('💡 Для полной реализации добавьте:');
    console.log('   - Application Services');
    console.log('   - Repository и Infrastructure');
    console.log('   - Controllers и DTO');
  }
} 