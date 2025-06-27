import { Injectable } from '@nestjs/common';
import { QueryHandler, PaginatedResult } from '@shared/application/query.interface';
import { GetUsersQuery } from '../get-user.query';
import { UserReadModelRepositoryInterface } from '../../../infrastructure/read-models/user-read-model.repository.interface';
import { UserReadModel } from '../../../infrastructure/read-models/user.read-model';

/**
 * Обработчик запроса получения списка пользователей с пагинацией
 */
@Injectable()
export class GetUsersHandler implements QueryHandler<GetUsersQuery, PaginatedResult<UserReadModel>> {
  constructor(
    private readonly userReadRepository: UserReadModelRepositoryInterface
  ) {}

  async handle(query: GetUsersQuery): Promise<PaginatedResult<UserReadModel>> {
    console.log(`📖 Обрабатываем запрос: GetUsersQuery (страница ${query.page}, лимит ${query.limit})`);

    query.validate();

    // Применяем фильтры
    const filters: any = {};
    if (query.status) {
      filters.status = query.status;
    }
    if (query.emailVerified !== undefined) {
      filters.emailVerified = query.emailVerified;
    }

    // Выполняем запрос с пагинацией
    const result = await this.userReadRepository.findWithPagination({
      page: query.page,
      limit: query.limit,
      filters,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder
    });

    console.log(`✅ Найдено ${result.total} пользователей, возвращено ${result.items.length}`);

    return result;
  }
} 