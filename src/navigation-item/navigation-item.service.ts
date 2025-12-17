import { Injectable } from '@nestjs/common';
import { CreateNavigationItemDto } from './dto/create-navigation-item.dto';
import { UpdateNavigationItemDto } from './dto/update-navigation-item.dto';
import { PrismaService } from '../prisma.service';
import { createSlug } from '../common/utils/slugify.utils';

export interface NavigationTree {
  id: string;
  title: string;
  url?: string;
  slug: string;
  icon?: string;
  order: number;
  isActive: boolean;
  children?: NavigationTree[];
}

@Injectable()
export class NavigationItemService {
  constructor(private prismaService: PrismaService) {}
  create(createNavigationItemDto: CreateNavigationItemDto) {
    createNavigationItemDto.slug = createSlug(
      createNavigationItemDto?.title,
      createNavigationItemDto.slug,
    );

    if (!createNavigationItemDto?.to) {
      createNavigationItemDto.to = '/page/' + createNavigationItemDto.slug;
    }

    return this.prismaService.navigationItem.create({
      data: {
        ...createNavigationItemDto,
      },
    });
  }

  async findAll() {
    const items = await this.prismaService.navigationItem.findMany({
      orderBy: {
        order: 'asc',
      },
      select: {
        id: true,
        title: true,
        description: true,
        children: true,
        icon: true,
        order: true,
        isExternal: true,
        target: true,
        to: true,
        parentId: true,
      },
    });
    return this.buildTree(items);
  }

  async updateOrderBatch(updates: Array<{ id: string; order: number }>) {
    return this.prismaService.$transaction(async (tx) => {
      const updatePromises = updates.map(({ id, order }) =>
        tx.navigationItem.update({
          where: { id },
          data: { order },
        }),
      );

      return await Promise.all(updatePromises);
    });
  }

  findAllWithoutTree() {
    return this.prismaService.navigationItem.findMany();
  }

  findOne(id: number) {
    return `This action returns a #${id} navigationItem`;
  }

  update(id: string, updateNavigationItemDto: UpdateNavigationItemDto) {
    return this.prismaService.navigationItem.update({
      where: {
        id: id,
      },
      data: {
        ...updateNavigationItemDto,
      },
    });
  }

  async updateTo() {
    const items = await this.prismaService.navigationItem.findMany();

    for (const item of items) {
      if (!item.to || item.to.length <= 1) {
        await this.prismaService.navigationItem.update({
          where: { id: item.id },
          data: {
            to: '/page/' + item.slug,
          },
        });
      }
    }
    return 'success';
  }

  remove(id: number) {
    return `This action removes a #${id} navigationItem`;
  }

  private buildTree(items: any[]): NavigationTree[] {
    const itemMap = new Map();
    const tree: NavigationTree[] = [];

    // Создаем хэш-таблицу
    items.forEach((item) => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    // Строим дерево
    items.forEach((item) => {
      if (item.parentId) {
        const parent = itemMap.get(item.parentId);
        if (parent) {
          parent.children.push(itemMap.get(item.id));
        }
      } else {
        tree.push(itemMap.get(item.id));
      }
    });

    return tree;
  }
}
