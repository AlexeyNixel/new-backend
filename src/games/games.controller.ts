import { Controller, Get, Param, Query } from '@nestjs/common';
import { GamesService } from './games.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.gamesService.findAll(paginationQuery);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gamesService.findOne(+id);
  }
}
