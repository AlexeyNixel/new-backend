export type GameStatusValue =
  | 'IN_STOCK'
  | 'ON_HANDS'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'WRITTEN_OFF'
  | 'LOST'
  | 'DAMAGED';

const STATUS_BY_OLD_CODE: Record<number, GameStatusValue> = {
  [-4]: 'DAMAGED',
  [-3]: 'LOST',
  [-2]: 'WRITTEN_OFF',
  [-1]: 'TEMPORARILY_UNAVAILABLE',
  0: 'IN_STOCK',
  1: 'ON_HANDS',
};

/** Маппинг числового статуса из nomb_games.g_status в enum GameStatus. */
export function mapGameStatus(
  status: number | null | undefined,
): GameStatusValue {
  if (status == null) {
    return 'IN_STOCK';
  }

  return STATUS_BY_OLD_CODE[status] ?? 'IN_STOCK';
}
