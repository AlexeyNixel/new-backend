import { FeedbackType } from 'generated/prisma';

export class FeedbackQueryDto {
  page?: number = 1;
  limit?: number = 20;
  /** open — не выполненные (по умолчанию), done — выполненные, all — все */
  status?: 'open' | 'done' | 'all';
  type?: FeedbackType;
  search?: string;
  /** Только мои обращения (любое значение) */
  mine?: string;
}
