import { BadRequestException, ConflictException } from '@nestjs/common';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../common/services/minio.service', () => ({
  MinioService: class {},
}));

import { ExhibitionsService } from './exhibitions.service';

describe('ExhibitionsService.upload', () => {
  const zip = (originalname: string) =>
    ({
      originalname,
      size: 1024,
      buffer: Buffer.from(''),
    }) as Express.Multer.File;

  const makeService = (existing: unknown = null) => {
    const prisma = {
      file: { findFirst: jest.fn().mockResolvedValue(existing) },
    };
    const minio = { readExhibitionZip: jest.fn().mockReturnValue([]) };
    return new ExhibitionsService(prisma as never, minio as never, {} as never);
  };

  it('требует латинское имя архива — оно станет адресом страницы', async () => {
    await expect(
      makeService().upload(zip('Выставка Булгаков.zip'), undefined, ''),
    ).rejects.toThrow(BadRequestException);
  });

  it('не перезаписывает выставку с тем же именем', async () => {
    await expect(
      makeService({ id: 'e1' }).upload(
        zip('v_bulgakov_135.zip'),
        undefined,
        '',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('требует index.html в корне пакета', async () => {
    await expect(
      makeService().upload(zip('v_new.zip'), undefined, ''),
    ).rejects.toThrow('В корне архива нет index.html');
  });
});
