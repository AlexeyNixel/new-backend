jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('generated/prisma', () => ({}), { virtual: true });

import { Reflector } from '@nestjs/core';
import { NavigationItemController } from './navigation-item.controller';
import { AUDITED_ENTITY_KEY } from '../common/decorators/audited.decorator';

describe('NavigationItemController audit metadata', () => {
  const reflector = new Reflector();

  it('помечает create() как Audited("NavigationItem")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      NavigationItemController.prototype.create,
    );
    expect(metadata).toBe('NavigationItem');
  });

  it('помечает update() как Audited("NavigationItem")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      NavigationItemController.prototype.update,
    );
    expect(metadata).toBe('NavigationItem');
  });

  it('НЕ помечает updateOrderBatch() (массовая правка порядка, не одна сущность)', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      NavigationItemController.prototype.updateOrderBatch,
    );
    expect(metadata).toBeUndefined();
  });
});
