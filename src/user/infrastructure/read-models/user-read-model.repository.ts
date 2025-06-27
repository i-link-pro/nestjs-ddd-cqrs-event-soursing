import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { UserReadModelRepositoryInterface } from './user-read-model.repository.interface';
import { UserReadModel } from './user.read-model';
import { UserTypeOrmEntity } from '../entities/user.typeorm-entity';
import { PaginatedResult } from '@shared/application/query.interface';

/**
 * Реализация репозитория для чтения пользователей
 * 
 * Этот репозиторий оптимизирован для операций чтения:
 * - Использует денормализованные запросы
 * - Кэширует часто запрашиваемые данные
 * - Предвычисляет агрегации
 * - Оптимизирован для конкретных UI сценариев
 */
@Injectable()
export class UserReadModelRepository implements UserReadModelRepositoryInterface {
  constructor(
    @InjectRepository(UserTypeOrmEntity)
    private readonly ormRepository: Repository<UserTypeOrmEntity>
  ) {}

  async findById(id: string): Promise<UserReadModel | null> {
    const entity = await this.ormRepository.findOne({ where: { id } });
    return entity ? UserReadModel.fromOrmEntity(entity) : null;
  }

  async findByEmail(email: string): Promise<UserReadModel | null> {
    const entity = await this.ormRepository.findOne({ where: { email } });
    return entity ? UserReadModel.fromOrmEntity(entity) : null;
  }

  async findWithPagination(params: {
    page: number;
    limit: number;
    filters?: Record<string, any>;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<PaginatedResult<UserReadModel>> {
    const { page, limit, filters = {}, sortBy = 'createdAt', sortOrder = 'DESC' } = params;
    
    let queryBuilder = this.ormRepository.createQueryBuilder('user');

    // Применяем фильтры
    this.applyFilters(queryBuilder, filters);

    // Применяем сортировку
    queryBuilder.orderBy(`user.${sortBy}`, sortOrder);

    // Применяем пагинацию
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Выполняем запрос
    const [entities, total] = await queryBuilder.getManyAndCount();
    const items = entities.map(entity => UserReadModel.fromOrmEntity(entity));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1
    };
  }

  async findActiveUsers(): Promise<UserReadModel[]> {
    const entities = await this.ormRepository.find({
      where: { status: 'active' },
      order: { lastLoginAt: 'DESC' }
    });
    return entities.map(entity => UserReadModel.fromOrmEntity(entity));
  }

  async findByTrustLevel(level: 'low' | 'medium' | 'high' | 'premium'): Promise<UserReadModel[]> {
    // Это упрощенная версия. В реальном проекте логика доверия
    // может быть более сложной и вычисляться на уровне БД
    const entities = await this.ormRepository.find({
      order: { createdAt: 'DESC' }
    });
    
    const readModels = entities.map(entity => UserReadModel.fromOrmEntity(entity));
    return readModels.filter(model => model.trustLevel === level);
  }

  async findPremiumUsers(): Promise<UserReadModel[]> {
    // Упрощенная логика премиум пользователей
    const entities = await this.ormRepository
      .createQueryBuilder('user')
      .where('user.status = :status', { status: 'active' })
      .andWhere('user.emailVerifiedAt IS NOT NULL')
      .andWhere('user.lastLoginAt > :date', { 
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 дней назад
      })
      .orderBy('user.lastLoginAt', 'DESC')
      .getMany();

    return entities.map(entity => UserReadModel.fromOrmEntity(entity));
  }

  async getStatistics(): Promise<{
    total: number;
    active: number;
    emailVerified: number;
    premium: number;
    byTrustLevel: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    // Базовая статистика
    const total = await this.ormRepository.count();
    const active = await this.ormRepository.count({ where: { status: 'active' } });
    const emailVerified = await this.ormRepository
      .createQueryBuilder('user')
      .where('user.emailVerifiedAt IS NOT NULL')
      .getCount();

    // Статистика по статусам
    const statusStats = await this.ormRepository
      .createQueryBuilder('user')
      .select('user.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.status')
      .getRawMany();

    const byStatus: Record<string, number> = {};
    statusStats.forEach(stat => {
      byStatus[stat.status] = parseInt(stat.count);
    });

    // Для премиум и уровней доверия нужно загрузить все данные (упрощение)
    const allUsers = await this.ormRepository.find();
    const readModels = allUsers.map(entity => UserReadModel.fromOrmEntity(entity));
    
    const premium = readModels.filter(model => model.isPremium).length;
    
    const byTrustLevel: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      premium: 0
    };
    
    readModels.forEach(model => {
      byTrustLevel[model.trustLevel]++;
    });

    return {
      total,
      active,
      emailVerified,
      premium,
      byTrustLevel,
      byStatus
    };
  }

  async findInactiveUsers(days: number): Promise<UserReadModel[]> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const entities = await this.ormRepository
      .createQueryBuilder('user')
      .where('user.lastLoginAt < :cutoffDate OR user.lastLoginAt IS NULL', { cutoffDate })
      .andWhere('user.createdAt < :cutoffDate', { cutoffDate })
      .orderBy('user.createdAt', 'ASC')
      .getMany();

    return entities.map(entity => UserReadModel.fromOrmEntity(entity));
  }

  async searchUsers(searchTerm: string, limit: number = 50): Promise<UserReadModel[]> {
    const entities = await this.ormRepository
      .createQueryBuilder('user')
      .where('user.email ILIKE :term OR user.firstName ILIKE :term OR user.lastName ILIKE :term', {
        term: `%${searchTerm}%`
      })
      .orderBy('user.createdAt', 'DESC')
      .limit(limit)
      .getMany();

    return entities.map(entity => UserReadModel.fromOrmEntity(entity));
  }

  async getTopActiveUsers(limit: number = 10): Promise<UserReadModel[]> {
    const entities = await this.ormRepository
      .createQueryBuilder('user')
      .where('user.status = :status', { status: 'active' })
      .andWhere('user.lastLoginAt IS NOT NULL')
      .orderBy('user.lastLoginAt', 'DESC')
      .limit(limit)
      .getMany();

    return entities.map(entity => UserReadModel.fromOrmEntity(entity));
  }

  /**
   * Применить фильтры к query builder
   */
  private applyFilters(queryBuilder: SelectQueryBuilder<UserTypeOrmEntity>, filters: Record<string, any>): void {
    if (filters.status) {
      queryBuilder.andWhere('user.status = :status', { status: filters.status });
    }

    if (filters.emailVerified === true) {
      queryBuilder.andWhere('user.emailVerifiedAt IS NOT NULL');
    } else if (filters.emailVerified === false) {
      queryBuilder.andWhere('user.emailVerifiedAt IS NULL');
    }

    if (filters.createdAfter) {
      queryBuilder.andWhere('user.createdAt >= :createdAfter', { createdAfter: filters.createdAfter });
    }

    if (filters.createdBefore) {
      queryBuilder.andWhere('user.createdAt <= :createdBefore', { createdBefore: filters.createdBefore });
    }

    if (filters.lastLoginAfter) {
      queryBuilder.andWhere('user.lastLoginAt >= :lastLoginAfter', { lastLoginAfter: filters.lastLoginAfter });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }
  }
} 