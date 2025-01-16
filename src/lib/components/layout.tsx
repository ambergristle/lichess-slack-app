
const Layout = () => {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
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
