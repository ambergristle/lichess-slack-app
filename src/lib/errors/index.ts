
class KnownError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = 'KnownError';
  }
}

type ValidationFieldError = {
  path: string;
  message: string;
}

interface ValidationErrorOptions extends ErrorOptions {
  documentName: string;
  errors: ValidationFieldError[];
}

export class ValidationError extends KnownError {
  public readonly documentName: string;
  public readonly errors: ValidationFieldError[];

  constructor(message: string, options: ValidationErrorOptions) {
    const { 
      errors,
      documentName, 
      ..._options 
    } = options;

    super(message, _options);

    this.name = 'ValidationError';

    this.documentName = documentName;
    this.errors = errors;
  }
}

export class LichessError extends KnownError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = 'LichessError';
  }
}

export class SlackError extends KnownError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = 'SlackError';
  }
}
