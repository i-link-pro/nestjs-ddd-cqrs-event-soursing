import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../domain/entities/user-aggregate';
import { Email } from '../../domain/value-objects/email';
import { UserRepositoryInterface } from '../../domain/repositories/user.repository.interface';
import { UserTypeOrmEntity } from '../entities/user.typeorm-entity';
import { UserFactory } from '../../domain/factories/user.factory';

/**
 * Реализация репозитория пользователей через TypeORM (обновленная для агрегатов)
 * 
 * Этот класс обновлен для работы с User как с корнем агрегата:
 * 1. Использует UserFactory для создания и восстановления пользователей
 * 2. Обрабатывает доменные события при сохранении
 * 3. Правильно маппит между доменными и инфраструктурными сущностями
 * 4. Поддерживает все методы из интерфейса репозитория
 */
@Injectable()
export class UserAggregateRepository implements UserRepositoryInterface {
  constructor(
    @InjectRepository(UserTypeOrmEntity)
    private readonly ormRepository: Repository<UserTypeOrmEntity>
  ) {}

  /**
   * Сохранить пользователя
   * В случае агрегата также обрабатываем доменные события
   */
  async save(user: User): Promise<User> {
    const ormEntity = this.toOrmEntity(user);
    const saved = await this.ormRepository.save(ormEntity);
    
    // Логируем доменные события (в реальном проекте здесь был бы event publisher)
    if (user.hasUnpublishedEvents()) {
      console.log(`📢 Пользователь ${user.id} имеет ${user.domainEvents.length} неопубликованных событий:`);
      user.domainEvents.forEach(event => {
        console.log(`   - ${event.constructor.name}: ${JSON.stringify(event)}`);
      });
      
      // В реальном проекте здесь был бы вызов DomainEventPublisher
      // await this.eventPublisher.publishAll(user.domainEvents);
      
      // Очищаем события после "публикации"
      user.clearDomainEvents();
    }
    
    return this.toDomainAggregate(saved);
  }

  /**
   * Найти пользователя по ID
   */
  async findById(id: string): Promise<User | null> {
    const ormEntity = await this.ormRepository.findOne({ where: { id } });
    return ormEntity ? this.toDomainAggregate(ormEntity) : null;
  }

  /**
   * Найти всех пользователей
   */
  async findAll(): Promise<User[]> {
    const ormEntities = await this.ormRepository.find({
      order: { createdAt: 'DESC' }
    });
    return ormEntities.map(entity => this.toDomainAggregate(entity));
  }

  /**
   * Обновить пользователя
   */
  async update(user: User): Promise<User> {
    // Обновление работает через save, но мы можем добавить дополнительную логику
    return await this.save(user);
  }

  /**
   * Удалить пользователя по ID
   */
  async delete(id: string): Promise<void> {
    await this.ormRepository.delete(id);
  }

  /**
   * Проверить существование пользователя по ID
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.ormRepository.count({ where: { id } });
    return count > 0;
  }

  /**
   * Найти пользователя по email
   */
  async findByEmail(email: Email): Promise<User | null> {
    const ormEntity = await this.ormRepository.findOne({ 
      where: { email: email.value } 
    });
    return ormEntity ? this.toDomainAggregate(ormEntity) : null;
  }

  /**
   * Проверить существование пользователя с данным email
   */
  async existsByEmail(email: Email): Promise<boolean> {
    const count = await this.ormRepository.count({ 
      where: { email: email.value } 
    });
    return count > 0;
  }

  /**
   * Найти активных пользователей
   */
  async findActiveUsers(): Promise<User[]> {
    const ormEntities = await this.ormRepository.find({
      where: { status: 'active' },
      order: { createdAt: 'DESC' }
    });
    return ormEntities.map(entity => this.toDomainAggregate(entity));
  }

  /**
   * Найти пользователей с неподтвержденным email
   */
  async findUnverifiedUsers(): Promise<User[]> {
    const ormEntities = await this.ormRepository.find({
      where: { emailVerifiedAt: null },
      order: { createdAt: 'DESC' }
    });
    return ormEntities.map(entity => this.toDomainAggregate(entity));
  }

  /**
   * Найти пользователей, которые не входили в систему более N дней
   */
  async findInactiveUsers(days: number): Promise<User[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const ormEntities = await this.ormRepository
      .createQueryBuilder('user')
      .where('user.lastLoginAt < :cutoffDate OR user.lastLoginAt IS NULL')
      .andWhere('user.createdAt < :cutoffDate')
      .setParameters({ cutoffDate })
      .orderBy('user.createdAt', 'DESC')
      .getMany();

    return ormEntities.map(entity => this.toDomainAggregate(entity));
  }

  /**
   * Получить количество пользователей по статусам
   */
  async getUsersCountByStatus(): Promise<{
    active: number;
    inactive: number;
    blocked: number;
    pending: number;
  }> {
    const counts = await this.ormRepository
      .createQueryBuilder('user')
      .select('user.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.status')
      .getRawMany();

    const result = {
      active: 0,
      inactive: 0,
      blocked: 0,
      pending: 0
    };

    counts.forEach(count => {
      result[count.status as keyof typeof result] = parseInt(count.count);
    });

    return result;
  }

  /**
   * Преобразование доменного агрегата в ORM сущность
   * Маппинг из Rich Domain Model в Anemic Data Model
   */
  private toOrmEntity(user: User): UserTypeOrmEntity {
    const ormEntity = new UserTypeOrmEntity();
    ormEntity.id = user.id;
    ormEntity.email = user.email.value;
    ormEntity.firstName = user.userName.firstName;
    ormEntity.lastName = user.userName.lastName;
    ormEntity.status = user.status;
    ormEntity.lastLoginAt = user.lastLoginAt;
    ormEntity.emailVerifiedAt = user.emailVerifiedAt;
    ormEntity.createdAt = user.createdAt;
    ormEntity.updatedAt = user.updatedAt;
    return ormEntity;
  }

  /**
   * Преобразование ORM сущности в доменный агрегат
   * Маппинг из Anemic Data Model в Rich Domain Model
   * Использует UserFactory для правильного восстановления агрегата
   */
  private toDomainAggregate(ormEntity: UserTypeOrmEntity): User {
    return UserFactory.restore({
      id: ormEntity.id,
      email: ormEntity.email,
      firstName: ormEntity.firstName,
      lastName: ormEntity.lastName,
      status: ormEntity.status as UserStatus,
      createdAt: ormEntity.createdAt,
      updatedAt: ormEntity.updatedAt,
      lastLoginAt: ormEntity.lastLoginAt,
      emailVerifiedAt: ormEntity.emailVerifiedAt
    });
  }
} 