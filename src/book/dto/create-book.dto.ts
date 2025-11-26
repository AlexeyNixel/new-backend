export class CreateBookDto {
  title: string;
  slug: string;
  description: string;
  content: string;
  isDeleted: boolean;
  isVideo: boolean;
  place: string;
  categories?: string[];
  litresLink?: string;
}
