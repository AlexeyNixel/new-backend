import { PartialType } from '@nestjs/mapped-types';
import { CreateMainSliderDto } from './create-main-slider.dto';

export class UpdateMainSliderDto extends PartialType(CreateMainSliderDto) {}
