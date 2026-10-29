import { PartialType } from '@nestjs/mapped-types';
import { CreateAchievementDto } from './create-achievement.dto';

export class UpdateAchievementDto extends PartialType(CreateAchievementDto) {
  /** Скрыть счётчик с сайта, не удаляя запись */
  isDeleted?: boolean;
}
