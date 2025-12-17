import { Injectable } from '@nestjs/common';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PrismaService } from '../prisma.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { createSlug } from '../common/utils/slugify.utils';

@Injectable()
export class PageService {
  constructor(private readonly prismaService: PrismaService) {}

  create(createPageDto: CreatePageDto) {
    return 'This action adds a new page';
  }

  findAll() {
    return `This action returns all page`;
  }

  async findOne(id: string) {
    const page = await this.prismaService.page.findUnique({
      where: { slug: id },
    });

    if (!page) {
      return {
        message: 'Page not found',
      };
    }
    return page;
  }

  update(id: string, updatePageDto: UpdatePageDto) {
    return `This action updates a #${id} page`;
  }

  async updateTo() {
    const pages = await this.prismaService.page.findMany();

    for (const page of pages) {
      const copy = await this.prismaService.page.findUnique({
        where: {
          slug: createSlug(page.title),
        },
      });

      if (copy) {
        continue;
      }

      if (!page.slug) {
        await this.prismaService.page.update({
          where: {
            id: page.id,
          },
          data: {
            slug: createSlug(page.title),
          },
        });
      }
    }
    return `success`;
  }

  remove(id: string) {
    return `This action removes a #${id} page`;
  }
}
