import { defineConfig } from 'drizzle-kit';
// import { getLocalSQLiteDBPath } from 'drizzle/utils';

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
          url: 'DATABASE_URL',
        },
      });
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }

  try {
    // const localDbPath = getLocalSQLiteDBPath();

    // if (!localDbPath) {
    //   console.error('Configuration Failed: Missing Local DB');
    //   process.exit(1);
    // }
    console.log(process.env.DEVELOPENT_SECRET);
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('Configuration Failed: Missing Local DB URL');
      process.exit(1);
    }

    return defineConfig({
      out: './drizzle/migrations',
      schema: './src/lib/db/schema.ts',
      dialect: 'sqlite',
      casing: 'snake_case',
      dbCredentials: {
        url: databaseUrl,
      },
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
