import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ImageProcessingService } from '../common/services/image-processing.services';
import { MinioService } from '../common/services/minio.service';

export interface UploadImageResult {
  url: string;
  key: string;
  size: number;
  width?: number;
  height?: number;
  etag: string;
}

@Injectable()
export class FilesService {
  constructor(
    private prismaService: PrismaService,
    private imageProcessing: ImageProcessingService,
    private minioService: MinioService,
  ) {}

  async uploadImage(
    file: Express.Multer.File,
    options: {
      quality?: number;
      maxWidth?: number;
    } = {},
  ) {
    const { quality = 80, maxWidth = 1920 } = options;

    // Валидация файла
    this.imageProcessing.validateImage(file);

    try {
      const fileHash = this.generateHash(file.buffer);

      const existingFile = await this.prismaService.file.findUnique({
        where: { hash: fileHash },
      });

      if (existingFile) {
        return existingFile;
      }

      const processedImage = await this.imageProcessing.processImage(file, {
        quality,
        maxWidth,
      });

      const uploadResult = await this.minioService.uploadFile(
        processedImage.buffer,
        processedImage.originalName,
        processedImage.mimeType,
      );

      const resultWithDimensions = {
        ...uploadResult,
        width: processedImage.width,
        height: processedImage.height,
      };

      // Сохраняем информацию о файле в базу данных
      await this.saveFileToDatabase(file, resultWithDimensions);

      return resultWithDimensions;
    } catch (error) {
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
  }

  private async saveFileToDatabase(
    originalFile: Express.Multer.File,
    result: UploadImageResult,
  ): Promise<void> {
    await this.prismaService.file.create({
      data: {
        originalName: originalFile.originalname,
        mimeType: 'image/webp',
        hash: this.generateHash(originalFile.buffer),
        type: 'IMAGE',
        path: result.url,
        size: result.size,
        width: result.width,
        height: result.height,
      },
    });
  }

  private generateHash(buffer: Buffer): string {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return require('crypto').createHash('md5').update(buffer).digest('hex');
  }
}
