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
          <div class="background-image">
            <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
              <path
                fill="#FFFFFF"
                stroke="#FFFFFF"
                stroke-linejoin="round"
                d="M38.956.5c-3.53.418-6.452.902-9.286 2.984C5.534 1.786-.692 18.533.68 29.364 3.493 50.214 31.918 55.785 41.329 41.7c-7.444 7.696-19.276 8.752-28.323 3.084C3.959 39.116-.506 27.392 4.683 17.567 9.873 7.742 18.996 4.535 29.03 6.405c2.43-1.418 5.225-3.22 7.655-3.187l-1.694 4.86 12.752 21.37c-.439 5.654-5.459 6.112-5.459 6.112-.574-1.47-1.634-2.942-4.842-6.036-3.207-3.094-17.465-10.177-15.788-16.207-2.001 6.967 10.311 14.152 14.04 17.663 3.73 3.51 5.426 6.04 5.795 6.756 0 0 9.392-2.504 7.838-8.927L37.4 7.171z"
              />
            </svg>
          </div>
          {children}
        </main>
      </body>
    </html>
  );
};
