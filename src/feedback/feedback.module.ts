import { Module } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { ResponseService } from '../common/services/response.service';

@Module({
  controllers: [FeedbackController],
  providers: [FeedbackService, ResponseService],
})
export class FeedbackModule {}
