import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { JSONObject } from 'hono/utils/types';

// type ErrorStatus = Exclude<ContentfulStatusCode, SuccessStatusCode>;

interface OopsOptions extends ErrorOptions { }

export class Oops extends Error {
  public readonly name: string = 'Oops';
  public readonly status: ErrorStatus = 500;
  public readonly data?: Record<string, unknown>;

  constructor(message: string, options?: OopsOptions) {
    super(message, options);

    if (options?.cause && options.cause instanceof Error) {
      if (options.cause.name === 'AbortError') {
        this.status = 408;
      }

      this.stack = options.cause.stack ?? this.stack;
    }
  }

  public static fromError(message: string, cause: unknown): Oops {
    return new Oops(message, { cause });
  }

  public static parseError(error: unknown): {
    status: ContentfulStatusCode;
    message: string;
  } {
    if (error instanceof Oops) {
      return {
        status: error.status,
        message: error.message,
      };
    }

    if (error instanceof HTTPException) {
      return {
        status: error.status,
        message: error.message,
      };
    }

    if (error instanceof Error) {
      return {
        status: 500,
        message: error.message,
      };
    }

    return {
      status: 500,
      message: 'Something unexpected happened.',
    };
  }

  public json(): JSONObject {
    return JSON.parse(JSON.stringify(this));
  }
}

export class AuthorizationError extends Oops {
  public readonly name = 'AuthorizationError';
  public readonly status = 401;

  constructor(message: string, options?: OopsOptions) {
    super(message, options);
  }
}

export class ConfigurationError extends Oops {
  public readonly name = 'ConfigurationError';

  constructor(message: string) {
    super(message);
  }
}

interface PersistenceErrorOptions extends OopsOptions {
  identifier?: string | Record<string, string>;
}

export class PersistenceError extends Oops {
  public readonly name = 'PersistenceError';
  declare public readonly data?: {
    identifier: string | Record<string, string>;
  };

  constructor(message: string, options?: PersistenceErrorOptions) {
    const { identifier, ...optionsRest } = options ?? {};
    super(message, optionsRest);

    if (identifier) {
      this.data = { identifier };
    }
  }
}

type ResponseErrorOptions = {
  status: number;
  headers: Headers;
  received?: unknown;
} & (
    | {
      service: 'lichess' | 'qstash';
      code?: never;
    }
    | {
      service: 'slack';
      code?: string;
    }
  );

export class ResponseError extends Oops {
  public readonly name = 'ResponseError';
  declare public readonly data: {
    service: 'lichess' | 'qstash' | 'slack';
    status: number;
    code?: string;
    headers: Headers;
    received?: unknown;
  };

  constructor(message: string, options: ResponseErrorOptions) {
    const { service, status, code, headers, received, ...optionsRest } =
      options;

    super(message, optionsRest);

    this.data = {
      service,
      status,
      ...(!!code && { code }),
      headers,
      received,
    };
  }
}

interface RequestErrorOptions extends OopsOptions {
  headers: Headers;
  body?: unknown;
}

export class RequestError extends Oops {
  public readonly name = 'RequestError';
  public readonly status = 400;
  declare public readonly data: {
    headers: Headers;
    body?: unknown;
  };

  constructor(message: string, options: RequestErrorOptions) {
    const { headers, body, ...restOptions } = options ?? {};
    super(message, restOptions);

    this.data = {
      headers,
      ...(!!body && { body }),
    };
  }
}

export class RateLimitError extends Oops {
  public readonly name = 'RateLimitError';
  public readonly status = 429;

  constructor(message?: string) {
    super(message ?? 'Rate limit exceeded');
  }
}

export const handleEffectError = (error: unknown) => {
  Oops.parseError(error);
};

const errorCodes = {
  invalid_request: 400,
  unauthorized: 401,
  request_timeout: 408,
  limit_exceeded: 429,
  invalid_config: 500,
  server_error: 500,
  persistence_error: 500,
  service_error: 500,
} as const;

type ErrorCode = keyof typeof errorCodes;
type ErrorStatus = (typeof errorCodes)[ErrorCode];

// type OtherErrorOptions =
//   | ConfigErrorOptions
//   | InvalidRequestErrorOptions
//   | _PersistenceErrorOptions
//   | RateLimitErrorOptions
//   | _ResponseErrorOptions
//   | TimeoutErrorOptions
//   | UnauthorizedErrorOptions;

// type InvalidRequestErrorOptions = {
//   message: string;
//   data: {
//     headers: Headers;
//     body?: unknown;
//   };
// };

// type UnauthorizedErrorOptions = {
//   message: string;
//   cause?: unknown;
// };

// type TimeoutErrorOptions = {
//   cause: unknown;
// };

// type RateLimitErrorOptions = {
//   data: {};
// };

// type ConfigErrorOptions = {
//   message: string;
// };

// type _PersistenceErrorOptions = {
//   data: {
//     identifier: string | Record<string, string>;
//   };
//   cause?: unknown;
// };

// type _ResponseErrorOptions = {
//   message: string;
//   data: {
//     service: 'lichess' | 'qstash' | 'slack';
//     status: number;
//     code?: string;
//     headers: Headers;
//     body?: unknown;
//   };
// };

// class Other extends Error {
//   status: ErrorStatus;
//   data?: Record<string, unknown>;

//   constructor(code: 'invalid_request', options: InvalidRequestErrorOptions);

//   constructor(code: 'unauthorized', options?: UnauthorizedErrorOptions);

//   constructor(code: 'request_timeout', options: TimeoutErrorOptions);

//   constructor(code: 'limit_exceeded', options: RateLimitErrorOptions);

//   constructor(code: 'invalid_config', options: ConfigErrorOptions);

//   constructor(code: 'persistence_error', options?: _PersistenceErrorOptions);

//   constructor(code: 'service_error', options: _ResponseErrorOptions);

//   constructor(code: 'server_error');

//   constructor(code: ErrorCode, options?: OtherErrorOptions) {
//     super(options?.message ?? 'Unknown exception');
//     this.status = errorCodes[code] ?? 500;
//   }
// }

// https://github.com/cellajs/cella/blob/development/backend/src/lib/error.ts
// type OopsData = {
//   name: string;
//   message: string;
//   type: string; // idk
//   status: number; // error status
//   // severity -- this is a log
//   // entityType -- (scope)

//   // logId
//   // request path
//   // request method
//   // timestamp
//   // userId
//   // etc
// };
