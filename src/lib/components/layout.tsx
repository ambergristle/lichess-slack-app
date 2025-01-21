import type { Context } from 'hono';
import type { PropsWithChildren } from 'hono/jsx';

import type { Localized } from '@/locale/types';
import { getEnvironmentVariable } from '../request';

export const Layout = ({ children }: PropsWithChildren, c: Context<{
  Variables: {
    localized: Localized;
  }
}>) => {
  const { localized } = c.var;

  const ogTitle ='';
  const ogDescription = '';
  const baseUrl = getEnvironmentVariable(c, 'BASE_URL');

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* <meta name="theme-color" content="#2e2a24" /> */}
        <title>
          {localized.appName}
        </title>
        <meta content={ogDescription} name="description" />
        <link rel="mask-icon" href="/public/assets/logo/lichess.svg" color="black" />
        <link rel="icon" type="image/png" href="/public/assets/logo/lichess-favicon-512.png" sizes="512x512" />
        <link rel="icon" type="image/png" href="/public/assets/logo/lichess-favicon-256.png" sizes="256x256" />
        <link rel="icon" type="image/png" href="/public/assets/logo/lichess-favicon-192.png" sizes="192x192" />
        <link rel="icon" type="image/png" href="/public/assets/logo/lichess-favicon-128.png" sizes="128x128" />
        <link rel="icon" type="image/png" href="/public/assets/logo/lichess-favicon-64.png" sizes="64x64" />
        <link rel="icon" type="image/png" href="/public/assets/logo/lichess-favicon-32.png" sizes="32x32" />
        {/* <meta name="google" content="notranslate" /> */}
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:url" content={baseUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="lichess daily puzzle" />
        {/* <meta property="og:image" content="https://lichess1.org/assets/logo/lichess-tile-wide.png" /> */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        {/* <meta name="twitter:image" content="https://lichess1.org/assets/logo/lichess-tile.png" /> */}
        {/* <meta name="twitter:site" content="@lichess" /> */}
        <link rel="prefetch" href="/public/assets/Lato-Regular.ttf" as="font" type="font/ttf" crossorigin="" />
        {/* <link rel="manifest" href="/manifest.json" /> */}
        {/* <link rel="alternate" hreflang="x-default" href="https://lichess.org/" />
        <link rel="alternate" hreflang="en" href="https://lichess.org/" />
        <link rel="alternate" hreflang="ru" href="https://lichess.org/ru" /> */}
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
