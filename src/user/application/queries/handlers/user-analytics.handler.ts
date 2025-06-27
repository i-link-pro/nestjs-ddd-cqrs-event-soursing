import { Injectable } from '@nestjs/common';
import { QueryHandler } from '@shared/application/query.interface';
import { GetUserAnalyticsQuery, GetUserRecommendationsQuery, GetUserHealthCheckQuery } from '../user-analytics.query';
import { UserReadModelRepositoryInterface } from '../../../infrastructure/read-models/user-read-model.repository.interface';
import { UserDomainServiceEnhanced } from '../../../domain/services/user-domain-service.enhanced';

/**
 * Обработчик запросов аналитики пользователей
 */
@Injectable()
export class GetUserAnalyticsHandler implements QueryHandler<GetUserAnalyticsQuery, any> {
  constructor(
    private readonly userReadRepository: UserReadModelRepositoryInterface
  ) {}

  async handle(query: GetUserAnalyticsQuery): Promise<any> {
    console.log(`📊 Обрабатываем запрос: GetUserAnalyticsQuery (период: ${query.period})`);

    query.validate();

    // Получаем базовую статистику
    const stats = await this.userReadRepository.getStatistics();

    // Получаем дополнительные данные в зависимости от периода
    const periodData = await this.getPeriodData(query.period);

    const analytics = {
      period: query.period,
      timestamp: new Date().toISOString(),
      
      // Основные метрики
      overview: {
        totalUsers: stats.total,
        activeUsers: stats.active,
        emailVerifiedUsers: stats.emailVerified,
        premiumUsers: stats.premium,
        
        // Процентные показатели
        activeRate: stats.total > 0 ? (stats.active / stats.total * 100).toFixed(2) + '%' : '0%',
        verificationRate: stats.total > 0 ? (stats.emailVerified / stats.total * 100).toFixed(2) + '%' : '0%',
        premiumRate: stats.total > 0 ? (stats.premium / stats.total * 100).toFixed(2) + '%' : '0%'
      },

      // Распределение по статусам
      statusDistribution: stats.byStatus,

      // Распределение по уровням доверия
      trustLevelDistribution: stats.byTrustLevel,

      // Данные за период
      periodData,

      // Метаданные
      metadata: {
        calculatedAt: new Date().toISOString(),
        includeInactive: query.includeInactive,
        queryType: 'analytics'
      }
    };

    console.log(`✅ Аналитика рассчитана: ${stats.total} пользователей проанализировано`);

    return analytics;
  }

  /**
   * Получить данные за конкретный период
   */
  private async getPeriodData(period: string): Promise<any> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // В реальном приложении здесь были бы более сложные запросы
    // к базе данных для получения трендов за период
    return {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      trends: {
        registrations: `Примерный тренд за ${period}`,
        activations: `Примерный тренд за ${period}`,
        emailVerifications: `Примерный тренд за ${period}`
      }
    };
  }
}

/**
 * Обработчик запросов рекомендаций для пользователя
 */
@Injectable()
export class GetUserRecommendationsHandler implements QueryHandler<GetUserRecommendationsQuery, any> {
  constructor(
    private readonly userReadRepository: UserReadModelRepositoryInterface,
    private readonly userDomainService: UserDomainServiceEnhanced
  ) {}

  async handle(query: GetUserRecommendationsQuery): Promise<any> {
    console.log(`💡 Обрабатываем запрос: GetUserRecommendationsQuery для ${query.userId}`);

    query.validate();

    const user = await this.userReadRepository.findById(query.userId);
    if (!user) {
      throw new Error(`Пользователь с ID ${query.userId} не найден`);
    }

    // Генерируем рекомендации на основе профиля пользователя
    const recommendations = this.generateRecommendations(user);

    console.log(`✅ Сгенерировано ${recommendations.length} рекомендаций`);

    return {
      userId: query.userId,
      userProfile: {
        trustLevel: user.trustLevel,
        isPremium: user.isPremium,
        daysSinceCreation: user.daysSinceCreation,
        isActive: user.isActive
      },
      recommendations,
      generatedAt: new Date().toISOString()
    };
  }

  private generateRecommendations(user: any): any[] {
    const recommendations = [];

    if (!user.isEmailVerified) {
      recommendations.push({
        type: 'email_verification',
        priority: 'high',
        title: 'Подтвердите email',
        description: 'Подтверждение email повысит уровень доверия'
      });
    }

    if (user.trustLevel === 'low') {
      recommendations.push({
        type: 'profile_completion',
        priority: 'medium',
        title: 'Заполните профиль',
        description: 'Добавьте дополнительную информацию о себе'
      });
    }

    if (!user.isPremium && user.trustLevel === 'high') {
      recommendations.push({
        type: 'premium_upgrade',
        priority: 'low',
        title: 'Попробуйте премиум',
        description: 'Получите доступ к расширенным функциям'
      });
    }

    return recommendations;
  }
}

/**
 * Обработчик комплексного анализа пользователя
 */
@Injectable()
export class GetUserHealthCheckHandler implements QueryHandler<GetUserHealthCheckQuery, any> {
  constructor(
    private readonly userReadRepository: UserReadModelRepositoryInterface,
    private readonly userDomainService: UserDomainServiceEnhanced
  ) {}

  async handle(query: GetUserHealthCheckQuery): Promise<any> {
    console.log(`🔍 Обрабатываем запрос: GetUserHealthCheckQuery для ${query.userId}`);

    query.validate();

    const user = await this.userReadRepository.findById(query.userId);
    if (!user) {
      throw new Error(`Пользователь с ID ${query.userId} не найден`);
    }

    // Выполняем комплексный анализ через доменный сервис
    const healthCheck = {
      userId: query.userId,
      timestamp: new Date().toISOString(),
      
      // Основные показатели
      profile: {
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        trustLevel: user.trustLevel,
        isPremium: user.isPremium
      },

      // Анализ активности
      activity: {
        daysSinceCreation: user.daysSinceCreation,
        daysSinceLastLogin: user.daysSinceLastLogin,
        isRecentlyActive: user.daysSinceLastLogin !== null && user.daysSinceLastLogin <= 30
      },

      // Проверки безопасности
      security: {
        emailVerified: user.isEmailVerified,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() || null,
        accountStatus: user.status
      },

      // Общая оценка
      overallHealth: this.calculateOverallHealth(user),

      // Рекомендации по улучшению
      improvements: this.getImprovementSuggestions(user)
    };

    console.log(`✅ Анализ завершен для пользователя ${user.email}`);

    return healthCheck;
  }

  private calculateOverallHealth(user: any): string {
    let score = 0;

    if (user.isEmailVerified) score += 25;
    if (user.isActive) score += 25;
    if (user.isPremium) score += 20;
    if (user.trustLevel === 'high' || user.trustLevel === 'premium') score += 20;
    if (user.daysSinceLastLogin !== null && user.daysSinceLastLogin <= 7) score += 10;

    if (score >= 80) return 'excellent';
    else if (score >= 60) return 'good';
    else if (score >= 40) return 'fair';
    else return 'poor';
  }

  private getImprovementSuggestions(user: any): string[] {
    const suggestions = [];

    if (!user.isEmailVerified) {
      suggestions.push('Подтвердите адрес электронной почты');
    }

    if (!user.isActive) {
      suggestions.push('Активируйте аккаунт');
    }

    if (user.daysSinceLastLogin === null || user.daysSinceLastLogin > 30) {
      suggestions.push('Войдите в систему для поддержания активности');
    }

    if (user.trustLevel === 'low') {
      suggestions.push('Заполните дополнительную информацию профиля');
    }

    return suggestions;
  }
} 