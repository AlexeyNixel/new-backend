import { SetMetadata } from '@nestjs/common';

export const AUDITED_ENTITY_KEY = 'audited-entity';

export const Audited = (entityType: string) =>
  SetMetadata(AUDITED_ENTITY_KEY, entityType);
