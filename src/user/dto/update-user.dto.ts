/** Логин не меняется: по нему определяются права (см. user-managers.ts) */
export class UpdateUserDto {
  name?: string | null;
  /** Новый пароль — сброс администратором */
  password?: string;
  isBlocked?: boolean;
}
