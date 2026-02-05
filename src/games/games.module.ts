import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { ResponseService } from '../common/services/response.service';

@Module({
  controllers: [GamesController],
  providers: [GamesService, ResponseService],
})
export class GamesModule {}
