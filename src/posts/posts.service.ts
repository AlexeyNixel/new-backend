import { Injectable } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PrismaService } from '../prisma.service';
import { v4 } from 'uuid';
import { createSlug } from '../common/utils/slugify.utils';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ResponseService } from '../common/services/response.service';
import { createInclude } from '../common/utils/include.utils';
import { parseSlug } from '../common/utils/validate.utils';
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
    } = paginationQuery;

    const skip = (page - 1) * limit;
    const include = createInclude(includeQuery);

    const whereParams = {
      isDeleted: isDeleted ? undefined : false,
      OR: [
        {
          title: { contains: search },
          content: { contains: search },
        },
      ],
    };

    const [posts, total] = await Promise.all([
      this.prismaService.post.findMany({
        where: { ...whereParams },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: skip,
        take: +limit,
        include: {
          ...include,
        },
      }),

      this.prismaService.post.count({
        where: { ...whereParams },
      }),
    ]);

    return this.responseService.paginated(posts, total, page, limit);
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
    console.log(updatePostDto);
    if (post && updatePostDto.previewFileId === post.previewFileId) {
      console.log(updatePostDto);
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
        ...(updatePostDto as any),
      },
    });
  }

  async migratePosts() {
    const oldPost: OldPost[] = await this.sourceDB.query('SELECT * FROM Entry');
    //@ts-ignore
    const errors: oldPost[] = [];

    for (const post of oldPost) {
      try {
        await this.prismaService.post.create({
          data: {
            id: post.id,
            title: post.title,
            description: post.desc,
            content: post.content,
            previewFileId: post.fileId,
            createdAt: post.createdAt,
            slug: post.slug,
            isPublished: true,
            isDeleted: !!post.isDeleted,
            departmentId: post.departmentId,
            isPinned: !!post.pinned,
          },
        });
      } catch (e) {
        throw new Error(e);
        errors.push(post);
      }
    }

    return errors;
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
