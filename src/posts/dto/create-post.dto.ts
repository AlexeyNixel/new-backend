export class CreatePostDto {
  title: string;
  description: string;
  content: string;
  isPublished: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  departmentId?: string;
  publishedAt?: string;
  /** Дата мероприятия для новости-анонса, «YYYY-MM-DD»; null — убрать */
  eventDate?: string | null;
  slug?: string;
  previewFileId?: string;
  tags?: string[];
}
