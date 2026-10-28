import { PartialType } from '@nestjs/mapped-types';
import { CreateFeedbackDto } from './create-feedback.dto';

export class UpdateFeedbackDto extends PartialType(CreateFeedbackDto) {
  /** Только для разработчика (FEEDBACK_MANAGERS) */
  isDone?: boolean;
  /** Только для разработчика (FEEDBACK_MANAGERS) */
  response?: string | null;
  isDeleted?: boolean;
}
