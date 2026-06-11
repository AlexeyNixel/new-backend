import { PageBlock } from '../types/page-block.type';

export class CreatePageDto {
  title: string;
  content: string;
  isDeleted: boolean;
  slug?: string;
  blocks?: PageBlock[];
}
