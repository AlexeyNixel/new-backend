export class CreatePostDto {
  title: string;
  description: string;
  content: string;
  isPublished: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  departmentId?: string;
  publishedAt?: string;
  slug?: string;
  previewFileId?: string;
  tags?: string[];
}
