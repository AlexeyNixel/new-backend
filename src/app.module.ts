import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
    TypeOrmModule.forRootAsync({
      name: 'sourceDB',
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('SOURCE_DB_HOST'),
        port: config.get('SOURCE_DB_PORT'),
        username: config.get('SOURCE_DB_USERNAME'),
        password: config.get('SOURCE_DB_PASSWORD'),
        database: config.get('SOURCE_DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: true,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      name: 'targetDB',
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('TARGET_DB_HOST'),
        port: config.get('TARGET_DB_PORT'),
        username: config.get('TARGET_DB_USERNAME'),
        password: config.get('TARGET_DB_PASSWORD'),
        database: config.get('TARGET_DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: true,
      }),
      inject: [ConfigService],
    }),
    MigrationModule,
    EventModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
