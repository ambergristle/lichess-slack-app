import { HTTPException } from 'hono/http-exception';
import { ContentfulStatusCode, SuccessStatusCode } from 'hono/utils/http-status';

// todo
export const handleEffectError = (error: unknown) => {
  //
};

export const processError = (
  error: unknown,
): {
  message: string;
  status: ContentfulStatusCode;
} => {
  console.error(error);

  if (error instanceof KnownError) {
    return {
      message: error.message,
      status: error.status,
    };
  }

  if (error instanceof HTTPException) {
    return {
      message: error.message,
      status: error.status,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      status: 500,
    };
  }

  return {
    status: 500,
    message: 'Something went wrong',
  };
};

type ErrorStatus = Exclude<ContentfulStatusCode, SuccessStatusCode>;

interface KnownErrorOptions extends ErrorOptions {
  status?: ErrorStatus;
}

export class KnownError extends Error {
  public readonly status: ErrorStatus;

  constructor(message: string, options?: KnownErrorOptions) {
    const { status, ...restOptions } = options ?? {};

    super(message, restOptions);

    this.name = 'KnownError';
    this.status = status ?? 500;

    Error.captureStackTrace(this, KnownError);
  }

  public json() {
    return JSON.parse(JSON.stringify(this));
  }
}

export class AuthorizationError extends KnownError {
  constructor(message: string, options?: Omit<KnownErrorOptions, 'status'>) {
    super(message, {
      ...options,
      status: 401,
    });

    this.name = 'AuthorizationError';
  }
}

export class ConfigurationError extends KnownError {
  constructor(message: string) {
    super(message, {
      status: 401,
    });

    this.name = 'ConfigurationError';
  }
}

type RateLimitErrorOptions = {
  retryAfter: number;
};

export class RatelimitError extends KnownError {
  public readonly retryAfter: number;

  constructor(message: string, { retryAfter }: RateLimitErrorOptions) {
    super(message, {
      status: 429,
    });

    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

interface ValidationErrorOptions extends ErrorOptions {
  issues: any[];
}

export class ValidationError extends KnownError {
  public readonly issues: any[];

  constructor(message: string, { issues, ...options }: ValidationErrorOptions) {
    super(message, {
      status: 429,
      ...options,
    });

    this.name = 'ValidationError';
    this.issues = issues;
  }
}

// lichess
// - status, message
// qstash
// - status, message
// slack
// - status, code
