import { Module } from '@nestjs/common';
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';
import { ResponseService } from '../common/services/response.service';

@Module({
  controllers: [TagsController],
  providers: [TagsService, ResponseService],
})
export class TagsModule {}
