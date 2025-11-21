import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { ImageProcessingService } from '../common/services/image-processing.service';
import { MinioService } from '../common/services/minio.service';
import { ConfigService } from '@nestjs/config';
import { FilesController } from './files.controller';

@Module({
  controllers: [FilesController],
  providers: [
    FilesService,
    ImageProcessingService,
    MinioService,
    ConfigService,
  ],
})
export class FilesModule {}
