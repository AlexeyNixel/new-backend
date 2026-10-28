import { Controller, ForbiddenException, Get } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Section } from '../sections';

@Section('books')
@Controller('test')
class BooksController {
  @Get()
  list() {}

  @Section('posts')
  @Get('override')
  override() {}
}

class OpenController {
  @Get()
  list() {}
}

describe('JwtAuthGuard: доступ к разделам', () => {
  const guard = new JwtAuthGuard(new Reflector());

  beforeAll(() => {
    // Проверку токена (passport) не тестируем — считаем, что он валиден
    jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockResolvedValue(true);
  });

  const context = (user: object, cls: object, handler: () => void) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers: {}, cookies: {}, user }),
      }),
      getHandler: () => handler,
      getClass: () => cls,
    }) as never;

  const librarian = { username: 'lib', sections: ['books'] };

  it('пускает в выданный раздел', async () => {
    await expect(
      guard.canActivate(
        context(librarian, BooksController, BooksController.prototype.list),
      ),
    ).resolves.toBe(true);
  });

  it('метка на маршруте важнее метки контроллера', async () => {
    await expect(
      guard.canActivate(
        context(librarian, BooksController, BooksController.prototype.override),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('маршруты без раздела доступны любому вошедшему', async () => {
    await expect(
      guard.canActivate(
        context(librarian, OpenController, OpenController.prototype.list),
      ),
    ).resolves.toBe(true);
  });
});
