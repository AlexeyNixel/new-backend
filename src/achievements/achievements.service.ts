import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class AchievementsService {
  constructor(private prismaService: PrismaService) {}

  create(createAchievementDto: CreateAchievementDto) {
    return this.prismaService.achievement.create({
      data: {
        ...createAchievementDto,
      },
    });
  }

  /** Публичный список для сайта: скрытые счётчики не отдаём. */
  findAll() {
    return this.prismaService.achievement.findMany({
      where: {
        isDeleted: false,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /** Админка: все счётчики, включая скрытые. */
  findAllAdmin() {
    return this.prismaService.achievement.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const achievement = await this.prismaService.achievement.findUnique({
      where: { id },
    });

    if (!achievement) {
      throw new NotFoundException('Достижение не найдено');
    }

    return achievement;
  }

  async update(id: string, updateAchievementDto: UpdateAchievementDto) {
    const achievement = await this.prismaService.achievement.findUnique({
      where: { id },
    });

    if (!achievement) {
      throw new NotFoundException('Достижение не найдено');
    }

    return this.prismaService.achievement.update({
      where: {
        id: id,
      },
      data: {
        ...updateAchievementDto,
      },
    });
  }
}
