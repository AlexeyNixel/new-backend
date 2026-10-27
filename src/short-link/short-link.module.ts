import { Module } from '@nestjs/common';
import { ShortLinkService } from './short-link.service';
import { ShortLinkController } from './short-link.controller';
import { ResponseService } from '../common/services/response.service';

@Module({
  controllers: [ShortLinkController],
  providers: [ShortLinkService, ResponseService],
})
export class ShortLinkModule {}
