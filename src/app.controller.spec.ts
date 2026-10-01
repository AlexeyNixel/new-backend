import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  it('GET /api отвечает без обращения к БД (на него ходит HEALTHCHECK)', async () => {
    // В модуле нет ни PrismaService, ни DataSource: если контроллер снова начнёт
    // их требовать, тест упадёт на создании модуля
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    const controller = moduleRef.get(AppController);

    expect(controller.getHello()).toBe('Hello World!');
  });
});
