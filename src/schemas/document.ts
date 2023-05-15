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
  // _createdBy: ZUserMetadata,
  _lastUpdatedAt: ZDate,
  // _lastUpdatedBy: ZUserMetadata,
});

export const ZDocument = ZDocumentMetadata;

export type TDocumentSchema = typeof ZDocument;
export type TDocument = z.infer<TDocumentSchema>;

export const documentSchemaFactory = <Z extends z.AnyZodObject>(schema: Z) => {
  return ZDocument.merge(schema);
};
