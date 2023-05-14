import { z } from 'zod';
import { ZString } from './primitive';
import { documentSchemaFactory } from './document';

export const ZUserData = z.object({
  fullName: ZString,
  email: ZString.email(),
  roles: z.any(),
});

export type TUserData = z.infer<typeof ZUserData>;

export const ZUser = documentSchemaFactory(ZUserData);
export type TUser = z.infer<typeof ZUser>;