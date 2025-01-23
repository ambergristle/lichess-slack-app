import fs from 'node:fs';
import path from 'node:path';

/**
 * Used when connecting to local SQLite db during seeding and migrations,
 * or when making queries against the db.
 * @returns Path to most recent .sqlite file in the .wrangler directory
 */
export function getLocalSQLiteDBPath() {
  try {
    const basePath = path.resolve('./');

    const files = fs
      .readdirSync(basePath, {
        encoding: 'utf-8',
        recursive: true,
      })
      .filter((fileName) => fileName.endsWith('.sqlite'));

    if (!files.length) {
      throw new Error(`No .sqlite file found at ${basePath}`);
    }

    // Retrieve most recent .sqlite file
    files.sort((a, b) => {
      const statA = fs.statSync(path.join(basePath, a));
      const statB = fs.statSync(path.join(basePath, b));

      return statB.mtime.getTime() - statA.mtime.getTime();
    });

    // eslint-disable-next-line -- Files array guaranteed to have min 1 element
    return path.resolve(basePath, files[0]!);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error resolving local D1 DB: ${error.message}`, {
        cause: error,
      });
    }

    throw new Error('Error resolving local D1 DB', { cause: error });
  }
}
