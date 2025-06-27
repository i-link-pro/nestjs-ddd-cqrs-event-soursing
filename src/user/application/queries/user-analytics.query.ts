import { Query } from '@shared/application/query.interface';

/**
 * Запрос для получения аналитики пользователей
 */
export class GetUserAnalyticsQuery implements Query {
  constructor(
    public readonly period: 'day' | 'week' | 'month' | 'year' = 'month',
    public readonly includeInactive: boolean = false
  ) {}

  validate(): void {
    const allowedPeriods = ['day', 'week', 'month', 'year'];
    if (!allowedPeriods.includes(this.period)) {
      throw new Error(`Период ${this.period} не поддерживается`);
    }
  }
}

/**
 * Запрос для получения рекомендаций пользователя
 */
export class GetUserRecommendationsQuery implements Query {
  constructor(public readonly userId: string) {}

  validate(): void {
    if (!this.userId?.trim()) {
      throw new Error('ID пользователя обязателен');
    }
  }
}

/**
 * Запрос для комплексного анализа пользователя
 */
export class GetUserHealthCheckQuery implements Query {
  constructor(public readonly userId: string) {}

  validate(): void {
    if (!this.userId?.trim()) {
      throw new Error('ID пользователя обязателен');
    }
  }
} 