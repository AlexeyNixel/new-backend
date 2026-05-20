import { Injectable } from '@nestjs/common';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ClubsService {
  constructor(
    private readonly prismaService: PrismaService
  ) {
  }

  create(createClubDto: CreateClubDto) {
    return 'This action adds a new club';
  }

  findAll() {
    return this.prismaService.club.findMany()
  }

  findOne(id: number) {
    return `This action returns a #${id} club`;
  }

  update(id: number, updateClubDto: UpdateClubDto) {
    return `This action updates a #${id} club`;
  }

  remove(id: number) {
    return `This action removes a #${id} club`;
  }
}
