export class CreateMapPointDto {
  title: string;
  description?: string;
  imageFileId?: string;
  content?: string;
  lat: number;
  lng: number;
  preset?: string;
}
