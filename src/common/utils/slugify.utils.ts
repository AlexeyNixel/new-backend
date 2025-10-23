import slugify from 'slugify';
import { DateTime } from 'luxon';

export function createSlug(
  title: string,
  slug?: string,
  withDate?: boolean,
): string {
  const now: string = DateTime.now().toFormat('yyyy-MM-dd-HH-mm');

  if (slug) {
    return slug.toLowerCase();
  }

  const newSlug: string = slugify(title, {
    replacement: '-',
    remove: /[^\w\s]/gi,
    lower: true,
    strict: false,
    locale: 'ru',
    trim: true,
  });

  if (withDate) {
    return newSlug + `-${now}`;
  } else {
    return newSlug;
  }
}
