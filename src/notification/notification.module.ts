import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { ResponseService } from '../common/services/response.service';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, ResponseService],
})
export class NotificationModule {}
