import { PartialType } from '@nestjs/mapped-types';
import { CreatePodcastDto } from './create-podcast.dto';

export class UpdatePodcastDto extends PartialType(CreatePodcastDto) {}
