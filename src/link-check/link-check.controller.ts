import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { LinkCheckService } from './link-check.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Section } from '../auth/sections';

/** Проверка битых ссылок — раздел «Инструменты» админки */
@UseGuards(JwtAuthGuard)
@Section('link-check')
@Controller('link-check')
export class LinkCheckController {
  constructor(private readonly linkCheckService: LinkCheckService) {}

  /** Последний отчёт (в т.ч. идущий — с прогрессом checked/total) */
  @Get()
  latest() {
    return this.linkCheckService.latest();
  }

  @Get('history')
  history() {
    return this.linkCheckService.history();
  }

  @Post('run')
  run() {
    return this.linkCheckService.start();
  }
}
