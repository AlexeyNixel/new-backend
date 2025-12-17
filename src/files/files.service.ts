import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ImageProcessingService } from '../common/services/image-processing.service';
import { MinioService } from '../common/services/minio.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { v4 } from 'uuid';

export interface UploadImageResult {
  url: string;
  key: string;
  size: number;
  width?: number;
  height?: number;
  etag: string;
}

export interface UploadZipResult {
  totalFiles: number;
  uploadedFiles: number;
  skippedFiles: number;
  failedFiles: number;
  results: Array<{
    originalPath: string;
    minioKey: string;
    url: string;
    size: number;
    success: boolean;
    skipped?: boolean;
    error?: string;
  }>;
}

@Injectable()
export class FilesService {
  constructor(
    @InjectDataSource('sourceDB')
    private readonly sourceDB: DataSource,
    private prismaService: PrismaService,
    private imageProcessing: ImageProcessingService,
    private minioService: MinioService,
    private configServices: ConfigService,
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
      console.log(error);
    }
  }

  async uploadExhibition(file: Express.Multer.File) {
    const id = v4();
    const fileName = file.originalname.split('.')[0];
    const baseMinioPath = `/exhibitions/${fileName}`;

    try {
      const result = await this.minioService.uploadExhibition(
        file.buffer,
        baseMinioPath,
      );

      if (result && result.mainHtmlPath) {
        return await this.prismaService.file.create({
          data: {
            id: id,
            originalName: file.originalname,
            mimeType: 'text/html',
            path: result.mainHtmlPath,
            type: 'EXHIBITION',
            size: file.size,
            width: 0,
            height: 0,
          },
        });
      }
    } catch (error) {
      throw new Error(error);
    }
  }

  async uploadDocument(file: Express.Multer.File) {
    const hash = this.generateHash(file.buffer);

    const findCopy = await this.prismaService.file.findUnique({
      where: {
        hash: hash,
      },
    });

    if (findCopy) {
      return findCopy;
    }

    const result = await this.minioService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      'documents',
    );

    const decodeName = this.decodeFileName(file.originalname);

    const resultWithDimensions = {
      ...result,
      url: result.url.split('10001')[1],
    };

    return this.saveFileToDatabase(
      { ...file, originalname: decodeName },
      resultWithDimensions,
      'DOCUMENT',
    );
  }

  private saveFileToDatabase(
    originalFile: Express.Multer.File,
    result: UploadImageResult,
    type: 'IMAGE' | 'DOCUMENT' = 'IMAGE',
  ) {
    return this.prismaService.file.create({
      data: {
        originalName: originalFile.originalname,
        mimeType: 'image/webp',
        hash: this.generateHash(originalFile.buffer),
        type: type,
        path: result.url,
        size: result.size,
        width: result.width,
        height: result.height,
      },
    });
  }

  private generateHash(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
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

  async migrate() {
    const oldFiles = await this.sourceDB.query('SELECT * from File');

    for (const file of oldFiles) {
      await this.prismaService.file.create({
        data: {
          id: file.id,
          originalName: file.originalName,
          mimeType: file.mimeType,
          hash: file.hash,
          type: file.type,
          path: file.path,
          createdAt: file.createdAt,
          size: 0,
          height: 0,
          width: 0,
        },
      });
    }
  }
}
