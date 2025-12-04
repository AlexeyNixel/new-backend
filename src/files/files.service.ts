import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ImageProcessingService } from '../common/services/image-processing.service';
import { MinioService } from '../common/services/minio.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OldFile } from './dto/old-file.dto';

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
    @InjectDataSource('sourceDB')
    private readonly sourceDB: DataSource,
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

    const decodedOriginalName = this.decodeFileName(file.originalname);

    this.imageProcessing.validateImage(file);

    try {
      const fileHash = this.generateHash(file.buffer);

      const existingFile = await this.prismaService.file.findUnique({
        where: { hash: fileHash },
      });

      if (existingFile) {
        return existingFile;
      }

      const processedImage = await this.imageProcessing.processImage(
        { ...file, originalname: decodedOriginalName },
        {
          quality,
          maxWidth,
        },
      );

      const uploadResult = await this.minioService.uploadFile(
        processedImage.buffer,
        processedImage.originalName,
        processedImage.mimeType,
      );

      const resultWithDimensions = {
        ...uploadResult,
        url: uploadResult.url.split('10001')[1],
        width: processedImage.width,
        height: processedImage.height,
      };

      return await this.saveFileToDatabase(
        {
          ...file,
          originalname: decodedOriginalName,
        },
        resultWithDimensions,
      );
    } catch (error) {
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
  }

  private saveFileToDatabase(
    originalFile: Express.Multer.File,
    result: UploadImageResult,
  ) {
    return this.prismaService.file.create({
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

  async migrateTag() {
    const oldTags: OldFile[] = await this.sourceDB.query('SELECT * FROM File');
    const counter = {
      success: 0,
      error: 0,
    };

    for (const tag of oldTags) {
      try {
        await this.prismaService.file.create({
          data: {
            id: tag.id,
            originalName: tag.originalName,
            hash: undefined,
            type: tag.type,
            path: tag.path,
            mimeType: tag.mimeType,
            size: 1,
            createdAt: tag.createdAt,
          },
        });
        counter.success += 1;
      } catch {
        counter.error += 1;
      }
    }
    return counter;
  }

  private decodeFileName(filename: string) {
    const decoded = Buffer.from(filename, 'latin1').toString('utf8');
    const hasGarbage = /Ð|Ñ||/.test(filename);

    if (hasGarbage && decoded !== filename) {
      return decoded;
    } else {
      return filename;
    }
  }
}
