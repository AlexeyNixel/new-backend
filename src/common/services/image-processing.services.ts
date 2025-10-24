import { BadRequestException, Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { v4 } from 'uuid';

export interface ImageProcessingOptions {
  quality?: number;
  maxWidth?: number;
}

export interface ProcessedImage {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
}

@Injectable()
export class ImageProcessingService {
  async processImage(
    file: Express.Multer.File,
    options: ImageProcessingOptions = {},
  ): Promise<ProcessedImage> {
    try {
      const { quality = 80, maxWidth = 1920 } = options;

      // Конвертируем в WebP и оптимизируем
      const processedBuffer = await sharp(file.buffer)
        .resize(maxWidth, null, {
          fit: 'inside',
          withoutEnlargement: true, // Не увеличивать если меньше
        })
        .webp({
          quality,
          effort: 6, // Максимальное сжатие
        })
        .toBuffer();

      const metadata = await sharp(processedBuffer).metadata();

      return {
        buffer: processedBuffer,
        originalName: `${v4()}.webp`,
        mimeType: 'image/webp',
        size: processedBuffer.length,
        width: metadata.width,
        height: metadata.height,
      };
    } catch (error) {
      throw new BadRequestException('Failed to process image');
    }
  }

  validateImage(file: Express.Multer.File): void {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('Image size must be less than 10MB');
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported image format');
    }
  }
}
