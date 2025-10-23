import { Injectable } from '@nestjs/common';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { PrismaService } from '../prisma.service';
import { v4 } from 'uuid';
import { createSlug } from '../common/utils/slugify.utils';
import { parseSlug } from '../common/utils/validate.utils';

@Injectable()
export class TagsService {
  constructor(private prismaService: PrismaService) {}

  create(createTagDto: CreateTagDto) {
    createTagDto.slug = createSlug(
      createTagDto.title,
      createTagDto.slug,
      false,
    );

    return this.prismaService.tag.create({
      data: {
        id: v4(),
        ...createTagDto,
      },
    });
  }

  findAll() {
    return this.prismaService.tag.findMany();
  }

  findOne(id: string) {
    return this.prismaService.tag.findUnique({
      where: { ...parseSlug(id) },
    });
  }

  update(id: number, updateTagDto: UpdateTagDto) {
    return `This action updates a #${id} tag`;
  }

  remove(id: number) {
    return `This action removes a #${id} tag`;
  }
}
