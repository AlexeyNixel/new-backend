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

/**
 * Ширины уменьшенных копий. Крупные нужны для экранов высокой плотности:
 * карточка 320px на телефоне с DPR 2.6 запрашивает ~840px, слайд — ~1000px.
 */
export const IMAGE_VARIANT_WIDTHS = [400, 800, 1200, 1600];

export interface ImageVariant {
  width: number;
  height: number;
  buffer: Buffer;
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

  /**
   * Уменьшенные копии картинки в WebP для srcset.
   * Создаются ширины меньше исходной (без увеличения). Если исходная не шире
   * самой крупной копии, добавляется ещё WebP-копия в исходном размере —
   * она обычно заметно легче оригинального JPEG/PNG.
   */
  async createVariants(
    source: Buffer,
    widths: number[] = IMAGE_VARIANT_WIDTHS,
    quality = 78,
  ): Promise<ImageVariant[]> {
    const { width: sourceWidth = 0 } = await this.getDimensions(source);

    const targets = widths.filter((w) => w < sourceWidth);
    if (sourceWidth > 0 && sourceWidth <= Math.max(...widths)) {
      targets.push(sourceWidth);
    }

    const variants: ImageVariant[] = [];
    for (const width of targets) {
      const { data, info } = await sharp(source)
        .rotate() // учитываем EXIF-ориентацию, как браузер у оригинала
        .resize(width, null, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality, effort: 4 })
        .toBuffer({ resolveWithObject: true });

      variants.push({ width, height: info.height, buffer: data });
    }

    return variants;
  }

  /** Размеры картинки с учётом EXIF-ориентации (5–8 — поворот на 90°) */
  async getDimensions(source: Buffer) {
    const { width, height, orientation } = await sharp(source).metadata();
    const rotated = orientation !== undefined && orientation >= 5;
    return rotated ? { width: height, height: width } : { width, height };
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
