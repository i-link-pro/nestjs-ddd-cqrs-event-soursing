import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id: string;

  @Column({ type: 'varchar', length: 254, unique: true })
  email: string;

  @Column({ name: 'first_name', type: 'varchar', length: 50 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 50 })
  lastName: string;

  @Column({ 
    type: 'enum', 
    enum: ['active', 'inactive', 'blocked', 'pending'],
    default: 'pending'
  })
  status: string;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'email_verified_at', type: 'timestamp', nullable: true })
  emailVerifiedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 