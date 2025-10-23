import { validate } from 'uuid';

export function parseSlug(idOrSlug: string) {
  if (validate(idOrSlug)) {
    return {
      id: idOrSlug,
    };
  } else {
    return {
      slug: idOrSlug,
    };
  }
}
