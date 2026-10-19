export class CreateBookCategoryDto {
  label: string;
  /** Адрес страницы на сайте; пусто — строится из названия */
  slug?: string;
  description?: string | null;
  previewFileId?: string | null;
  isDeleted?: boolean;
}
