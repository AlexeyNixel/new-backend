import { extractExternalIdSortNumber } from './extract-external-id-sort-number.utils';

describe('extractExternalIdSortNumber', () => {
  it('извлекает число из хвоста id старого формата', () => {
    expect(extractExternalIdSortNumber('gm120')).toBe(120);
    expect(extractExternalIdSortNumber('gm28')).toBe(28);
    expect(extractExternalIdSortNumber('gl-136')).toBe(136);
  });

  it('распознаёт полностью числовой id', () => {
    expect(extractExternalIdSortNumber('393203')).toBe(393203);
  });

  it('возвращает 0 для null/пустой строки/id без цифр', () => {
    expect(extractExternalIdSortNumber(null)).toBe(0);
    expect(extractExternalIdSortNumber('')).toBe(0);
    expect(extractExternalIdSortNumber('abc')).toBe(0);
  });
});
