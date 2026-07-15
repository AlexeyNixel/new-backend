export class CreateMapPointDto {
  title: string;
  description?: string;
  image?: string;
  content?: string;
  lat: number;
  lng: number;
  preset?: string;
}
