import { PartialType } from '@nestjs/mapped-types';
import { CreateBookCategoryDto } from './create-book-category.dto';

export class UpdateBookCategoryDto extends PartialType(CreateBookCategoryDto) {}
