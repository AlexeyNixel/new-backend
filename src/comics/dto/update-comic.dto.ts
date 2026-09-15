import { PartialType } from '@nestjs/mapped-types';
import { CreateComicDto } from './create-comic.dto';

export class UpdateComicDto extends PartialType(CreateComicDto) {
  isDeleted?: boolean;
}
