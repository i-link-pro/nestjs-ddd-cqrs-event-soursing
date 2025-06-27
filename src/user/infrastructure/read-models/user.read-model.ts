/**
 * Read Model для пользователя в CQRS
 * 
 * Read Models (модели чтения) - это проекции данных, оптимизированные
 * для конкретных сценариев запросов. Они могут содержать:
 * - Денормализованные данные
 * - Предвычисленные значения
 * - Данные из нескольких агрегатов
 * - Специфичные для UI поля
 * 
 * Read Models отделены от Domain Models и могут иметь другую структуру.
 */
export class UserReadModel {
  public readonly id: string;
  public readonly email: string;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly fullName: string;
  public readonly status: string;
  public readonly isEmailVerified: boolean;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly lastLoginAt: Date | null;
  public readonly emailVerifiedAt: Date | null;

  // Дополнительные поля для оптимизации запросов
  public readonly daysSinceLastLogin: number | null;
  public readonly daysSinceCreation: number;
  public readonly trustLevel: 'low' | 'medium' | 'high' | 'premium';
  public readonly isPremium: boolean;

  constructor(data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
    emailVerifiedAt?: Date;
  }) {
    this.id = data.id;
    this.email = data.email;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.fullName = `${data.firstName} ${data.lastName}`;
    this.status = data.status;
    this.isEmailVerified = !!data.emailVerifiedAt;
    this.isActive = data.status === 'active';
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.lastLoginAt = data.lastLoginAt || null;
    this.emailVerifiedAt = data.emailVerifiedAt || null;

    // Вычисляемые поля
    this.daysSinceLastLogin = this.calculateDaysSinceLastLogin();
    this.daysSinceCreation = this.calculateDaysSinceCreation();
    this.trustLevel = this.calculateTrustLevel();
    this.isPremium = this.calculateIsPremium();
  }

  /**
   * Вычислить количество дней с последнего входа
   */
  private calculateDaysSinceLastLogin(): number | null {
    if (!this.lastLoginAt) return null;
    
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.lastLoginAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Вычислить количество дней с создания
   */
  private calculateDaysSinceCreation(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Вычислить уровень доверия (упрощенная версия)
   */
  private calculateTrustLevel(): 'low' | 'medium' | 'high' | 'premium' {
    let score = 0;

    if (this.isEmailVerified) score += 25;
    if (this.isActive) score += 20;

    if (this.daysSinceLastLogin !== null) {
      if (this.daysSinceLastLogin <= 7) score += 25;
      else if (this.daysSinceLastLogin <= 30) score += 15;
      else if (this.daysSinceLastLogin <= 90) score += 5;
    }

    if (this.daysSinceCreation >= 365) score += 20;
    else if (this.daysSinceCreation >= 180) score += 15;
    else if (this.daysSinceCreation >= 30) score += 10;

    if (score >= 85) return 'premium';
    else if (score >= 70) return 'high';
    else if (score >= 50) return 'medium';
    else return 'low';
  }

  /**
   * Проверить, является ли пользователь премиум (упрощенная версия)
   */
  private calculateIsPremium(): boolean {
    return this.isActive && 
           this.isEmailVerified && 
           this.daysSinceLastLogin !== null && 
           this.daysSinceLastLogin <= 30;
  }

  /**
   * Создать read model из ORM entity
   */
  static fromOrmEntity(entity: any): UserReadModel {
    return new UserReadModel({
      id: entity.id,
      email: entity.email,
      firstName: entity.firstName,
      lastName: entity.lastName,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      lastLoginAt: entity.lastLoginAt,
      emailVerifiedAt: entity.emailVerifiedAt
    });
  }

  /**
   * Преобразовать в простой объект
   */
  toObject(): Record<string, any> {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      status: this.status,
      isEmailVerified: this.isEmailVerified,
      isActive: this.isActive,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      lastLoginAt: this.lastLoginAt?.toISOString() || null,
      emailVerifiedAt: this.emailVerifiedAt?.toISOString() || null,
      daysSinceLastLogin: this.daysSinceLastLogin,
      daysSinceCreation: this.daysSinceCreation,
      trustLevel: this.trustLevel,
      isPremium: this.isPremium
    };
  }
} 