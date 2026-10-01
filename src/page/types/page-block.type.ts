export interface PageHeroBlockContacts {
  phone?: string;
  address?: string;
  email?: string;
  workHours?: string;
}

export interface PageHeroBlock {
  type: 'hero';
  icon?: string;
  label?: string;
  title: string;
  subtitle?: string;
  contacts?: PageHeroBlockContacts;
}

export interface PageStatsBlockItem {
  value: string;
  label: string;
}

export interface PageStatsBlock {
  type: 'stats';
  items: PageStatsBlockItem[];
}

export interface PageFeaturesBlockItem {
  icon?: string;
  title: string;
  description: string;
}

export interface PageFeaturesBlock {
  type: 'features';
  items: PageFeaturesBlockItem[];
}

export interface PageTagsBlockLinkItem {
  text: string;
  url?: string;
}

/** Строка — старый формат (тег без ссылки), объект — тег, который может быть ссылкой. */
export type PageTagsBlockItem = string | PageTagsBlockLinkItem;

export interface PageTagsBlock {
  type: 'tags';
  title?: string;
  items: PageTagsBlockItem[];
}

export interface PageAdvantagesBlock {
  type: 'advantages';
  title: string;
  items: string[];
}

export interface PageHighlightBlock {
  type: 'highlight';
  title: string;
  description: string;
  badge?: string;
}

export interface PagePersonBlock {
  type: 'person';
  name: string;
  position: string;
  icon?: string;
}

export interface PageBannerBlock {
  type: 'banner';
  text: string;
}

export interface PageRichTextBlock {
  type: 'richText';
  html: string;
}

export interface PageArchiveBlockItem {
  date?: string;
  text: string;
  url: string;
}

export interface PageArchiveBlock {
  type: 'archive';
  title: string;
  note?: string;
  items: PageArchiveBlockItem[];
}

export type PageContentBlock =
  | PageStatsBlock
  | PageFeaturesBlock
  | PageTagsBlock
  | PageAdvantagesBlock
  | PageHighlightBlock
  | PagePersonBlock
  | PageBannerBlock
  | PageRichTextBlock
  | PageArchiveBlock;

export type PageBlock = PageHeroBlock | PageContentBlock;
