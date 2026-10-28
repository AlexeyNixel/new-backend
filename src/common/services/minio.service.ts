import { Injectable } from '@nestjs/common';
import * as Minio from 'minio';
import { ConfigService } from '@nestjs/config';
import AdmZip from 'adm-zip';

@Injectable()
export class MinioService {
  private minioClient: Minio.Client;
  private readonly bucketName: string;

  constructor(private configServices: ConfigService) {
    this.minioClient = new Minio.Client({
      endPoint: this.configServices.get('MINIO_ENDPOINT') || '',
      port: Number(this.configServices.get('MINIO_PORT')) || undefined,
      useSSL: this.configServices.get('MINIO_USE_SSL') === 'true',
      accessKey: this.configServices.get('MINIO_USER') || undefined,
      secretKey: this.configServices.get('MINIO_PASS') || undefined,
    });

    this.bucketName = this.configServices.get('MINIO_BUCKET_NAME') || 'dev';
    this.ensureBucketExists();
  }

  private async ensureBucketExists() {
    const exist = await this.minioClient.bucketExists(this.bucketName);

    if (!exist) {
      await this.minioClient.makeBucket(this.bucketName);

      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucketName}/*`],
          },
        ],
      };

      await this.minioClient.setBucketPolicy(
        this.bucketName,
        JSON.stringify(policy),
      );
    }
  }

  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    type?: string,
  ) {
    try {
      const key = this.generateFilePath(originalName, type);

      const result = await this.minioClient.putObject(
        this.bucketName,
        key,
        fileBuffer,
        fileBuffer.length,
        // Ключ именно 'Content-Type': иначе minio кладёт его в x-amz-meta-contenttype,
        // а файл отдаётся как binary/octet-stream (с nosniff — скачивается, а не открывается)
        { 'Content-Type': mimeType },
      );

      // Путь `/<bucket>/<key>` без хоста — в том же формате, что хранится в File.path
      return {
        url: `/${this.bucketName}/${key}`,
        key,
        size: fileBuffer.length,
        etag: result.etag,
      };
    } catch (e) {
      throw new Error(e);
    }
  }

  /**
   * Разбирает ZIP-пакет выставки (iSpring) без загрузки: файлы с путями
   * относительно корня пакета. Если всё лежит в одной папке — она отбрасывается.
   * Служебный мусор архиваторов (`__MACOSX`, `.DS_Store`) и пути с `..` пропускаются.
   */
  readExhibitionZip(zipBuffer: Buffer) {
    const entries = new AdmZip(zipBuffer)
      .getEntries()
      .filter((entry) => !entry.isDirectory)
      .map((entry) => ({ entry, name: entry.entryName.replace(/\\/g, '/') }))
      .filter(
        ({ name }) =>
          !name.startsWith('__MACOSX/') &&
          !name.endsWith('.DS_Store') &&
          !name.split('/').includes('..'),
      );

    const firstSegments = new Set(
      entries.map(({ name }) => name.split('/')[0]),
    );
    const [onlySegment] = firstSegments;
    const rootFolder =
      firstSegments.size === 1 &&
      entries.every(({ name }) => name.includes('/'))
        ? `${onlySegment}/`
        : '';

    return entries.map(({ entry, name }) => ({
      path: name.slice(rootFolder.length),
      getData: () => entry.getData(),
    }));
  }

  async uploadExhibition(
    files: ReturnType<MinioService['readExhibitionZip']>,
    baseMinioPath: string,
  ) {
    // Пакет из сотен файлов — грузим порциями, чтобы не открыть сотни соединений разом
    const CONCURRENCY = 8;
    for (let i = 0; i < files.length; i += CONCURRENCY) {
      await Promise.all(
        files.slice(i, i + CONCURRENCY).map(async (file) => {
          const buffer = file.getData();
          await this.minioClient.putObject(
            this.bucketName,
            `${baseMinioPath}/${file.path}`,
            buffer,
            buffer.length,
            { 'Content-Type': this.getContentType(file.path) },
          );
        }),
      );
    }

    return {
      totalFiles: files.length,
      mainHtmlPath: `/${this.bucketName}${baseMinioPath}/index.html`,
    };
  }

  /**
   * Кладёт объект по заданному ключу — всегда в бакет сервиса (MINIO_BUCKET_NAME).
   * Используется для уменьшенных копий картинок. Возвращает путь `/<bucket>/<key>`,
   * в том же формате, что хранится в File.path.
   */
  async putObjectAt(key: string, buffer: Buffer, contentType: string) {
    await this.minioClient.putObject(
      this.bucketName,
      key,
      buffer,
      buffer.length,
      { 'Content-Type': contentType },
    );
    return `/${this.bucketName}/${key}`;
  }

  /**
   * Читает объект по пути из File.path (`/<bucket>/<key>`). Только чтение —
   * исходные файлы (в т.ч. бакет старого сайта `site`) не изменяются.
   */
  async getObjectByPath(path: string): Promise<Buffer> {
    const [bucket, ...keyParts] = path.replace(/^\/+/, '').split('/');
    const stream = await this.minioClient.getObject(bucket, keyParts.join('/'));

    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks);
  }

  /** Лежит ли путь из File.path в бакете сервиса (в бакет `site` писать нельзя) */
  isOwnPath(path: string) {
    return path.replace(/^\/+/, '').split('/')[0] === this.bucketName;
  }

  /** Удаляет объект по пути из File.path — только из бакета сервиса */
  async removeByPath(path: string) {
    if (!this.isOwnPath(path)) {
      throw new Error(`Файл ${path} лежит вне бакета ${this.bucketName}`);
    }
    const key = path.replace(/^\/+/, '').split('/').slice(1).join('/');
    await this.minioClient.removeObject(this.bucketName, key);
  }

  private getContentType(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop() || '';

    const mimeTypes: Record<string, string> = {
      // HTML
      html: 'text/html',
      htm: 'text/html',

      // CSS
      css: 'text/css',

      // JavaScript
      js: 'application/javascript',
      mjs: 'application/javascript',

      // JSON
      json: 'application/json',

      // Изображения
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
      webp: 'image/webp',
      bmp: 'image/bmp',
      tiff: 'image/tiff',

      // Шрифты
      woff: 'font/woff',
      woff2: 'font/woff2',
      ttf: 'font/ttf',
      otf: 'font/otf',
      eot: 'application/vnd.ms-fontobject',

      // Медиа
      mp3: 'audio/mpeg',
      mp4: 'video/mp4',
      webm: 'video/webm',
      ogg: 'audio/ogg',
      ogv: 'video/ogg',

      // Документы
      pdf: 'application/pdf',
      txt: 'text/plain',
      xml: 'application/xml',
      csv: 'text/csv',

      // Архивы
      zip: 'application/zip',
      gz: 'application/gzip',
      rar: 'application/vnd.rar',

      // Другое
      wasm: 'application/wasm',
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  private generateFilePath(originalName: string, type: string = 'images') {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const fileExtension = originalName.split('.').pop() || 'webp';

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileName = `${uniqueSuffix}.${fileExtension}`;

    return `${type}/${year}/${month}/${day}/${fileName}`;
  }
}
