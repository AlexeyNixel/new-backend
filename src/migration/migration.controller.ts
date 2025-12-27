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
}
