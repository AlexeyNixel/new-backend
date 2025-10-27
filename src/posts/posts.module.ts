import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { PrismaService } from '../prisma.service';
import { ResponseService } from '../common/services/response.service';

@Module({
  controllers: [PostsController],
  providers: [PostsService, PrismaService, ResponseService],
})
export class PostsModule {}
