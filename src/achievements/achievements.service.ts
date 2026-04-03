import { Injectable } from '@nestjs/common';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class AchievementsService {
  constructor(private prismaService: PrismaService) {}

  create(createAchievementDto: CreateAchievementDto) {
    return this.prismaService.achievements.create({
      data: {
        ...createAchievementDto,
      },
    });
  }

  findAll() {
    return this.prismaService.achievements.findMany({
      where: {
        isDeleted: false,
      },
    });
  }

  update(id: string, updateAchievementDto: UpdateAchievementDto) {
    return this.prismaService.achievements.update({
      where: {
        id: id,
      },
      data: {
        ...updateAchievementDto,
      },
    });
  }
}
