import { SetMetadata } from '@nestjs/common';
import { canManageUsers } from '../user/user-managers';

/**
 * Разделы админки, к которым выдаётся доступ (галочки в «Пользователях»).
 * Тот же список — в admin/app/constants/sections.ts: при изменении обновлять оба.
 */
export const SECTIONS = {
  notifications: 'Уведомления',
  posts: 'Посты',
  pages: 'Страницы',
  tags: 'Теги',
  exhibitions: 'Выставки',
  media: 'Медиатека',
  achievements: 'Достижения',
  books: 'Книги',
  collections: 'Сборники книг',
  games: 'Игры',
  comics: 'Комиксы',
  events: 'События',
  slides: 'Слайды',
  clubs: 'Клубы',
  departments: 'Отделы',
  navigation: 'Навигация',
  'map-points': 'Точки на карте',
  'short-links': 'Короткие ссылки',
  'link-check': 'Проверка ссылок',
  'audit-log': 'Журнал изменений',
} as const;

export type SectionKey = keyof typeof SECTIONS;

/** Служебные операции (перенос данных со старого сайта) — только администраторам */
export const ADMIN_ONLY = 'admin';

export const SECTION_KEY = 'admin-section';

/**
 * Раздел, к которому относится контроллер или маршрут. Проверяет JwtAuthGuard —
 * поэтому публичные маршруты (без гарда), которые читает сайт, остаются открытыми.
 */
export const Section = (section: SectionKey | typeof ADMIN_ONLY) =>
  SetMetadata(SECTION_KEY, section);

export const isSectionKey = (value: unknown): value is SectionKey =>
  typeof value === 'string' && Object.hasOwn(SECTIONS, value);

export interface SectionUser {
  username?: string | null;
  /** null — доступ ко всем разделам */
  sections?: unknown;
}

export const hasSection = (user: SectionUser | undefined, section: string) => {
  if (!user) return false;
  if (canManageUsers(user.username)) return true;
  if (section === ADMIN_ONLY) return false;
  if (user.sections == null) return true;
  return Array.isArray(user.sections) && user.sections.includes(section);
};
