export class CreateEventDto {
  title: string;
  content: string;
  phone: string;
  age: number;
  place: string;
  eventTime: Date;
  isDeleted: boolean;
}
