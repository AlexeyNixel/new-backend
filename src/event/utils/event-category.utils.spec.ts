import { BadRequestException } from '@nestjs/common';
import { assertEventCategory } from './event-category.utils';

describe('assertEventCategory', () => {
  it('пропускает допустимые типы', () => {
    for (const value of ['MASTER', 'MUSIC', 'GAME', 'TALK']) {
      expect(() => assertEventCategory(value)).not.toThrow();
    }
  });

  it('пропускает отсутствующий тип и null (снять тип)', () => {
    expect(() => assertEventCategory(undefined)).not.toThrow();
    expect(() => assertEventCategory(null)).not.toThrow();
  });

  it('отклоняет неизвестный тип с ошибкой 400', () => {
    expect(() => assertEventCategory('master')).toThrow(BadRequestException);
    expect(() => assertEventCategory('CONCERT')).toThrow(BadRequestException);
  });
});
