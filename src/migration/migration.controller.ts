import { Controller, Get, UseGuards } from '@nestjs/common';
import { MigrationService } from './migration.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('migration')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @UseGuards(JwtAuthGuard)
  @Get('tag')
  migrateTag() {
    return this.migrationService.migrateTag();
  }

  @UseGuards(JwtAuthGuard)
  @Get('department')
  migrateDepartment() {
    return this.migrationService.migrateDepartments();
  }

  @UseGuards(JwtAuthGuard)
  @Get('files')
  migrateFiles() {
    return this.migrationService.migrateFiles();
  }
  @UseGuards(JwtAuthGuard)
  @Get('posts')
  migratePosts() {
    return this.migrationService.migratePosts();
  }

  @UseGuards(JwtAuthGuard)
  @Get('tagonpost')
  migrateTagsOnPost() {
    return this.migrationService.migratePostOnRubric();
  }

  @UseGuards(JwtAuthGuard)
  @Get('slides')
  migrateSlides() {
    return this.migrationService.migrateSlides();
  }
  @UseGuards(JwtAuthGuard)
  @Get('pages')
  migratePages() {
    return this.migrationService.migratePages();
  }

  @UseGuards(JwtAuthGuard)
  @Get('events')
  migrateEvents() {
    return this.migrationService.migrateEvents();
  }

  @UseGuards(JwtAuthGuard)
  @Get('book')
  migrateBooks() {
    return this.migrationService.migrateBooks();
  }

  @UseGuards(JwtAuthGuard)
  @Get('all')
  async migrateAllModel() {
    const [
      tag,
      department,
      file,
      posts,
      postOnRubric,
      slide,
      pages,
      event,
      book,
    ] = [
      await this.migrationService.migrateTag(),
      await this.migrationService.migrateDepartments(),
      await this.migrationService.migrateFiles(),
      await this.migrationService.migratePosts(),
      await this.migrationService.migratePostOnRubric(),
      await this.migrationService.migrateSlides(),
      await this.migrationService.migratePages(),
      await this.migrationService.migrateEvents(),
      await this.migrationService.migrateBooks(),
    ];
    return {
      tag,
      department,
      file,
      posts,
      postOnRubric,
      slide,
      pages,
      event,
      book,
    };
  }
}
