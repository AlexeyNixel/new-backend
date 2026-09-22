import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { GamesService } from './games.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { CreateGameGenreDto } from './dto/create-game-genre.dto';
import { CreateGameSeriesDto } from './dto/create-game-series.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Audited } from '../common/decorators/audited.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @UseGuards(JwtAuthGuard)
  @Get('migrate')
  migrate() {
    return this.gamesService.migrate();
  }

  @UseGuards(JwtAuthGuard)
  @Get('regroup-series')
  regroupSeries() {
    return this.gamesService.regroupSeries();
  }

  @UseGuards(JwtAuthGuard)
  @Get('backfill-created-at')
  backfillCreatedAt() {
    return this.gamesService.backfillCreatedAtFromExternalId();
  }

  @Get('genres')
  findAllGenres() {
    return this.gamesService.findAllGenres();
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @Audited('GameGenre')
  @Post('genres')
  createGenre(@Body() dto: CreateGameGenreDto) {
    return this.gamesService.createGenre(dto);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @Audited('GameGenre')
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
  @UseInterceptors(AuditInterceptor)
  @Audited('GameSeries')
  @Post('series')
  createSeries(@Body() dto: CreateGameSeriesDto) {
    return this.gamesService.createSeries(dto);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @Audited('GameSeries')
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
  @UseInterceptors(AuditInterceptor)
  @Audited('Game')
  @Post()
  create(@Body() dto: CreateGameDto) {
    return this.gamesService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gamesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @Audited('Game')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGameDto) {
    return this.gamesService.update(id, dto);
  }
}
