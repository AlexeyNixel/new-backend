import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OldTag } from '../tags/dto/old-tag.dto';
import { PrismaService } from '../prisma.service';
import { OldDepartment } from './models/old-department.type';
import { OldPostType } from './models/old-post.type';
import { OldSlide } from './models/old-slide.type';
import { OldPageType } from './models/old-page.type';
import { createSlug } from '../common/utils/slugify.utils';
import { OldEvent } from './models/old-event.type';
import { OldBook } from './models/old-book.type';

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
    const oldFiles = await this.sourceDB.query(
      'SELECT * from File ORDER BY createdAt',
    );
    console.log(oldFiles.length);

    let countOfMigrate = 0;

    for (const file of oldFiles) {
      const copy = await this.prismaService.file.findUnique({
        where: {
          id: file.id,
        },
      });

      if (!copy) {
        console.log(123);
        countOfMigrate++;
        await Promise.all([
          this.prismaService.file.create({
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
          }),
        ]);
      }
    }
    return `Файлов мигрировано: ${countOfMigrate}`;
  }

  async migratePosts() {
    const oldPosts: OldPostType[] = await this.sourceDB.query(
      'SELECT * FROM Entry',
    );

    let countOfMigrate = 0;

    for (const post of oldPosts) {
      const copy = await this.prismaService.post.findUnique({
        where: { id: post.id },
      });
      if (copy) {
        console.log('Пост уже существует');
      } else {
        console.log(post.title);
        console.log(post.fileId);
        const preview = post?.fileId
          ? post.fileId
          : 'aa8c3d9e-f7de-44cc-8391-b6e7f8782ce3';
        countOfMigrate++;
        await this.prismaService.post.create({
          data: {
            id: post.id,
            title: post.title,
            slug: post.slug,
            description: post.desc,
            content: post.content,
            previewFileId: preview,
            publishedAt: post.publishedAt,
            createdAt: post.createdAt,
            isDeleted: !!post.isDeleted,
            departmentId: post.departmentId,
          },
        });
      }
    }
    return `Записей мигрированно: ${countOfMigrate}`;
  }

  async migratePostOnRubric() {
    const data: [{ entryId: string; rubricId: string }] =
      await this.sourceDB.query('SELECT * FROM RubricsOnEntries');

    let countOfMigrate = 0;

    for (const tag of data) {
      const copy = await this.prismaService.tagsOnPosts.findUnique({
        where: {
          postId_tagId: {
            postId: tag.entryId,
            tagId: tag.rubricId,
          },
        },
      });

      if (!copy) {
        countOfMigrate++;
        await this.prismaService.tagsOnPosts.create({
          data: {
            postId: tag.entryId,
            tagId: tag.rubricId,
          },
        });
      }
    }

    return `Связей восстановленно ${countOfMigrate}`;
  }

  async migrateSlides() {
    const data: OldSlide[] = await this.sourceDB.query(
      'SELECT * FROM MainSlider',
    );

    let countOfMigrate = 0;

    for (const item of data) {
      const copy = await this.prismaService.mainSliderSlide.findUnique({
        where: { id: item.id },
      });

      if (copy) {
        console.log('Слайд существует');
      } else {
        countOfMigrate++;
        await this.prismaService.mainSliderSlide.create({
          data: {
            slideOrder: item.position || 0,
            id: item.id,
            postId: item.entryId,
            createdAt: item.createdAt,
            isDeleted: !!item.isDeleted,
            url: item.url,
            imageFileId: item.fileId,
          },
        });
      }
    }
    return `Записей мигрированно: ${countOfMigrate}`;
  }

  async migratePages() {
    const data: OldPageType[] = await this.sourceDB.query(
      'SELECT * FROM Document',
    );

    let countOfMigrate = 0;

    for (const item of data) {
      const copy = await this.prismaService.page.findUnique({
        where: {
          id: item.id,
        },
      });

      if (!copy) {
        countOfMigrate++;
        const newSlug = createSlug(item.title);

        const copySlug = await this.prismaService.page.findUnique({
          where: {
            slug: newSlug,
          },
        });

        if (copySlug) {
          await this.prismaService.page.create({
            data: {
              id: item.id,
              title: item.title,
              content: item.content,
              slug: createSlug(item.title, undefined, true),
              isDeleted: !!item.isDeleted,
            },
          });
        } else {
          await this.prismaService.page.create({
            data: {
              id: item.id,
              title: item.title,
              content: item.content,
              slug: createSlug(item.title),
              isDeleted: !!item.isDeleted,
            },
          });
        }
      }
    }

    return `Страниц созданно ${countOfMigrate}`;
  }

  async migrateEvents() {
    const data: OldEvent[] = await this.sourceDB.query('SELECT * FROM Affiche');

    let countOfMigrate = 0;

    for (const item of data) {
      const copy = await this.prismaService.event.findUnique({
        where: {
          id: item.id,
        },
      });

      if (!copy) {
        countOfMigrate++;
        const { title, age } = this.findAge(item.title);

        const now =
          item.eventDate.toISOString().slice(0, 11) +
          item.eventTime.toString() +
          '.000Z';

        await this.prismaService.event.create({
          data: {
            id: item.id,
            title: title,
            content: item.desc,
            phone: item.phone || '123',
            place: item.eventPlace || 'guest',
            eventTime: now,
            createdAt: now,
            age: age ? +age : undefined,
            isDeleted: !!item.isDeleted,
          },
        });
      }
    }

    return `Событий мигрированно: ${countOfMigrate}`;
  }

  async migrateBooks() {
    const data: OldBook[] = await this.sourceDB.query('SELECT * FROM Book');

    let countOfMigrate = 0;

    for (const item of data) {
      const copy = await this.prismaService.book.findUnique({
        where: {
          id: item.id,
        },
      });

      if (!copy) {
        countOfMigrate++;

        await this.prismaService.book.create({
          data: {
            id: item.id,
            title: item.title,
            description: item.desc,
            content: item.content,
            isDeleted: !!item.isDeleted,
            createdAt: item.createdAt,
            place: item?.storagePlace || 'НОМБ',
            litresLink: item?.link,
            isVideo: !!item.isVideo,
            slug: createSlug(item.title),
          },
        });
        await this.prismaService.book.update({
          where: {
            id: item.id,
          },
          data: {
            previewFileId: item.fileId,
          },
        });
      }
    }

    return `Книг мигрировано: ${countOfMigrate}`;
  }

  private findAge(text: string) {
    const match = text.match(/\((\d+)/);
    const cleanTitle = text.replace(/\s*\([^)]+\)\s*$/, '').trim();
    const age = match ? match[1] : null;
    return {
      title: cleanTitle,
      age: age,
    };
  }
}
