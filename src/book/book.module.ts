import { Module } from '@nestjs/common';
import { BookService } from './book.service';
import { BookController } from './book.controller';
import { ResponseService } from '../common/services/response.service';

@Module({
  controllers: [BookController],
  providers: [BookService, ResponseService],
})
export class BookModule {}
