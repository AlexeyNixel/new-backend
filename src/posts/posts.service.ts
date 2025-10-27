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

@Injectable()
export class PostsService {
  constructor(
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
    } = paginationQuery;

    const skip = (page - 1) * limit;
    const include = createInclude(includeQuery);

    const [posts, total] = await Promise.all([
      this.prismaService.post.findMany({
        where: { isDeleted: isDeleted ? undefined : false },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: skip,
        take: +limit,
        include: {
          ...include,
        },
      }),

      this.prismaService.post.count(),
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

  remove(id: number) {
    return `This action removes a #${id} post`;
  }
}
