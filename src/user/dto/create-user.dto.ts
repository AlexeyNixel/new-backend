export class CreateUserDto {
  username: string;
  password: string;
  name?: string | null;
  sections?: string[] | null;
}
