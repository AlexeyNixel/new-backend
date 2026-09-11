import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { ResponseService } from '../common/services/response.service';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [GamesController],
  providers: [GamesService, ResponseService],
})
export class GamesModule {}
