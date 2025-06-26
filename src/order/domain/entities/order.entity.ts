import { BaseEntity } from '@shared/domain/base-entity';

/**
 * Статус заказа
 */
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

/**
 * Сущность Order в доменном слое
 * 
 * Пример второго домена для демонстрации взаимодействия между доменами.
 * В реальном DDD проекте каждый домен должен быть независимым, но они
 * могут взаимодействовать через четко определенные интерфейсы.
 */
export class Order extends BaseEntity {
  private _userId: string;
  private _totalAmount: number;
  private _status: OrderStatus;
  private _items: OrderItem[];
  private _shippingAddress: string;

  constructor(
    userId: string,
    items: OrderItem[],
    shippingAddress: string,
    id?: string
  ) {
    super(id);
    this._userId = userId;
    this._items = [...items]; // создаем копию массива
    this._shippingAddress = shippingAddress;
    this._status = OrderStatus.PENDING;
    this._totalAmount = this.calculateTotal();
  }

  /**
   * Получить ID пользователя
   */
  public get userId(): string {
    return this._userId;
  }

  /**
   * Получить общую сумму заказа
   */
  public get totalAmount(): number {
    return this._totalAmount;
  }

  /**
   * Получить статус заказа
   */
  public get status(): OrderStatus {
    return this._status;
  }

  /**
   * Получить товары в заказе
   */
  public get items(): OrderItem[] {
    return [...this._items]; // возвращаем копию для защиты от изменений
  }

  /**
   * Получить адрес доставки
   */
  public get shippingAddress(): string {
    return this._shippingAddress;
  }

  /**
   * Подтвердить заказ
   * Доменный метод с бизнес-логикой
   */
  public confirm(): void {
    if (this._status !== OrderStatus.PENDING) {
      throw new Error('Только ожидающие заказы могут быть подтверждены');
    }

    if (this._items.length === 0) {
      throw new Error('Нельзя подтвердить пустой заказ');
    }

    this._status = OrderStatus.CONFIRMED;
    this.touch();
  }

  /**
   * Отменить заказ
   * Доменный метод с бизнес-логикой
   */
  public cancel(): void {
    if (this._status === OrderStatus.SHIPPED || this._status === OrderStatus.DELIVERED) {
      throw new Error('Нельзя отменить отправленный или доставленный заказ');
    }

    if (this._status === OrderStatus.CANCELLED) {
      throw new Error('Заказ уже отменен');
    }

    this._status = OrderStatus.CANCELLED;
    this.touch();
  }

  /**
   * Пересчитать общую сумму заказа
   */
  private calculateTotal(): number {
    return this._items.reduce((total, item) => total + item.getTotalPrice(), 0);
  }

  /**
   * Добавить товар в заказ
   */
  public addItem(item: OrderItem): void {
    if (this._status !== OrderStatus.PENDING) {
      throw new Error('Можно добавлять товары только в ожидающие заказы');
    }

    this._items.push(item);
    this._totalAmount = this.calculateTotal();
    this.touch();
  }

  /**
   * Проверить, принадлежит ли заказ пользователю
   */
  public belongsToUser(userId: string): boolean {
    return this._userId === userId;
  }

  /**
   * Статический метод для создания заказа
   */
  public static create(
    userId: string,
    items: { productName: string; price: number; quantity: number }[],
    shippingAddress: string
  ): Order {
    if (!userId?.trim()) {
      throw new Error('ID пользователя обязателен');
    }

    if (!items || items.length === 0) {
      throw new Error('Заказ должен содержать хотя бы один товар');
    }

    if (!shippingAddress?.trim()) {
      throw new Error('Адрес доставки обязателен');
    }

    const orderItems = items.map(item => new OrderItem(
      item.productName,
      item.price,
      item.quantity
    ));

    return new Order(userId, orderItems, shippingAddress);
  }
}

/**
 * Элемент заказа (товар в заказе)
 * Можно рассматривать как Value Object или вложенную сущность
 */
export class OrderItem {
  constructor(
    private readonly _productName: string,
    private readonly _price: number,
    private readonly _quantity: number
  ) {
    if (!_productName?.trim()) {
      throw new Error('Название товара обязательно');
    }
    if (_price <= 0) {
      throw new Error('Цена должна быть положительной');
    }
    if (_quantity <= 0) {
      throw new Error('Количество должно быть положительным');
    }
  }

  public get productName(): string {
    return this._productName;
  }

  public get price(): number {
    return this._price;
  }

  public get quantity(): number {
    return this._quantity;
  }

  /**
   * Получить общую стоимость товара (цена * количество)
   */
  public getTotalPrice(): number {
    return this._price * this._quantity;
  }
} 