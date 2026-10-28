import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { ExhibitionsService } from './exhibitions.service';
import { MediaService } from './media.service';
import { ImageProcessingService } from '../common/services/image-processing.service';
import { MinioService } from '../common/services/minio.service';
import { ConfigService } from '@nestjs/config';
import { FilesController } from './files.controller';
import { ResponseService } from '../common/services/response.service';

@Module({
  controllers: [FilesController],
  providers: [
    FilesService,
    ExhibitionsService,
    MediaService,
    ImageProcessingService,
    MinioService,
    ConfigService,
    ResponseService,
  ],
  exports: [FilesService],
})
export class FilesModule {}
