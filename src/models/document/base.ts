import { z } from 'zod';
import type { TDocument, TUserMetadata } from 'schemas/document';
import { createObjectIdString } from '../../utils';


export type IDocument = TDocument

export abstract class Document implements IDocument {
    [k: string]: unknown;
    abstract _schema: z.AnyZodObject;

    public _id = createObjectIdString();

    public _createdAt: Date = new Date();
    public _createdBy: TUserMetadata;
    
    public _lastUpdatedAt: Date = new Date();
    public _lastUpdatedBy: TUserMetadata;


    abstract init(): Document;

    public data() {
      return this._schema.parse(this);
    }
}
