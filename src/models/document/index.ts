import { 
  Document as BaseDocument, 
  type IDocument as IBaseDocument,
} from './base';
import { ZDocument, type TDocumentSchema } from 'schemas/document';

export interface IDocument extends IBaseDocument {}

export class Document<
  Z extends TDocumentSchema = TDocumentSchema
> extends BaseDocument implements IDocument {

  readonly _schema: Z;

  constructor(schema: Z) {
    super();

    this._schema = schema;
  }

  // how do we get rid of the params?
  public init(params?: unknown): Document {
    return new Document(ZDocument);
  }

}
