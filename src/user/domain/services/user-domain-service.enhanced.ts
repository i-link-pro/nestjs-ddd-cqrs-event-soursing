import { User } from '../entities/user-aggregate';
import { Email } from '../value-objects/email';
import { UserRepositoryInterface } from '../repositories/user.repository.interface';
import { UserCanBeActivatedSpecification } from '../specifications/user-can-be-activated.specification';
import { UserCanBeDeletedSpecification } from '../specifications/user-can-be-deleted.specification';
import { PremiumUserSpecification } from '../specifications/premium-user.specification';

/**
 * Расширенный доменный сервис для работы с пользователями
 * 
 * Этот сервис демонстрирует использование спецификаций и других 
 * DDD паттернов для инкапсуляции сложной бизнес-логики.
 * 
 * Обновления:
 * - Использует спецификации для проверки бизнес-правил
 * - Работает с User как с агрегатом
 * - Содержит более сложную доменную логику
 */
export class UserDomainServiceEnhanced {
  private readonly canBeActivatedSpec = new UserCanBeActivatedSpecification();
  private readonly canBeDeletedSpec = new UserCanBeDeletedSpecification();
  private readonly premiumUserSpec = PremiumUserSpecification.forRegularUsers();
  private readonly corporatePremiumSpec = PremiumUserSpecification.forCorporateUsers();

  constructor(
    private readonly userRepository: UserRepositoryInterface
  ) {}

  /**
   * Проверить уникальность email при регистрации
   * @param email - объект-значение Email
   * @throws Error если email уже используется
   */
  async validateEmailUniqueness(email: Email): Promise<void> {
    const existingUser = await this.userRepository.findByEmail(email);
    
    if (existingUser) {
      throw new Error(`Пользователь с email ${email.value} уже существует`);
    }
  }

  /**
   * Проверить возможность смены email
   * @param user - пользователь
   * @param newEmail - новый email
   * @throws Error если смена email невозможна
   */
  async validateEmailChange(user: User, newEmail: Email): Promise<void> {
    // Проверяем, что новый email отличается от текущего
    if (user.email.equals(newEmail)) {
      throw new Error('Новый email совпадает с текущим');
    }

    // Проверяем уникальность нового email
    await this.validateEmailUniqueness(newEmail);
  }

  /**
   * Проверить, может ли пользователь быть активирован
   * Использует спецификацию для проверки бизнес-правил
   */
  canUserBeActivated(user: User): { canActivate: boolean; reason?: string } {
    const canActivate = this.canBeActivatedSpec.isSatisfiedBy(user);
    const reason = canActivate ? undefined : this.canBeActivatedSpec.getFailureReason(user);
    
    return { canActivate, reason };
  }

  /**
   * Проверить, может ли пользователь быть удален
   * Использует спецификацию для проверки бизнес-правил
   */
  canUserBeDeleted(user: User): { canDelete: boolean; reason?: string } {
    const canDelete = this.canBeDeletedSpec.isSatisfiedBy(user);
    const reason = canDelete ? undefined : this.canBeDeletedSpec.getFailureReason(user);
    
    return { canDelete, reason };
  }

  /**
   * Определить, является ли пользователь премиум
   * Использует спецификации для сложной бизнес-логики
   */
  getUserPremiumStatus(user: User): {
    isPremium: boolean;
    isCorporatePremium: boolean;
    reasons: string[];
  } {
    const isPremium = this.premiumUserSpec.isSatisfiedBy(user);
    const isCorporatePremium = this.corporatePremiumSpec.isSatisfiedBy(user);
    
    let reasons: string[] = [];
    if (!isPremium) {
      reasons = this.premiumUserSpec.getFailureReasons(user);
    }

    return {
      isPremium,
      isCorporatePremium,
      reasons
    };
  }

