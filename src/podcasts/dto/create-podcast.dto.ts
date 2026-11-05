export class CreatePodcastDto {
  title: string;
  description?: string;
  audioFileId?: string;
  isDeleted?: boolean;
}
