import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { ResponseService } from '../common/services/response.service';
import { DataSource } from 'typeorm';

@Module({
  controllers: [PostsController],
  providers: [PostsService, ResponseService],
})
export class PostsModule {}
