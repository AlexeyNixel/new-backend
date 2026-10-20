import { DateTime } from 'luxon';
import {
  PageArchiveBlock,
  PageArchiveBlockItem,
  PageBlock,
} from '../types/page-block.type';

/** Сколько новостей по тегам отдаём в один блок-архив */
export const ARCHIVE_TAG_POSTS_LIMIT = 500;

export interface ArchiveTagPost {
  title: string;
  slug: string;
  publishedAt: Date;
}

const isArchiveBlock = (block: unknown): block is PageArchiveBlock =>
  typeof block === 'object' &&
  block !== null &&
  (block as PageBlock).type === 'archive';

/** Id тегов блока-архива без пустых значений и повторов */
export const getArchiveTagIds = (block: unknown): string[] =>
  isArchiveBlock(block) && Array.isArray(block.tagIds)
    ? [
        ...new Set(
          block.tagIds.filter(
            (id): id is string => typeof id === 'string' && id !== '',
          ),
        ),
      ]
    : [];

/**
 * Перед сохранением: вырезает вычисляемое поле `tagItems` у блоков-архивов,
 * чтобы подставленные при чтении новости не записались в БД как ручные.
 */
export const stripArchiveTagItems = <T>(blocks: T): T => {
  if (!Array.isArray(blocks)) return blocks;

  return blocks.map((block: unknown) => {
    if (!isArchiveBlock(block)) return block;
    const rest = { ...block };
    delete rest.tagItems;
    return rest;
  }) as T;
};

/** Новость → пункт архива (дата — по Новосибирску, как на сайте) */
export const toArchiveItem = (post: ArchiveTagPost): PageArchiveBlockItem => ({
  date: DateTime.fromJSDate(post.publishedAt)
    .setZone('Asia/Novosibirsk')
    .toFormat('dd.MM.yyyy'),
  text: post.title,
  url: `/post/${post.slug}`,
});
