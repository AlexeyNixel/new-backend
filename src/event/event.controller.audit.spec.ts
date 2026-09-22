jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('generated/prisma', () => ({}), { virtual: true });

import { Reflector } from '@nestjs/core';
import { EventController } from './event.controller';
import { AUDITED_ENTITY_KEY } from '../common/decorators/audited.decorator';

describe('EventController audit metadata', () => {
  const reflector = new Reflector();

  it('помечает create() как Audited("Event")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      EventController.prototype.create,
    );
    expect(metadata).toBe('Event');
  });

  it('помечает update() как Audited("Event")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      EventController.prototype.update,
    );
    expect(metadata).toBe('Event');
  });
});
