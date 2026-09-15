import { Controller, Get, Param, Query } from '@nestjs/common';
import { ComicsService } from './comics.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('comics')
export class ComicsController {
  constructor(private readonly comicsService: ComicsService) {}

  @Get('genres')
  findAllGenres() {
    return this.comicsService.findAllGenres();
  }

  @Get('series')
  findAllSeries() {
    return this.comicsService.findAllSeries();
  }

  @Get()
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.comicsService.findAll(paginationQuery);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.comicsService.findOne(id);
  }
}
