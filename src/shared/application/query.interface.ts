/**
 * Базовый интерфейс для запросов в CQRS
 * 
 * Запросы предназначены только для чтения данных
 * и не должны изменять состояние системы.
 */
export interface Query {
  /**
   * Валидация запроса
   */
  validate(): void;
}

/**
 * Интерфейс для обработчиков запросов
 */
export interface QueryHandler<TQuery extends Query, TResult> {
  /**
   * Обработать запрос
   * @param query - запрос для обработки
   * @returns результат запроса
   */
  handle(query: TQuery): Promise<TResult>;
}

/**
 * Интерфейс для пагинации
 */
export interface PaginationQuery {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Результат пагинированного запроса
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
} 