import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

// AuthService тянет по цепочке импортов prisma.service -> generated/prisma,
// который не резолвится в jest (bare-путь через baseUrl). Для юнит-теста
// сервисной логики Prisma не нужна — подменяем заглушкой (jest.mock поднимается
// ts-jest выше импортов).
jest.mock('../prisma.service', () => ({ PrismaService: class {} }));

describe('AuthService.validateToken', () => {
  const fakeUser = {
    id: 'u1',
    username: 'admin',
    password: 'bcrypt-hash',
    name: 'Админ',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  const makeService = (findByIdResult: unknown) => {
    const userService = {
      findById: jest.fn().mockResolvedValue(findByIdResult),
    };
    return new AuthService(userService as never, {} as never);
  };

  it('возвращает пользователя без поля password', async () => {
    const service = makeService(fakeUser);

    const result = await service.validateToken({ sub: 'u1' });

    expect(result).not.toHaveProperty('password');
    expect(result).toEqual({
      id: 'u1',
      username: 'admin',
      name: 'Админ',
      createdAt: fakeUser.createdAt,
    });
  });

  it('бросает UnauthorizedException, если пользователь не найден', async () => {
    const service = makeService(null);

    await expect(service.validateToken({ sub: 'missing' })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('AuthService.logout', () => {
  it('чистит куку access_token для обоих доменов', () => {
    const clearCookie = jest.fn();
    const res = { clearCookie } as never;
    const service = new AuthService({} as never, {} as never);

    const result = service.logout(res);

    expect(result).toEqual({ success: true });
    expect(clearCookie).toHaveBeenCalledTimes(2);
    expect(clearCookie).toHaveBeenCalledWith(
      'access_token',
      expect.objectContaining({ domain: '.infomania.ru', path: '/' }),
    );
    expect(clearCookie).toHaveBeenCalledWith(
      'access_token',
      expect.objectContaining({ domain: 'localhost', path: '/' }),
    );
  });
});
