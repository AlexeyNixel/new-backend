import { Module } from '@nestjs/common';
import { PodcastsService } from './podcasts.service';
import { PodcastsController } from './podcasts.controller';
import { ResponseService } from '../common/services/response.service';

@Module({
  controllers: [PodcastsController],
  providers: [PodcastsService, ResponseService],
})
export class PodcastsModule {}
