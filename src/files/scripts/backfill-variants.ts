/**
 * Создаёт уменьшенные копии (400/800px, WebP) для уже загруженных картинок-превью.
 *
 *   npm run variants:backfill                 — все файлы без копий
 *   npm run variants:backfill -- --limit=20   — пробный запуск на 20 файлах
 *   npm run variants:backfill -- --force      — пересоздать копии у всех файлов
 *
 * Безопасен для старого сайта: исходные файлы только читаются, копии пишутся
 * в бакет MINIO_BUCKET_NAME под префиксом `variants/`. Можно прерывать и
 * перезапускать — обработанные файлы (variants != null) пропускаются.
 */
import { NestFactory } from '@nestjs/core';
import { writeFileSync } from 'fs';
import { AppModule } from '../../app.module';
import { FilesService } from '../files.service';

const readArg = (name: string) => {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? Number(arg.split('=')[1]) : undefined;
};

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const files = app.get(FilesService);
  const startedAt = Date.now();

  const stats = await files.backfillVariants({
    limit: readArg('limit'),
    concurrency: readArg('concurrency'),
    force: process.argv.includes('--force'),
    onProgress: (s) => {
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      console.log(
        `[variants] обработано ${s.processed}, копий ${s.created}, ошибок ${s.failed} (${seconds} c)`,
      );
    },
  });

  if (stats.errors.length) {
    const report = `temp/variants-errors-${Date.now()}.json`;
    writeFileSync(report, JSON.stringify(stats.errors, null, 2));
    console.log(`[variants] список ошибок: ${report}`);
  }
  console.log('[variants] готово', { ...stats, errors: stats.errors.length });

  // TypeORM с именованным подключением (sourceDB) падает на shutdown-хуке —
  // работа к этому моменту уже завершена, поэтому ошибку закрытия игнорируем
  await app.close().catch(() => undefined);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
