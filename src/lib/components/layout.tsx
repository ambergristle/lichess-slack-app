import type { Context } from 'hono';
import type { PropsWithChildren } from 'hono/jsx';

import type { Localized } from '@/locale/types';

export const Layout = ({ children }: PropsWithChildren, c: Context<{
  Variables: {
    localized: Localized;
  }
}>) => {
  const { localized } = c.var;

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>
          {localized.appName}
        </title>
        <link rel="stylesheet" href="/public/styles.css" />
      </head>
      <body>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
};
