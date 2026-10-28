import { Module } from '@nestjs/common';
import { LinkCheckService } from './link-check.service';
import { LinkCheckController } from './link-check.controller';

@Module({
  controllers: [LinkCheckController],
  providers: [LinkCheckService],
})
export class LinkCheckModule {}
