/**
 * Досчёт длительности для уже загруженных аудиофайлов (File.type = AUDIO, duration = null).
 * Скачивает файл из хранилища, читает метаданные и пишет секунды в File.duration.
 *
 *   npm run audio:duration-backfill
 *
 * Запускать один раз после применения миграции file_duration; повторный запуск
 * продолжит с файлов, у которых длительность ещё не заполнена. Нераспознанные
 * файлы остаются с duration = null — их можно исправить перезаливкой или вручную.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { MinioService } from '../../common/services/minio.service';
import { PrismaService } from '../../prisma.service';
import { readAudioDuration } from '../utils/audio-duration.utils';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const prisma = app.get(PrismaService);
    const minio = app.get(MinioService);

    const files = await prisma.file.findMany({
      where: { type: 'AUDIO', duration: null },
      select: { id: true, originalName: true, path: true },
    });
    console.log(`Файлов без длительности: ${files.length}`);

    let updated = 0;
    let failed = 0;

    for (const file of files) {
      try {
        const buffer = await minio.getObjectByPath(file.path);
        const duration = await readAudioDuration(buffer);
        if (!duration) {
          failed += 1;
          console.log(`не распознан: ${file.id} ${file.originalName}`);
          continue;
        }
        await prisma.file.update({ where: { id: file.id }, data: { duration } });
        updated += 1;
      } catch (error) {
        failed += 1;
        console.log(
          `ошибка: ${file.id} ${file.originalName}: ${(error as Error).message}`,
        );
      }
    }

    console.log(`Готово: обновлено ${updated}, ошибок ${failed}`);
    // Закрываем только Prisma: TypeORM в этом контексте не используется и
    // его хук остановки падает на отсутствующем DataSource
    await prisma.$disconnect();
  } finally {
    process.exit(0);
  }
}

void main();
