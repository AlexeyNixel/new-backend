import { FeedbackType } from 'generated/prisma';

export class CreateFeedbackDto {
  type: FeedbackType;
  title: string;
  description?: string | null;
  /** Страница админки, с которой сообщили */
  pageUrl?: string | null;
  screenshotId?: string | null;
}
