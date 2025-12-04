import { Module } from '@nestjs/common';
import { BookCategoryService } from './book-category.service';
import { BookCategoryController } from './book-category.controller';
import { ResponseService } from '../common/services/response.service';

@Module({
  controllers: [BookCategoryController],
  providers: [BookCategoryService, ResponseService],
})
export class BookCategoryModule {}
