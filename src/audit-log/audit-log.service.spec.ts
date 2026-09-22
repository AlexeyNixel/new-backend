// AuditLogService зависит от PrismaService, который тянет generated/prisma —
// bare-путь не резолвится в jest (см. src/auth/auth.service.spec.ts). Подменяем заглушкой.
jest.mock('../prisma.service', () => ({ PrismaService: class {} }));

import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  const makePrismaMock = () => ({
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  });

  describe('log', () => {
    it('пишет запись через prisma.auditLog.create', async () => {
      const prismaMock = makePrismaMock();
      prismaMock.auditLog.create.mockResolvedValue({ id: 'log1' });
      const service = new AuditLogService(prismaMock as never);

      await service.log({
        entityType: 'Post',
        entityId: 'post1',
        action: 'UPDATE' as never,
        userId: 'user1',
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          entityType: 'Post',
          entityId: 'post1',
          action: 'UPDATE',
          userId: 'user1',
        },
      });
    });

    it('пишет userId как null, если он не передан', async () => {
      const prismaMock = makePrismaMock();
      prismaMock.auditLog.create.mockResolvedValue({ id: 'log1' });
      const service = new AuditLogService(prismaMock as never);

      await service.log({
        entityType: 'Post',
        entityId: 'post1',
        action: 'CREATE' as never,
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          entityType: 'Post',
          entityId: 'post1',
          action: 'CREATE',
          userId: null,
        },
      });
    });
  });

  describe('findAll', () => {
    it('фильтрует по entityType/entityId, считает total и применяет пагинацию', async () => {
      const prismaMock = makePrismaMock();
      prismaMock.auditLog.findMany.mockResolvedValue([{ id: 'log1' }]);
      prismaMock.auditLog.count.mockResolvedValue(1);
      const service = new AuditLogService(prismaMock as never);

      const result = await service.findAll(
        { entityType: 'Post', entityId: 'post1' },
        2,
        10,
      );

      expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith({
        where: { entityType: 'Post', entityId: 'post1' },
        include: { user: { select: { id: true, username: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      });
      expect(prismaMock.auditLog.count).toHaveBeenCalledWith({
        where: { entityType: 'Post', entityId: 'post1' },
      });
      expect(result).toEqual({ items: [{ id: 'log1' }], total: 1 });
    });

    it('без фильтров передаёт пустой where', async () => {
      const prismaMock = makePrismaMock();
      prismaMock.auditLog.findMany.mockResolvedValue([]);
      prismaMock.auditLog.count.mockResolvedValue(0);
      const service = new AuditLogService(prismaMock as never);

      await service.findAll({}, 1, 10);

      expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, skip: 0, take: 10 }),
      );
    });
  });
});
