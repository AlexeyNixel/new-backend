import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { PostsModule } from './posts/posts.module';
import { DepartmentsModule } from './departments/departments.module';
import { TagsModule } from './tags/tags.module';
import { FilesModule } from './files/files.module';
import { MainSliderModule } from './main-slider/main-slider.module';
import { NavigationItemModule } from './navigation-item/navigation-item.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    UserModule,
    PostsModule,
    DepartmentsModule,
    TagsModule,
    FilesModule,
    MainSliderModule,
    NavigationItemModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
