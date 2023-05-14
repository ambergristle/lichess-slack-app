import { z } from 'zod';
import { TUserMetadata } from '../../schemas/document';
import { 
  Document as BaseDocument, 
  IDocument as IBaseDocument,
} from './base';

export type IDocument = IBaseDocument

export class Document extends BaseDocument implements IDocument {

  public _id = '';

  public _createdAt: Date = new Date();
  public _createdBy: TUserMetadata;
    
  public _lastUpdatedAt: Date = new Date();
  public _lastUpdatedBy: TUserMetadata;

  public readonly _schema: z.AnyZodObject;

  constructor() {
    super();
  }

  public data() {
    return this._schema.parse(this);
  }


  public init(): Document {
    return new Document();
  }

}