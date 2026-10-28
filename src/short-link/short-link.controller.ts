import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ShortLinkService } from './short-link.service';
import { CreateShortLinkDto } from './dto/create-short-link.dto';
import { UpdateShortLinkDto } from './dto/update-short-link.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Audited } from '../common/decorators/audited.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { Section } from '../auth/sections';

@Section('short-links')
@Controller('short-link')
export class ShortLinkController {
  constructor(private readonly shortLinkService: ShortLinkService) {}

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @Audited('ShortLink')
  @Post()
  create(@Body() createShortLinkDto: CreateShortLinkDto) {
    return this.shortLinkService.create(createShortLinkDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.shortLinkService.findAll(paginationQuery);
  }

  /** Публичный: сайт узнаёт адрес для /go/<slug>, переход засчитывается */
  @Get('resolve/:slug')
  resolve(@Param('slug') slug: string) {
    return this.shortLinkService.resolve(slug);
  }

  /** Переходы по дням: ?days=30 */
  @UseGuards(JwtAuthGuard)
  @Get(':id/stats')
  stats(@Param('id') id: string, @Query('days') days?: string) {
    return this.shortLinkService.stats(id, Number(days) || 30);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shortLinkService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @Audited('ShortLink')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateShortLinkDto: UpdateShortLinkDto,
  ) {
    return this.shortLinkService.update(id, updateShortLinkDto);
  }
}
