import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // На этот адрес ходит HEALTHCHECK из Dockerfile (каждые 30 с) — здесь не должно быть
  // ни записи в БД, ни тяжёлых запросов. Перенос отделов — GET /api/migration/department
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
