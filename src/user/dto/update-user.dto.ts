/** Логин не меняется: по нему определяются права (см. user-managers.ts) */
export class UpdateUserDto {
  name?: string | null;
  /** Новый пароль — сброс администратором */
  password?: string;
  isBlocked?: boolean;
  /** Ключи разделов из src/auth/sections.ts; null — все разделы */
  sections?: string[] | null;
}
