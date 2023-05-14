import { z } from 'zod';


export abstract class Document {
    abstract _schema: z.AnyZodObject;

    public data() {
      return this._schema.parse(this);
    }


}