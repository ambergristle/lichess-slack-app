import { z } from 'zod';
import { ZDate, ZDocumentId, ZString } from './primitive';

const ZUserMetadata = z.object({
  _userId: ZDocumentId,
  userName: ZString,
});

const ZDocumentMetadata = z.object({
  _id: ZDocumentId,
  _createdAt: ZDate,
  _createdBy: ZUserMetadata,
  _lastUpdatedAt: ZDate,
  _lastUpdatedBy: ZUserMetadata,
});

export const ZDocument = ZDocumentMetadata.passthrough();

export const documentSchemaFactory = <
    S extends z.ZodRawShape
>(schema: z.ZodObject<S>) => {
  return ZDocument.merge(schema);
};