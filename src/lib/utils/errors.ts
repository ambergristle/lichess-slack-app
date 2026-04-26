import { HTTPException } from 'hono/http-exception';
import type {
  ContentfulStatusCode,
  SuccessStatusCode,
} from 'hono/utils/http-status';
import type { JSONObject } from 'hono/utils/types';

type ErrorStatus = Exclude<ContentfulStatusCode, SuccessStatusCode>;

interface OopsOptions extends ErrorOptions { }

// 408 for timeout -- add error code?

export class Oops extends Error {
  public readonly name: string = 'Oops';
  public readonly status: ErrorStatus = 500;

  constructor(message: string, options?: OopsOptions) {
    super(message, options);
  }

  public static fromError(message: string, cause: unknown): Oops {
    if (cause instanceof Oops) {
      return new Oops(message, { cause });
    }

    return new Oops(message, { cause });
  }

  public static parseError(error: unknown): { status: ContentfulStatusCode; message: string; } {
    if (error instanceof Oops) {
      return {
        status: error.status,
        message: error.message,
      }
    }

    if (error instanceof HTTPException) {
      return {
        status: error.status,
        message: error.message,
      }
    }

    if (error instanceof Error) {
      return {
        status: 500,
        message: error.message,
      }
    }

    return {
      status: 500,
      message: 'Something unexpected happened.'
    }
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
  public readonly identifier?: string | Record<string, string>;

  constructor(message: string, options?: PersistenceErrorOptions) {
    const { identifier, ...optionsRest } = options ?? {};
    super(message, optionsRest);

    if (identifier) {
      this.identifier = identifier;
    }
  }
}

type ResponseErrorOptions = {
  statusCode: number;
  headers: Headers;
  received?: unknown;
} & (
    {
      service: 'lichess' | 'qstash';
      code?: never;
    } | {
      service: 'slack';
      code?: string;
    }
  )

export class ResponseError extends Oops {
  public readonly name = 'ResponseError';

  public readonly service: 'lichess' | 'qstash' | 'slack';
  public readonly statusCode: number;
  public readonly code?: string;
  private readonly headers: Headers;
  private readonly received?: unknown;

  constructor(message: string, options: ResponseErrorOptions) {
    const {
      service,
      statusCode,
      code,
      headers,
      received,
      ...optionsRest
    } = options;

    super(message, optionsRest);

    this.service = service;
    this.statusCode = statusCode;

    if (code) {
      this.code = code;
    }

    this.headers = headers;
    this.received = received;
  }
}

interface RequestErrorOptions extends OopsOptions {
  headers: Headers;
  body?: unknown;
}

export class RequestError extends Oops {
  public readonly name = 'RequestError';
  public readonly status = 400;

  private readonly headers: Headers;
  private readonly body?: unknown;

  constructor(message: string, options: RequestErrorOptions) {
    const { headers, body, ...restOptions } = options ?? {}
    super(message, restOptions)

    this.headers = headers;
    this.body = body;
  }
}


export const handleEffectError = (_error: unknown) => {
  //
};

// export class ValidationError extends KnownError {
//   public readonly issues: any[];

//   constructor(message: string, { issues, ...options }: ValidationErrorOptions) {
//     super(message, {
//       status: 429,
//       ...options,
//     });

//     this.name = 'ValidationError';
//     this.issues = issues;
//   }
// }

// interface ValidationErrorOptions extends ErrorOptions {
//   issues: any[];
// }


// representing an error response from
// - qstash
// - slack
// - lichess
// - db
// - storage

// wrapping a function error

// throwing defined/known issues
// - invalid response/data
// - auth error
// - unexpected data in db (or insert result)
