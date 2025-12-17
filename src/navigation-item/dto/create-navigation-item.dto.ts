export class CreateNavigationItemDto {
  title: string;
  to?: string;
  slug: string;
  description?: string;
  icon?: string;
  order: number;
  isExternal: boolean;
  target?: string;
  parentId?: string;
}
