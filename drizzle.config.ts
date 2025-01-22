import { defineConfig } from 'drizzle-kit';
import { getLocalSQLiteDBPath } from 'drizzle/utils';


export default generateLocalDrizzleConfig();

/**
 * While it's tempting to abstract this much duplication,
 * it's important to prevent changes from config in one
 * env from accidentally being applied to another
 */
function generateLocalDrizzleConfig() {

  if (process.env.ENVIRONMENT === 'production') {
    try {
      return defineConfig({
        out: './drizzle/migrations',
        schema: './src/lib/db/schema.ts',
        dialect: 'sqlite',
        casing: 'snake_case',
        dbCredentials: {
          url: 'local-db.sqlite',
          // accountId: CLOUDFLARE_ACCOUNT_ID,
          // databaseId: CLOUDFLARE_DATABASE_ID,
          // token: CLOUDFLARE_D1_TOKEN,
        },
      });
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }

  try {
    const localDbPath = getLocalSQLiteDBPath();

    if (!localDbPath) {
      console.error('Configuration Failed: Missing Local DB');
      process.exit(1);
    }

    return defineConfig({
      out: './drizzle/migrations',
      schema: './src/lib/db/schema.ts',
      dialect: 'sqlite',
      casing: 'snake_case',
      dbCredentials: {
        url: 'local-db.sqlite',
      },
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
