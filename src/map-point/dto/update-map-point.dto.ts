import { PartialType } from '@nestjs/mapped-types';
import { CreateMapPointDto } from './create-map-point.dto';

export class UpdateMapPointDto extends PartialType(CreateMapPointDto) {}
