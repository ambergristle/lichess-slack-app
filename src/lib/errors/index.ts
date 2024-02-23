
export class KnownError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = 'KnownError';
  }

  public json() {
    return JSON.parse(JSON.stringify(this));
  }
}

export class AuthorizationError extends KnownError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = 'AuthorizationError';

    Error.captureStackTrace(this, AuthorizationError);
  }
}

interface PersistenceErrorOptions extends ErrorOptions {
  code: string;
  collection: string;
  filter: Record<string, any>;
}

export class PersistenceError extends KnownError {
  public readonly code: string;
  public readonly collection: string;
  public readonly filter: Record<string, any>;

  constructor(message: string, options: PersistenceErrorOptions) {
    const {
      code,
      collection, 
      filter,
      ..._options 
    } = options;

    super(message, _options);

    this.name = 'PersistenceError';

    this.code = code;
    this.collection = collection;
    this.filter = filter;

    Error.captureStackTrace(this, PersistenceError);
  }
}

type ValidationFieldError = {
  path: string;
  message: string;
}

interface ValidationErrorOptions extends ErrorOptions {
  entityName: string;
  errors: ValidationFieldError[];
}

export class ValidationError extends KnownError {
  public readonly entityName: string;
  public readonly errors: ValidationFieldError[];

  constructor(message: string, options: ValidationErrorOptions) {
    const { 
      errors,
      entityName, 
      ..._options 
    } = options;

    super(message, _options);

    this.name = 'ValidationError';

    this.entityName = entityName;
    this.errors = errors;

    Error.captureStackTrace(this, ValidationError);
  }
}

export class LichessError extends KnownError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = 'LichessError';

    Error.captureStackTrace(this, LichessError);
  }
}

interface SlackErrorOptions extends ErrorOptions {
  code: string;
}

export class SlackError extends KnownError {
  public readonly code: string;

  constructor(message: string, options: SlackErrorOptions) {
    const { code, ..._options } = options;

    super(message, _options);

    this.name = 'SlackError';
    
    this.code = code;

    Error.captureStackTrace(this, SlackError);
  }
}
