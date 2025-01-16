import { KnownError } from '../errors';

export const logError = (error: unknown) => {
  if (error instanceof KnownError) {
    console.error(error.json());
  } else {
    console.error(error);
  }
};
