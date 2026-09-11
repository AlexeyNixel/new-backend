export class PaginationQueryDto {
  page?: number = 1;
  limit?: number = 10;
  isDeleted?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' = 'desc';
  search?: string;
  include?: string;
  startDate: string;
  endDate: string;
  department?: string;
  genres?: Array<string>;
  age?: number;
  tags?: string | Array<string>;
  // Фильтры игр (src/games)
  players?: number;
  ageMin?: number;
  ageMax?: number;
  maxDuration?: number;
  yearFrom?: number;
  yearTo?: number;
  seriesId?: string;
  availableOnly?: boolean;
}
