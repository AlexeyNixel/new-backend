import { PartialType } from '@nestjs/mapped-types';
import { CreateNavigationItemDto } from './create-navigation-item.dto';

export class UpdateNavigationItemDto extends PartialType(CreateNavigationItemDto) {}
