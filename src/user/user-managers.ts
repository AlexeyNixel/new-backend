/**
 * Кто управляет пользователями админки (раздел «Пользователи»).
 * Список задан в коде намеренно: переменная окружения, которую забыли задать,
 * не должна открывать управление всем.
 */
export const USER_MANAGERS = ['slip', 'mgairat'];

export const canManageUsers = (username?: string | null) =>
  !!username && USER_MANAGERS.includes(username.trim().toLowerCase());
