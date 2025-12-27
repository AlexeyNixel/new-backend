import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OldTag } from '../tags/dto/old-tag.dto';
import { PrismaService } from '../prisma.service';
import { OldDepartment } from './models/old-department.type';

@Injectable()
export class MigrationService {
  constructor(
    @InjectDataSource('sourceDB')
    private readonly sourceDB: DataSource,
    private prismaService: PrismaService,
  ) {}

  async migrateTag() {
    const oldTags: OldTag[] = await this.sourceDB.query('SELECT * FROM Rubric');
    let countOfMigrate = 0;

    for (const tag of oldTags) {
      const copy = await this.prismaService.tag.findUnique({
        where: { id: tag.id },
      });

      if (copy) {
        console.log('Тэг уже существует');
      } else {
        countOfMigrate++;
        await this.prismaService.tag.create({
          data: {
            id: tag.id,
            title: tag.title,
            slug: tag.slug,
          },
        });
      }
    }

    return `Записей мигрированно: ${countOfMigrate}`;
  }

  async migrateDepartments() {
    const oldDepartments: OldDepartment[] = await this.sourceDB.query(
      'SELECT * FROM Department',
    );
    let countOfMigrate = 0;

    for (const department of oldDepartments) {
      const copy = await this.prismaService.department.findUnique({
        where: { id: department.id },
      });

      if (copy) {
        console.log('Отдел уже существует');
      } else {
        countOfMigrate++;
        await this.prismaService.department.create({
          data: {
            id: department.id,
            title: department.title,
            slug: department.slug,
            isDeleted: !!department.isDeleted,
            previewFileId: department.fileId,
          },
        });
      }
    }

    return `Записей мигрированно: ${countOfMigrate}`;
  }

  async migrateFiles() {
    const oldFiles = await this.sourceDB.query('SELECT * from File');

    for (const file of oldFiles) {
      await this.prismaService.file.create({
        data: {
          id: file.id,
          originalName: file.originalName,
          mimeType: file.mimeType,
          hash: file.hash,
          type: file.type,
          path: file.path,
          createdAt: file.createdAt,
          size: 0,
          height: 0,
          width: 0,
        },
      });
    }
  }

  // async migratePosts
}
