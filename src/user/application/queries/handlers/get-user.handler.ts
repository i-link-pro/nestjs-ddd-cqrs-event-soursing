import { Injectable } from '@nestjs/common';
import { QueryHandler } from '@shared/application/query.interface';
import { GetUserQuery, GetUserByEmailQuery } from '../get-user.query';
import { UserReadModelRepositoryInterface } from '../../../infrastructure/read-models/user-read-model.repository.interface';
import { UserReadModel } from '../../../infrastructure/read-models/user.read-model';
import { Email } from '../../../domain/value-objects/email';

/**
 * Обработчик запроса получения пользователя по ID
 * 
 * В CQRS обработчики запросов работают с read models (моделями чтения),
 * которые оптимизированы для конкретных сценариев запросов.
 */
@Injectable()
export class GetUserHandler implements QueryHandler<GetUserQuery, UserReadModel | null> {
  constructor(
    private readonly userReadRepository: UserReadModelRepositoryInterface
  ) {}

  async handle(query: GetUserQuery): Promise<UserReadModel | null> {
    console.log(`📖 Обрабатываем запрос: GetUserQuery для ${query.userId}`);

    query.validate();

    const user = await this.userReadRepository.findById(query.userId);
    
    if (user) {
      console.log(`✅ Пользователь найден: ${user.email}`);
    } else {
      console.log(`❌ Пользователь не найден: ${query.userId}`);
    }

    return user;
  }
}

/**
 * Обработчик запроса получения пользователя по email
 */
@Injectable()
export class GetUserByEmailHandler implements QueryHandler<GetUserByEmailQuery, UserReadModel | null> {
  constructor(
    private readonly userReadRepository: UserReadModelRepositoryInterface
  ) {}

  async handle(query: GetUserByEmailQuery): Promise<UserReadModel | null> {
    console.log(`📖 Обрабатываем запрос: GetUserByEmailQuery для ${query.email}`);

    query.validate();

    const user = await this.userReadRepository.findByEmail(query.email);
    
    if (user) {
      console.log(`✅ Пользователь найден по email: ${user.email}`);
    } else {
      console.log(`❌ Пользователь не найден по email: ${query.email}`);
    }

    return user;
  }
} 