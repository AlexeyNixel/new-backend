export class PaginationQueryDto {
  page?: number = 1;
  limit?: number = 10;
  isDeleted?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' = 'desc';
}
