export class CreateShortLinkDto {
  url: string;
  /** Пусто — хвост сгенерируется автоматически */
  slug?: string | null;
  title?: string | null;
  isDeleted?: boolean;
}
