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
import { ComicsService } from './comics.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateComicDto } from './dto/create-comic.dto';
import { UpdateComicDto } from './dto/update-comic.dto';
import { CreateComicGenreDto } from './dto/create-comic-genre.dto';
import { CreateComicSeriesDto } from './dto/create-comic-series.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('comics')
export class ComicsController {
  constructor(private readonly comicsService: ComicsService) {}

  @Get('genres')
  findAllGenres() {
    return this.comicsService.findAllGenres();
  }

  @UseGuards(JwtAuthGuard)
  @Post('genres')
  createGenre(@Body() dto: CreateComicGenreDto) {
    return this.comicsService.createGenre(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('genres/:id')
  updateGenre(
    @Param('id') id: string,
    @Body() dto: Partial<CreateComicGenreDto>,
  ) {
    return this.comicsService.updateGenre(id, dto);
  }

  @Get('series')
  findAllSeries() {
    return this.comicsService.findAllSeries();
  }

  @UseGuards(JwtAuthGuard)
  @Post('series')
  createSeries(@Body() dto: CreateComicSeriesDto) {
    return this.comicsService.createSeries(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('series/:id')
  updateSeries(
    @Param('id') id: string,
    @Body() dto: Partial<CreateComicSeriesDto>,
  ) {
    return this.comicsService.updateSeries(id, dto);
  }

  @Get()
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.comicsService.findAll(paginationQuery);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateComicDto) {
    return this.comicsService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.comicsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateComicDto) {
    return this.comicsService.update(id, dto);
  }
}
