import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { PrismaService } from '../prisma.service';
import { ImageProcessingService } from '../common/services/image-processing.service';
import { MinioService } from '../common/services/minio.service';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [FilesController],
  providers: [
    FilesService,
    PrismaService,
    ImageProcessingService,
    MinioService,
    ConfigService,
  ],
})
export class FilesModule {}