  /**
   * Определить уровень доверия пользователя
   * Комплексная бизнес-логика с использованием нескольких критериев
   */
  getUserTrustLevel(user: User): {
    level: 'low' | 'medium' | 'high' | 'premium';
    score: number;
    factors: string[];
  } {
    let score = 0;
    const factors: string[] = [];

    // Базовые факторы
    if (user.isEmailVerified()) {
      score += 25;
      factors.push('Email подтвержден');
    }

    if (user.isActive()) {
      score += 20;
      factors.push('Активный статус');
    }

    // Фактор активности
    const daysSinceLogin = user.getDaysSinceLastLogin();
    if (daysSinceLogin !== null) {
      if (daysSinceLogin <= 7) {
        score += 25;
        factors.push('Недавняя активность (7 дней)');
      } else if (daysSinceLogin <= 30) {
        score += 15;
        factors.push('Умеренная активность (30 дней)');
      } else if (daysSinceLogin <= 90) {
        score += 5;
        factors.push('Низкая активность (90 дней)');
      }
    }

    // Фактор времени в системе
    const daysSinceCreation = Math.ceil(
      (new Date().getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceCreation >= 365) {
      score += 20;
      factors.push('Долгий пользователь (1+ год)');
    } else if (daysSinceCreation >= 180) {
      score += 15;
      factors.push('Опытный пользователь (6+ месяцев)');
    } else if (daysSinceCreation >= 30) {
      score += 10;
      factors.push('Установившийся пользователь (1+ месяц)');
    }

    // Премиум фактор
    const premiumStatus = this.getUserPremiumStatus(user);
    if (premiumStatus.isCorporatePremium) {
      score += 10;
      factors.push('Корпоративный премиум');
    } else if (premiumStatus.isPremium) {
      score += 5;
      factors.push('Премиум пользователь');
    }

    // Определение уровня
    let level: 'low' | 'medium' | 'high' | 'premium';
    if (score >= 85) {
      level = 'premium';
    } else if (score >= 70) {
      level = 'high';
    } else if (score >= 50) {
      level = 'medium';
    } else {
      level = 'low';
    }

    return { level, score, factors };
  }

  /**
   * Сгенерировать персонализированные рекомендации
   * Расширенная версия с использованием спецификаций
   */
  generatePersonalizedRecommendations(user: User): {
    urgent: string[];
    suggestions: string[];
    opportunities: string[];
  } {
    const urgent: string[] = [];
    const suggestions: string[] = [];
    const opportunities: string[] = [];

    // Проверяем критические проблемы
    if (!user.isEmailVerified()) {
      urgent.push('Подтвердите email адрес для полного доступа к функциям');
    }

    if (user.isBlocked()) {
      urgent.push('Свяжитесь с поддержкой для разблокировки аккаунта');
    }

    // Проверяем активность
    const daysSinceLogin = user.getDaysSinceLastLogin();
    if (daysSinceLogin && daysSinceLogin > 30) {
      suggestions.push('Рекомендуем обновить ваш профиль и ознакомиться с новыми функциями');
    }

    if (daysSinceLogin && daysSinceLogin > 7 && daysSinceLogin <= 30) {
      suggestions.push('Посетите новые разделы и функции');
    }

    // Проверяем премиум возможности
    const premiumStatus = this.getUserPremiumStatus(user);
    if (!premiumStatus.isPremium && user.isActive() && user.isEmailVerified()) {
      opportunities.push('Вы подходите для премиум статуса - узнайте о преимуществах');
    }

    // Проверяем уровень доверия
    const trustLevel = this.getUserTrustLevel(user);
    if (trustLevel.level === 'low') {
      suggestions.push('Увеличьте активность для получения дополнительных привилегий');
    }

    if (trustLevel.level === 'high' || trustLevel.level === 'premium') {
      opportunities.push('Приглашайте друзей и получайте бонусы');
      opportunities.push('Участвуйте в бета-тестировании новых функций');
    }

    return { urgent, suggestions, opportunities };
  }

  /**
   * Выполнить комплексную проверку состояния пользователя
   * Объединяет все проверки в один метод
   */
  async performUserHealthCheck(user: User): Promise<{
    overall: 'excellent' | 'good' | 'warning' | 'critical';
    trustLevel: ReturnType<typeof this.getUserTrustLevel>;
    premiumStatus: ReturnType<typeof this.getUserPremiumStatus>;
    canBeActivated: ReturnType<typeof this.canUserBeActivated>;
    canBeDeleted: ReturnType<typeof this.canUserBeDeleted>;
    recommendations: ReturnType<typeof this.generatePersonalizedRecommendations>;
    issues: string[];
  }> {
    const trustLevel = this.getUserTrustLevel(user);
    const premiumStatus = this.getUserPremiumStatus(user);
    const canBeActivated = this.canUserBeActivated(user);
    const canBeDeleted = this.canUserBeDeleted(user);
    const recommendations = this.generatePersonalizedRecommendations(user);

    const issues: string[] = [];
    
    // Определяем общее состояние
    let overall: 'excellent' | 'good' | 'warning' | 'critical';

    if (user.isBlocked()) {
      overall = 'critical';
      issues.push('Пользователь заблокирован');
    } else if (!user.isEmailVerified()) {
      overall = 'warning';
      issues.push('Email не подтвержден');
    } else if (trustLevel.level === 'low') {
      overall = 'warning';
      issues.push('Низкий уровень доверия');
    } else if (trustLevel.level === 'premium') {
      overall = 'excellent';
    } else {
      overall = 'good';
    }

    return {
      overall,
      trustLevel,
      premiumStatus,
      canBeActivated,
      canBeDeleted,
      recommendations,
      issues
    };
  }
} 