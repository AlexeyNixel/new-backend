import { Injectable } from '@nestjs/common';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { PrismaService } from '../prisma.service';
import { v4 } from 'uuid';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { createInclude } from '../common/utils/include.utils';
import { ResponseService } from '../common/services/response.service';

@Injectable()
export class ClubsService {
  constructor(
    private readonly prismaService: PrismaService,
    private responseService: ResponseService,
  ) {}

  create(createClubDto: CreateClubDto) {
    return this.prismaService.club.create({
      data: {
        id: v4(),
        ...createClubDto,
      },
    });
  }

  async findAll(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10, include = '' } = paginationQuery;

    const skip = (page - 1) * limit;
    const includeForm = createInclude(include);

    const [clubs, total] = await Promise.all([
      this.prismaService.club.findMany({
        include: { ...includeForm },
        skip: skip,
        take: +limit,
      }),

      this.prismaService.club.count(),
    ]);

    return this.responseService.paginated(clubs, total, page, limit);
  }

  findOne(id: string) {
    return this.prismaService.club.findUnique({
      where: { id: id },
    });
  }

  update(id: string, updateClubDto: UpdateClubDto) {
    return this.prismaService.club.update({
      where: {
        id: id,
      },
      data: { ...updateClubDto },
    });
  }

  remove(id: number) {
    return `This action removes a #${id} club`;
  }
}
