import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * TypeORM сущность для пользователя
 * 
 * Это инфраструктурная сущность, которая определяет,
 * как доменная сущность User сохраняется в базе данных.
 * 
 * Важно: эта сущность знает только о структуре данных,
 * она НЕ содержит бизнес-логику.
 */
@Entity('users')
export class UserTypeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ default: 'pending' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Дополнительные поля для CQRS Read Models
  @Column({ nullable: true })
  lastLoginAt: Date | null;

  @Column({ nullable: true })
  emailVerifiedAt: Date | null;
} 