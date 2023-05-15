import { z } from 'zod';

export const ZDate = z.coerce.date();

export const ZString = z.string().min(1);


export const ZDocumentId = ZString;
