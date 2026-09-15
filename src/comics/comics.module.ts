import { Module } from '@nestjs/common';
import { ComicsService } from './comics.service';
import { ComicsController } from './comics.controller';
import { ResponseService } from '../common/services/response.service';

@Module({
  controllers: [ComicsController],
  providers: [ComicsService, ResponseService],
})
export class ComicsModule {}
