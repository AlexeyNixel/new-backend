import { groupBySeriesTitle } from './group-by-series.utils';

describe('groupBySeriesTitle', () => {
  it('группирует игры по общей базовой части названия', () => {
    const rows = [
      { title: 'AZUL. Витражи Синтры' },
      { title: 'AZUL. Летний дворец' },
      { title: 'Классики' },
    ];

    const groups = groupBySeriesTitle(rows);

    expect(groups.size).toBe(1);
    expect(groups.get('azul')).toEqual([rows[0], rows[1]]);
  });

  it('присоединяет базовую игру без подзаголовка к своей серии ("AZUL")', () => {
    const rows = [
      { title: 'AZUL' },
      { title: 'AZUL. Витражи Синтры' },
      { title: 'AZUL. Летний дворец' },
    ];

    const groups = groupBySeriesTitle(rows);

    expect(groups.get('azul')).toHaveLength(3);
    expect(groups.get('azul')).toEqual(expect.arrayContaining(rows));
  });

  it('не создаёт серию из одной игры', () => {
    const rows = [
      { title: 'Gloomhaven. Мрачная гавань' },
      { title: 'Классики' },
    ];

    const groups = groupBySeriesTitle(rows);

    expect(groups.size).toBe(0);
  });

  it('возвращает пустую карту для пустого списка', () => {
    expect(groupBySeriesTitle([]).size).toBe(0);
  });
});
