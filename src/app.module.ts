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
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrismaService } from './prisma.service';
import { MigrationModule } from './migration/migration.module';
import { EventModule } from './event/event.module';
import { PrismaModule } from './prisma.module';
import { BookModule } from './book/book.module';
import { BookCategoryModule } from './book-category/book-category.module';
import { NotificationModule } from './notification/notification.module';
import { PageModule } from './page/page.module';
import { GamesModule } from './games/games.module';
import { AchievementsModule } from './achievements/achievements.module';
import { ClubsModule } from './clubs/clubs.module';
import { MapPointModule } from './map-point/map-point.module';

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
    PrismaModule,
    TypeOrmModule.forRoot({
      name: 'sourceDB',
      type: 'mysql',
      driver: require('mysql2'), // <-- ЭТА СТРОКА КЛЮЧЕВАЯ
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'example',
      database: 'db_noub_new',
      entities: [],
      synchronize: true, // для разработки
    }),
    MigrationModule,
    EventModule,
    BookModule,
    BookCategoryModule,
    NotificationModule,
    PageModule,
    GamesModule,
    AchievementsModule,
    ClubsModule,
    MapPointModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
