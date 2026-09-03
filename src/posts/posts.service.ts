import { Injectable } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PrismaService } from '../prisma.service';
import { Prisma } from 'generated/prisma';
import { v4 } from 'uuid';
import { createSlug } from '../common/utils/slugify.utils';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ResponseService } from '../common/services/response.service';
import { createInclude } from '../common/utils/include.utils';
import { parseSlug } from '../common/utils/validate.utils';
import { toBooleanFulltextQuery } from './utils/fulltext-query';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OldPost } from './dto/old-post.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectDataSource('sourceDB')
    private readonly sourceDB: DataSource,

    private prismaService: PrismaService,
    private responseService: ResponseService,
  ) {}

  private async findCopy(idOrSlug: string) {
    const copy = await this.prismaService.post.findUnique({
      where: {
        ...parseSlug(idOrSlug),
      },
    });

    if (copy) {
      return {
        message:
          'Данный слаг уже занят, поменяйте название или укажите слаг в ручную',
      };
    }
  }

  async create(createPostDto: CreatePostDto) {
    const { tags, ...newPost } = createPostDto;

    newPost.slug = createSlug(newPost.title, newPost.slug);

    const isCopy = await this.findCopy(newPost.slug);

    if (isCopy) {
      return isCopy;
    }

    const post = await this.prismaService.post.create({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-expect-error
      data: {
        id: v4(),
        ...newPost,
      },
    });

    if (tags) {
      for (const tag of tags) {
        await this.prismaService.tagsOnPosts.create({
          data: {
            postId: post.id,
            tagId: tag,
          },
        });
      }
    }

    return post;
  }

  async findAll(paginationQuery: PaginationQueryDto, includeQuery: string) {
    const {
      page = 1,
      limit = 10,
      isDeleted,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
      search = '',
      tags = [],
      startDate,
      endDate,
      department,
    } = paginationQuery;

    let newTagsArray: string[] = [];

    if (typeof tags === 'string') {
      newTagsArray = [tags];
    } else if (typeof tags === 'object') {
      newTagsArray.push(...tags);
    }

    const skip = (page - 1) * limit;
    const include = createInclude(includeQuery) as
      | Prisma.PostInclude
      | undefined;
    const includeArg: Prisma.PostInclude = include?.tags
      ? {
          ...include,
          tags: { select: { tag: { select: { id: true, title: true } } } },
        }
      : { ...include };

    // Полнотекстовый поиск: по title + description + очищенному от HTML телу
    // (contentText). Порядок выдачи — по дате публикации (сначала новые), как и
    // в обычном списке. Если осмысленных слов в запросе нет — поиск не
    // применяется, отдаём обычный список.
    const booleanQuery = toBooleanFulltextQuery(search);

    if (booleanQuery) {
      const { ids, total } = await this.searchPostIds({
        booleanQuery,
        isDeleted,
        department,
        startDate,
        endDate,
        tagIds: newTagsArray,
        skip,
        take: +limit,
      });

      if (ids.length === 0) {
        return this.responseService.paginated([], total, page, limit);
      }

      const rows = await this.prismaService.post.findMany({
        where: { id: { in: ids } },
        include: includeArg,
      });
      const byId = new Map(rows.map((post) => [post.id, post]));
      const posts = ids
        .map((id) => byId.get(id))
        .filter((post): post is (typeof rows)[number] => Boolean(post));

      return this.responseService.paginated(posts, total, page, limit);
    }

    const whereParams = {
      publishedAt: {
        gte: startDate,
        lte: endDate,
      },
      departmentId: department,
      isDeleted: isDeleted ? undefined : false,

      AND: newTagsArray.map((tag) => ({
        tags: {
          some: {
            tag: {
              id: tag,
            },
          },
        },
      })),
    };

    const [posts, total] = await Promise.all([
      this.prismaService.post.findMany({
        where: {
          ...whereParams,
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: skip,
        take: +limit,
        include: includeArg,
      }),

      this.prismaService.post.count({
        where: { ...whereParams },
      }),
    ]);

    return this.responseService.paginated(posts, total, page, limit);
  }

  /**
   * Ищет id новостей по полнотекстовому индексу. Фильтры (удалённость, отдел,
   * даты, теги) применяются тем же SQL-запросом. Возвращает страницу id,
   * отсортированную по дате публикации (сначала новые), и число совпадений.
   */
  private async searchPostIds(params: {
    booleanQuery: string;
    isDeleted?: boolean;
    department?: string;
    startDate?: string;
    endDate?: string;
    tagIds: string[];
    skip: number;
    take: number;
  }): Promise<{ ids: string[]; total: number }> {
    const {
      booleanQuery,
      isDeleted,
      department,
      startDate,
      endDate,
      tagIds,
      skip,
      take,
    } = params;

    const conditions: string[] = [];
    const conditionParams: unknown[] = [];

    if (!isDeleted) {
      conditions.push('p.isDeleted = false');
    }
    if (department) {
      conditions.push('p.departmentId = ?');
      conditionParams.push(department);
    }
    if (startDate) {
      conditions.push('p.publishedAt >= ?');
      conditionParams.push(startDate);
    }
    if (endDate) {
      conditions.push('p.publishedAt <= ?');
      conditionParams.push(endDate);
    }
    for (const tagId of tagIds) {
      conditions.push(
        'EXISTS (SELECT 1 FROM tags_on_posts t WHERE t.postId = p.id AND t.tagId = ?)',
      );
      conditionParams.push(tagId);
    }

    const whereExtra = conditions.length
      ? ` AND ${conditions.join(' AND ')}`
      : '';
    const matchExpr =
      'MATCH(p.title, p.description, p.contentText) AGAINST(? IN BOOLEAN MODE)';

    const rows = await this.prismaService.$queryRawUnsafe<
      Array<{ id: string }>
    >(
      `SELECT p.id
         FROM posts p
        WHERE ${matchExpr}${whereExtra}
        ORDER BY p.publishedAt DESC, p.id
        LIMIT ? OFFSET ?`,
      booleanQuery,
      ...conditionParams,
      take,
      skip,
    );

    const countRows = await this.prismaService.$queryRawUnsafe<
      Array<{ total: bigint }>
    >(
      `SELECT COUNT(*) AS total
         FROM posts p
        WHERE ${matchExpr}${whereExtra}`,
      booleanQuery,
      ...conditionParams,
    );

    return {
      ids: rows.map((row) => row.id),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async findOne(id: string) {
    const post = await this.prismaService.post.findUnique({
      where: {
        ...parseSlug(id),
      },
      include: {
        preview: true,
        department: true,
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!post) {
      return {
        message: `Пост по slug или id '${id}' не найден`,
      };
    }

    return {
      ...post,
      tags: post.tags.map((tagRelation) => ({
        id: tagRelation.tag.id,
        label: tagRelation.tag.title,
      })),
    };
  }

  async update(id: string, updatePostDto: UpdatePostDto) {
    const post = await this.prismaService.post.findUnique({
      where: {
        ...parseSlug(id),
      },
    });

    if (post && updatePostDto.previewFileId === post.previewFileId) {
      delete updatePostDto.previewFileId;
    }

    if (post && updatePostDto.tags) {
      await this.prismaService.tagsOnPosts.deleteMany({
        where: {
          postId: post.id,
        },
      });

      if (updatePostDto.tags.length > 0) {
        const tagsData = updatePostDto.tags.map((tagId) => ({
          tagId: tagId,
          postId: post.id,
        }));

        await this.prismaService.tagsOnPosts.createMany({
          data: tagsData,
          skipDuplicates: true,
        });
      }
    }
    const { tags, ...updateData } = updatePostDto;
    updatePostDto = updateData as UpdatePostDto;

    if (!updatePostDto.slug?.length) {
      updatePostDto.slug = undefined;
    }

    return this.prismaService.post.update({
      where: {
        ...parseSlug(id),
      },
      include: {
        tags: true,
        preview: true,
        department: true,
      },
      data: {
        ...updateData,
      },
    });
  }

  // previewFileId по умолчанию, если у записи нет своего файла-превью.
  // Должен существовать в таблице files целевой БД (иначе — нарушение внешнего ключа).
  private static readonly DEFAULT_PREVIEW_FILE_ID =
    'aa8c3d9e-f7de-44cc-8391-b6e7f8782ce3';

  async migratePosts() {
    const oldPost: OldPost[] = await this.sourceDB.query('SELECT * FROM Entry');

    let migrated = 0;
    let skipped = 0;
    const errors: Array<{ id: string; slug: string; error: string }> = [];

    for (const post of oldPost) {
      try {
        const existing = await this.prismaService.post.findUnique({
          where: { id: post.id },
        });

        if (existing) {
          skipped++;
          continue;
        }

        const previewFileExists =
          !!post.fileId &&
          !!(await this.prismaService.file.findUnique({
            where: { id: post.fileId },
          }));

        await this.prismaService.post.create({
          data: {
            id: post.id,
            title: post.title,
            description: post.desc,
            content: post.content,
            previewFileId: previewFileExists
              ? post.fileId
              : PostsService.DEFAULT_PREVIEW_FILE_ID,
            slug: post.slug,
            isPublished: true,
            isDeleted: !!post.isDeleted,
            departmentId: post.departmentId,
            isPinned: !!post.pinned,
            publishedAt: post.publishedAt,
            createdAt: post.createdAt,
          },
        });
        migrated++;
      } catch (e) {
        errors.push({
          id: post.id,
          slug: post.slug,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return {
      total: oldPost.length,
      migrated,
      skipped,
      failed: errors.length,
      errors,
    };
  }

  async migratePostOnRubric() {
    const data = await this.sourceDB.query('SELECT * FROM RubricsOnEntries');
    console.log(data);
    for (const tag of data) {
      await this.prismaService.tagsOnPosts.create({
        data: {
          postId: tag.entryId,
          tagId: tag.rubricId,
        },
      });
    }
  }

  remove(id: number) {
    return `This action removes a #${id} post`;
  }
}
