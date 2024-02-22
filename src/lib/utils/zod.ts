import { ZodSchema } from 'zod';
import { ValidationError } from '../errors';

type ParserFactoryOptions = {
  entityName: string;
  errorMessage: string;
}

export const parserFactory = <
 Z extends ZodSchema,
>(schema: Z, options: ParserFactoryOptions) => {
  return (data: unknown): Z['_output'] => {
    const result = schema.safeParse(data)
    if (result.success) return result.data;

    const errors = result.error.issues.map((issue) => {
      const path = Array.isArray(issue.path) 
        ? issue.path.join('.') 
        : issue.path;

      return {
        path,
        message: issue.message,
      }
    })

    const {
      errorMessage,
      entityName
    } = options;

    throw new ValidationError(errorMessage, {
      entityName,
      errors
    })
  }
}
