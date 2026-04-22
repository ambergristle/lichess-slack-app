import type { ValidationTargets } from 'hono';
import { validator } from 'hono/validator';
import type { z } from 'zod';

import { ValidationError } from '@/lib/utils/errors';

export const zodValidator = <Target extends keyof ValidationTargets, Schema extends z.ZodSchema>(
  target: Target,
  schema: Schema,
) => {
  return validator(target, async (value): Promise<z.output<Schema>> => {
    const result = await schema.safeParseAsync(value);
    if (!result.success) {
      throw new ValidationError(`Invalid ${target} data`, {
        issues: result.error.issues,
        cause: result.error,
      });
    }

    return result.data;
  });
};

// /**
//  *
//  * @returns Record of field paths with arrays of field-specific error messages
//  */
// function formatZodError<T>(zodError: z.ZodError) {

//   const mapper = ({ message }: z.ZodIssue) => message;

//   const fieldErrors: FormattedZodError<T> = {} as any;

//   const processError = (error: z.ZodError) => {
//     for (const issue of error.issues) {

//       switch (issue.code) {
//         case "invalid_union":
//           issue.unionErrors.map(processError);
//           break;
//         case "invalid_return_type":
//           processError(issue.returnTypeError);
//           break;
//         case "invalid_arguments":
//           processError(issue.argumentsError);
//         default:
//           if (issue.path.length === 0) {
//             fieldErrors["_root"] = fieldErrors["_root"] || [];
//             fieldErrors["_root"].push(issue.message);
//           } else {
//             let current: Record<string, any> = fieldErrors;
//             let index = 0;

//             while (index < issue.path.length) {
//               const key = issue.path.at(index)!;
//               const terminal = index === issue.path.length - 1;

//               current[key] = current[key] || [];

//               if (terminal) {
//                 current[key].push(mapper(issue));
//               } else {
//                 // obj v array?
//               }

//               current = current[key];
//               index++;
//             }
//           }
//       }

//     }
//   }

//   processError(zodError);
//   return fieldErrors;
// }
