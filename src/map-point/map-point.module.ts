import { Module } from '@nestjs/common';
import { MapPointService } from './map-point.service';
import { MapPointController } from './map-point.controller';
import { ResponseService } from '../common/services/response.service';

@Module({
  controllers: [MapPointController],
  providers: [MapPointService, ResponseService],
})
export class MapPointModule {}
