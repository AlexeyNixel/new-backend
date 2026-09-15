export class CreateComicDto {
  title: string;
  slug?: string;
  description?: string;
  content?: string;
  author?: string;
  illustrator?: string;
  volumeNumber?: number;
  year?: number;
  ageRating?: number;
  externalLink?: string;
  seriesId?: string;
  imageFileIds?: string[];
  genreIds?: string[];
}
