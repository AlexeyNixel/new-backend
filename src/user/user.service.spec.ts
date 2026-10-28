import { BadRequestException, ForbiddenException } from '@nestjs/common';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));

import { UserService } from './user.service';

describe('UserService.update', () => {
  const makeService = (user: { id: string; username: string }) => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue({ id: user.id }),
      },
    };
    return { service: new UserService(prisma as never), prisma };
  };

  it('не даёт заблокировать самого себя', async () => {
    const { service, prisma } = makeService({ id: 'u1', username: 'editor' });

    await expect(
      service.update('u1', { isBlocked: true }, 'u1'),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('не даёт заблокировать администратора', async () => {
    const { service } = makeService({ id: 'u2', username: 'mgairat' });

    await expect(
      service.update('u2', { isBlocked: true }, 'u1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('блокирует обычного сотрудника', async () => {
    const { service, prisma } = makeService({ id: 'u3', username: 'editor' });

    await service.update('u3', { isBlocked: true }, 'u1');

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u3' },
        data: { isBlocked: true },
      }),
    );
  });

  it('отклоняет короткий пароль', async () => {
    const { service } = makeService({ id: 'u3', username: 'editor' });

    await expect(
      service.update('u3', { password: '123' }, 'u1'),
    ).rejects.toThrow(BadRequestException);
  });
});
