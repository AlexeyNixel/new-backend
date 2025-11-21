import { Module } from '@nestjs/common';
import { MainSliderService } from './main-slider.service';
import { MainSliderController } from './main-slider.controller';
import { ResponseService } from '../common/services/response.service';

@Module({
  controllers: [MainSliderController],
  providers: [MainSliderService, ResponseService],
})
export class MainSliderModule {}
