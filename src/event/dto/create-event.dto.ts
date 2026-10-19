import { EventCategoryValue } from '../utils/event-category.utils';

export class CreateEventDto {
  title: string;
  content: string;
  phone: string;
  age: number;
  place: string;
  eventTime: Date;
  /** Тип события для афиши; null — снять тип (сайт определит его по названию) */
  category?: EventCategoryValue | null;
  isDeleted: boolean;
}
