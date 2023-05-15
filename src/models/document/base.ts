import { createObjectIdString } from 'utils';
import type { 
  TDocument, 
  TDocumentSchema, 
} from 'schemas/document';

export interface IDocument extends TDocument {}

export abstract class Document implements IDocument {
  
  // leverage extension?
  abstract _schema: TDocumentSchema;

  public _id = createObjectIdString();

  public _createdAt: Date = new Date();
  // public _createdBy: TUserMetadata;
    
  public _lastUpdatedAt: Date = new Date();
  // public _lastUpdatedBy: TUserMetadata;

  abstract init(params?: unknown): Document;

  public data() {
    return this._schema.parse(this);
  }

  public parse() {
    this._schema.parse(this);
    return this;
  }
}
