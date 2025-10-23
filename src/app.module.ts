import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { PostsModule } from './posts/posts.module';
import { DepartmentsModule } from './departments/departments.module';
import { TagsModule } from './tags/tags.module';

@Module({
  imports: [ConfigModule.forRoot(), UserModule, PostsModule, DepartmentsModule, TagsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
