import { Module } from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { ClubsController } from './clubs.controller';
import { ResponseService } from '../common/services/response.service';

@Module({
  controllers: [ClubsController],
  providers: [ClubsService, ResponseService],
})
export class ClubsModule {}
