import { Module } from '@nestjs/common';
import { MainSliderService } from './main-slider.service';
import { MainSliderController } from './main-slider.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [MainSliderController],
  providers: [MainSliderService, PrismaService],
})
export class MainSliderModule {}
