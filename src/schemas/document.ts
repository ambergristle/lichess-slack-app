import { z } from 'zod';
import { ZDate, ZDocumentId, ZString } from './primitive';

const ZUserMetadata = z.object({
  _userId: ZDocumentId,
  userName: ZString,
});

export type TUserMetadata = z.infer<typeof ZUserMetadata>;

const ZDocumentMetadata = z.object({
  _id: ZDocumentId,
  _createdAt: ZDate,
  _createdBy: ZUserMetadata,
  _lastUpdatedAt: ZDate,
  _lastUpdatedBy: ZUserMetadata,
});

export const ZDocument = ZDocumentMetadata.passthrough();
export type TDocument = z.infer<typeof ZDocument>;

export const documentSchemaFactory = <
    S extends z.ZodRawShape
>(schema: z.ZodObject<S>) => {
  return ZDocument.merge(schema);
};