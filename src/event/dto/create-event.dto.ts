import { EventCategoryValue } from '../utils/event-category.utils';

export class CreateEventDto {
  title: string;
  content: string;
  phone: string;
  age: number;
  place: string;
  eventTime: Date;
  /** Тип события для афиши; null — не указан (сайт угадывает по названию) */
  category?: EventCategoryValue | null;
  isDeleted: boolean;
  /** Ссылка на покупку билета (касса); только http(s), пустая строка = нет ссылки */
  ticketUrl?: string | null;
  /** Билет можно купить по Пушкинской карте */
  isPushkin?: boolean;
}
