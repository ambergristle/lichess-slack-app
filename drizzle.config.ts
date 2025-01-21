import { defineConfig } from 'drizzle-kit';


export default generateLocalDrizzleConfig();

function generateLocalDrizzleConfig() {
  try {
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
