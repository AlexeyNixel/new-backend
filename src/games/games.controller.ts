import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GamesService } from './games.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { CreateGameGenreDto } from './dto/create-game-genre.dto';
import { CreateGameSeriesDto } from './dto/create-game-series.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get('genres')
  findAllGenres() {
    return this.gamesService.findAllGenres();
  }

  @UseGuards(JwtAuthGuard)
  @Post('genres')
  createGenre(@Body() dto: CreateGameGenreDto) {
    return this.gamesService.createGenre(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('genres/:id')
  updateGenre(
    @Param('id') id: string,
    @Body() dto: Partial<CreateGameGenreDto>,
  ) {
    return this.gamesService.updateGenre(id, dto);
  }

  @Get('series')
  findAllSeries() {
    return this.gamesService.findAllSeries();
  }

  @UseGuards(JwtAuthGuard)
  @Post('series')
  createSeries(@Body() dto: CreateGameSeriesDto) {
    return this.gamesService.createSeries(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('series/:id')
  updateSeries(
    @Param('id') id: string,
    @Body() dto: Partial<CreateGameSeriesDto>,
  ) {
    return this.gamesService.updateSeries(id, dto);
  }

  @Get()
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.gamesService.findAll(paginationQuery);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateGameDto) {
    return this.gamesService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gamesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGameDto) {
    return this.gamesService.update(id, dto);
  }
}
