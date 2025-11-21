import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { ResponseService } from '../common/services/response.service';

@Module({
  controllers: [EventController],
  providers: [EventService, ResponseService],
})
export class EventModule {}
