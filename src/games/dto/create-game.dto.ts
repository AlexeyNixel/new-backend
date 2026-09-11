import { GameStatusValue } from '../utils/map-game-status.utils';

export class CreateGameDto {
  title: string;
  slug?: string;
  externalId?: string;
  shortDescription?: string;
  description?: string;
  playerMin?: number;
  playerMax?: number;
  playerAge?: number;
  durationMin?: number;
  durationMax?: number;
  year?: number;
  status?: GameStatusValue;
  place?: string;
  comment?: string;
  videoUrl?: string;
  seriesId?: string;
  rulesFileId?: string;
  imageFileIds?: string[];
  genreIds?: string[];
}
