import { PartialType } from '@nestjs/mapped-types';
import { CreateShortLinkDto } from './create-short-link.dto';

export class UpdateShortLinkDto extends PartialType(CreateShortLinkDto) {}
