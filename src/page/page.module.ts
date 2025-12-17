import { Module } from '@nestjs/common';
import { PageService } from './page.service';
import { PageController } from './page.controller';
import { ResponseService } from '../common/services/response.service';

@Module({
  controllers: [PageController],
  providers: [PageService, ResponseService],
})
export class PageModule {}
