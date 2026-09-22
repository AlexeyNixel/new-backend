// Спек читает Reflector-метадату с методов на прототипе контроллера (не вызывая их) — намеренный паттерн для метадата-тестов, а не баг.
/* eslint-disable @typescript-eslint/unbound-method */
import { Reflector } from '@nestjs/core';
import { Audited, AUDITED_ENTITY_KEY } from './audited.decorator';

class TestController {
  @Audited('Post')
  create() {
    return null;
  }

  update() {
    return null;
  }
}

describe('@Audited', () => {
  it('проставляет metadata с типом сущности на помеченном методе', () => {
    const reflector = new Reflector();

    const metadata = reflector.get<string>(
      AUDITED_ENTITY_KEY,
      TestController.prototype.create,
    );

    expect(metadata).toBe('Post');
  });

  it('не проставляет metadata на непомеченном методе', () => {
    const reflector = new Reflector();

    const metadata = reflector.get<string>(
      AUDITED_ENTITY_KEY,
      TestController.prototype.update,
    );

    expect(metadata).toBeUndefined();
  });
});
