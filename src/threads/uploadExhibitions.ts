import { workerData, parentPort } from 'worker_threads';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import extract from 'extract-zip';
import { v4 } from 'uuid';
import * as Minio from 'minio';
import { readDirRecursive } from '../common/utils/read-dir.utils';

const minioClient = new Minio.Client({
  endPoint: process.env['MINIO_ENDPOINT'] || '',
  port: Number(process.env['MINIO_PORT']) || 123,
  useSSL: false,
  accessKey: process.env['MINIO_USER'] || '',
  secretKey: process.env['MINIO_PASS'] || '',
});

async function uploadToMinio() {
  const id = v4();
  const tempPath = join(__dirname, '/../upload/temp');
  const randomExactPath = join(tempPath, id);
  const zipPath = join(tempPath, `${id}.zip`);

  if (!existsSync(tempPath)) {
    mkdirSync(tempPath, 0o744);
  }

  const fileName: string = workerData.file.originalname.split('.').shift();

  writeFileSync(zipPath, workerData.file.buffer);
  await extract(zipPath, {
    dir: randomExactPath,
  });

  await rm(zipPath);

  const entries = await readDirRecursive(join(randomExactPath, fileName));

  for (const entry of entries) {
    const entryName = `exhibitions${entry
      //@ts-ignore
      .substring(entry.indexOf('temp') + 4, entry.length)
      .replaceAll('\\', '/')}`;

    await minioClient.fPutObject(workerData.bucketName, entryName, entry);
  }

  return {
    id,
    fileName,
    randomExactPath,
  };
}

uploadToMinio().then((data) => {
  //@ts-ignore
  parentPort.postMessage(data);
});
