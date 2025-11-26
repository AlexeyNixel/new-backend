import { Injectable } from '@nestjs/common';
import { CreateBookCategoryDto } from './dto/create-book-category.dto';
import { UpdateBookCategoryDto } from './dto/update-book-category.dto';
import { PrismaService } from '../prisma.service';
import { v4 } from 'uuid';

@Injectable()
export class BookCategoryService {
  constructor(private readonly prismaService: PrismaService) {}

  create(createBookCategoryDto: CreateBookCategoryDto) {
    return this.prismaService.bookCategory.create({
      data: {
        id: v4(),
        ...createBookCategoryDto,
      },
    });
  }

  findAll() {
    return this.prismaService.bookCategory.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prismaService.bookCategory.findUnique({
      where: { id },
    });
    if (!category) {
      return {
        message: 'Категория не найдена',
      };
    }
    return category;
  }

  update(id: string, updateBookCategoryDto: UpdateBookCategoryDto) {
    return this.prismaService.bookCategory.update({
      where: {
        id,
      },
      data: {
        ...updateBookCategoryDto,
      },
    });
  }

  remove(id: number) {
    return `This action removes a #${id} bookCategory`;
  }
}
