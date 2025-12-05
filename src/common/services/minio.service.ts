import { BadRequestException, Injectable } from '@nestjs/common';
import * as Minio from 'minio';
import { ConfigService } from '@nestjs/config';

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

  private generateFilePath(originalName: string) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const fileExtension = originalName.split('.').pop() || 'webp';

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileName = `${uniqueSuffix}.${fileExtension}`;

    return `images/${year}/${month}/${day}/${fileName}`;
  }

  async uploadFile(fileBuffer: Buffer, originalName: string, mimeType: string) {
    try {
      const key = this.generateFilePath(originalName);

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
      throw new BadRequestException(`Не удалось загрузить файл: ${e.message}`);
    }
  }
}
