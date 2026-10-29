import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Audited } from '../common/decorators/audited.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { Section } from '../auth/sections';

@Section('achievements')
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @Audited('Achievement')
  @Post()
  create(@Body() createAchievementDto: CreateAchievementDto) {
    return this.achievementsService.create(createAchievementDto);
  }

  /** Публичный: сайт показывает только не скрытые счётчики */
  @Get()
  findAll() {
    return this.achievementsService.findAll();
  }

  /** Админка: все счётчики, включая скрытые */
  @UseGuards(JwtAuthGuard)
  @Get('admin')
  findAllAdmin() {
    return this.achievementsService.findAllAdmin();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.achievementsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @Audited('Achievement')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAchievementDto: UpdateAchievementDto,
  ) {
    return this.achievementsService.update(id, updateAchievementDto);
  }
}
