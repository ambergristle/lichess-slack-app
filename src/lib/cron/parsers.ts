import { z } from 'zod';

import { parserFactory } from '../utils';

const ZSignatureTokenData = z.object({
  iss: z.literal('Upstash'),
  sub: z.string(),
  exp: z.number(),
  nbf: z.number(),
  body: z.string(),
  // aud
  // iat
  // jti
});

export const parseTokenData = parserFactory(
  ZSignatureTokenData,
  {
    entityName: 'SignatureTokenData',
    errorMessage: 'Invalid token',
  },
);
