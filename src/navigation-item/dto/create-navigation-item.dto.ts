export class CreateNavigationItemDto {
  title: string;
  url?: string;
  slug: string;
  description?: string;
  icon?: string;
  order: number;
  isExternal: boolean;
  target?: string;
  parentId?: string;
}
