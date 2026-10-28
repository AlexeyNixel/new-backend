import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { FeedbackService } from './feedback.service';
import type { FeedbackUser } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { FeedbackQueryDto } from './dto/feedback-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/** Ошибки и пожелания по админке — только для авторизованных */
@UseGuards(JwtAuthGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  create(@Body() createFeedbackDto: CreateFeedbackDto, @Req() req: Request) {
    return this.feedbackService.create(createFeedbackDto, this.user(req));
  }

  @Get()
  findAll(@Query() query: FeedbackQueryDto, @Req() req: Request) {
    return this.feedbackService.findAll(query, this.user(req));
  }

  /** Чип в меню и уведомления: ?since=<ISO> — что изменилось с прошлой проверки */
  @Get('summary')
  summary(@Query('since') since: string | undefined, @Req() req: Request) {
    return this.feedbackService.summary(this.user(req), since);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.feedbackService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFeedbackDto: UpdateFeedbackDto,
    @Req() req: Request,
  ) {
    return this.feedbackService.update(id, updateFeedbackDto, this.user(req));
  }

  private user(req: Request) {
    return req.user as FeedbackUser;
  }
}
