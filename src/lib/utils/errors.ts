import { HTTPException } from 'hono/http-exception';
import type {
  ContentfulStatusCode,
  SuccessStatusCode,
} from 'hono/utils/http-status';
import type { JSONObject } from 'hono/utils/types';

type ErrorStatus = Exclude<ContentfulStatusCode, SuccessStatusCode>;

interface OopsOptions extends ErrorOptions { }

export class Oops extends Error {
  public readonly name: string = 'Oops';
  public readonly statusCode: ErrorStatus = 500;

  constructor(message: string, options?: OopsOptions) {
    super(message, options);
  }

  public static fromError(message: string, cause: unknown): Oops {
    if (cause instanceof Oops) {
      return new Oops(message, { cause });
    }

    return new Oops(message, { cause });
  }

  public json(): JSONObject {
    return JSON.parse(JSON.stringify(this));
  }
}

export class AuthorizationError extends Oops {
  public readonly name = 'AuthorizationError';
  public readonly statusCode = 401;

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
  status: number;
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
  public readonly statusCode = 500;

  public readonly service: 'lichess' | 'qstash' | 'slack';
  public readonly status: number;
  public readonly code?: string;
  private readonly headers: Headers;
  private readonly received?: unknown;

  constructor(message: string, options: ResponseErrorOptions) {
    const {
      service,
      status,
      code,
      headers,
      received,
      ...optionsRest
    } = options;

    super(message, optionsRest);

    this.service = service;
    this.status = status;

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
  public readonly statusCode = 400;

  private readonly headers: Headers;
  private readonly body?: unknown;

  constructor(message: string, options: RequestErrorOptions) {
    const { headers, body, ...restOptions } = options ?? {}
    super(message, restOptions)

    this.headers = headers;
    this.body = body;
  }
}





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


export const handleEffectError = (_error: unknown) => {
  //
};

export const processError = (
  error: unknown
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
