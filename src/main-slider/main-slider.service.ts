import { Injectable } from '@nestjs/common';
import { CreateMainSliderDto } from './dto/create-main-slider.dto';
import { UpdateMainSliderDto } from './dto/update-main-slider.dto';
import { PrismaService } from '../prisma.service';
import { v4 } from 'uuid';

@Injectable()
export class MainSliderService {
  constructor(private prismaService: PrismaService) {}
  create(createMainSliderDto: CreateMainSliderDto) {
    return this.prismaService.mainSliderSlide.create({
      // @ts-ignore
      data: {
        id: v4(),
        ...createMainSliderDto,
      },
    });
  }

  findAll() {
    return `This action returns all mainSlider`;
  }

  findOne(id: number) {
    return `This action returns a #${id} mainSlider`;
  }

  update(id: number, updateMainSliderDto: UpdateMainSliderDto) {
    return `This action updates a #${id} mainSlider`;
  }

  remove(id: number) {
    return `This action removes a #${id} mainSlider`;
  }
}
