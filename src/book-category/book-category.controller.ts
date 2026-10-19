import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  UseGuards,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { BookCategoryService } from './book-category.service';
import { CreateBookCategoryDto } from './dto/create-book-category.dto';
import { UpdateBookCategoryDto } from './dto/update-book-category.dto';
import { SetCollectionBooksDto } from './dto/set-collection-books.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Audited } from '../common/decorators/audited.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';

@Controller('book-collection')
export class BookCategoryController {
  constructor(private readonly bookCategoryService: BookCategoryService) {}

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @Audited('BookCollection')
  @Post()
  create(@Body() createBookCategoryDto: CreateBookCategoryDto) {
    return this.bookCategoryService.create(createBookCategoryDto);
  }

  @Get()
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.bookCategoryService.findAll(paginationQuery);
  }

  /** По id или адресу (slug); `?isDeleted=true` — со скрытыми книгами (админка) */
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.bookCategoryService.findOne(id, paginationQuery);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @Audited('BookCollection')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBookCategoryDto: UpdateBookCategoryDto,
  ) {
    return this.bookCategoryService.update(id, updateBookCategoryDto);
  }

  /** Состав и порядок книг подборки (список заменяет прежний) */
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @Audited('BookCollection')
  @Put(':id/books')
  setBooks(@Param('id') id: string, @Body() dto: SetCollectionBooksDto) {
    return this.bookCategoryService.setBooks(id, dto);
  }
}
