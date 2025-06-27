import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../domain/entities/user-aggregate';
import { Email } from '../../domain/value-objects/email';
import { UserName } from '../../domain/value-objects/user-name';
import { UserRepositoryInterface } from '../../domain/repositories/user.repository.interface';
import { UserTypeOrmEntity } from '../entities/user.typeorm-entity';

/**
 * Реализация репозитория пользователей через TypeORM
 * 
 * Этот класс принадлежит инфраструктурному слою и реализует
 * интерфейс из доменного слоя. Он знает о том, как сохранять
 * и извлекать данные из конкретной базы данных.
 * 
 * Основные обязанности:
 * 1. Маппинг между доменными и инфраструктурными сущностями
 * 2. Выполнение запросов к БД
 * 3. Трансляция ошибок БД в доменные исключения
 */
@Injectable()
export class UserRepository implements UserRepositoryInterface {
  constructor(
    @InjectRepository(UserTypeOrmEntity)
    private readonly ormRepository: Repository<UserTypeOrmEntity>
  ) {}

  /**
   * Сохранить пользователя
   */
  async save(user: User): Promise<User> {
    const ormEntity = this.toOrmEntity(user);
    const saved = await this.ormRepository.save(ormEntity);
    return this.toDomainEntity(saved);
  }

  /**
   * Найти пользователя по ID
   */
  async findById(id: string): Promise<User | null> {
    const ormEntity = await this.ormRepository.findOne({ where: { id } });
    return ormEntity ? this.toDomainEntity(ormEntity) : null;
  }

  /**
   * Найти всех пользователей
   */
  async findAll(): Promise<User[]> {
    const ormEntities = await this.ormRepository.find({
      order: { createdAt: 'DESC' }
    });
    return ormEntities.map(entity => this.toDomainEntity(entity));
  }

  /**
   * Обновить пользователя
   */
  async update(user: User): Promise<User> {
    const ormEntity = this.toOrmEntity(user);
    await this.ormRepository.save(ormEntity);
    return user;
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
    return ormEntity ? this.toDomainEntity(ormEntity) : null;
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
    return ormEntities.map(entity => this.toDomainEntity(entity));
  }

  /**
   * Найти пользователей с неподтвержденным email
   */
  async findUnverifiedUsers(): Promise<User[]> {
    const ormEntities = await this.ormRepository.find({
      where: { emailVerifiedAt: null },
      order: { createdAt: 'DESC' }
    });
    return ormEntities.map(entity => this.toDomainEntity(entity));
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

    return ormEntities.map(entity => this.toDomainEntity(entity));
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
   * Преобразование доменной сущности в ORM сущность
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
   * Преобразование ORM сущности в доменную сущность
   * Маппинг из Anemic Data Model в Rich Domain Model
   */
  private toDomainEntity(ormEntity: UserTypeOrmEntity): User {
    const email = new Email(ormEntity.email);
    const userName = new UserName(ormEntity.firstName, ormEntity.lastName);
    
    const user = new User(
      email,
      userName,
      ormEntity.id,
      ormEntity.status as UserStatus
    );

    // Восстанавливаем приватные поля через рефлексию
    // В реальном проекте лучше использовать фабричные методы
    (user as any)._lastLoginAt = ormEntity.lastLoginAt;
    (user as any)._emailVerifiedAt = ormEntity.emailVerifiedAt;
    (user as any)._createdAt = ormEntity.createdAt;
    (user as any)._updatedAt = ormEntity.updatedAt;

    return user;
  }
} 