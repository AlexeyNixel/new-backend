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
      port: this.configServices.get('MINIO_PORT') || undefined,
      useSSL: false,
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
        {
          contentType: mimeType,
        },
      );

      const url = await this.minioClient.presignedUrl(
        'GET',
        this.bucketName,
        key,
      );

      const cleanUrl = url.split('?')[0];

      return {
        url: cleanUrl,
        key,
        size: fileBuffer.length,
        etag: result.etag,
      };
    } catch (e) {
      throw new Error(e);
    }
  }

  async uploadExhibition(zipBuffer: Buffer, baseMinioPath: string) {
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();
    const fileEntries = zipEntries.filter((entry) => !entry.isDirectory);

    let mainHtmlPath: string | undefined;

    const rootFolders = new Set(
      zipEntries
        .filter((entry) => entry.isDirectory)
        .map((entry) => entry.entryName.split('/')[0])
        .filter(Boolean),
    );

    const rootFolder = rootFolders.size === 1 ? Array.from(rootFolders)[0] : '';

    const uploadPromises = fileEntries.map(async (entry) => {
      try {
        const fileBuffer = entry.getData();
        const contentType = this.getContentType(entry.entryName);
        const isIndexHtml = entry.entryName
          .toLowerCase()
          .endsWith('index.html');

        let minioKey = `${baseMinioPath}/${entry.entryName}`;

        if (rootFolder && entry.entryName.startsWith(`${rootFolder}/`)) {
          minioKey = `${baseMinioPath}/${entry.entryName.substring(rootFolder.length + 1)}`;
        }

        if (isIndexHtml) {
          mainHtmlPath = minioKey;
        }

        await this.minioClient.putObject(
          this.bucketName,
          minioKey,
          fileBuffer,
          fileBuffer.length,
          { 'Content-Type': contentType },
        );

        return { success: true, entryName: entry.entryName };
      } catch (error) {
        throw new Error(error);
      }
    });

    await Promise.all(uploadPromises);

    return {
      totalFiles: fileEntries.length,
      mainHtmlPath: `/${this.bucketName}${mainHtmlPath}`,
    };
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
