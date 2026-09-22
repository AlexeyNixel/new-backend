jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('generated/prisma', () => ({}), { virtual: true });

import { Reflector } from '@nestjs/core';
import { NotificationController } from './notification.controller';
import { AUDITED_ENTITY_KEY } from '../common/decorators/audited.decorator';

describe('NotificationController audit metadata', () => {
  const reflector = new Reflector();

  it('помечает create() как Audited("Notification")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      NotificationController.prototype.create,
    );
    expect(metadata).toBe('Notification');
  });

  it('помечает update() как Audited("Notification")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      NotificationController.prototype.update,
    );
    expect(metadata).toBe('Notification');
  });
});
