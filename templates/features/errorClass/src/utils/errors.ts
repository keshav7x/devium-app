export class AppError extends Error {
  readonly statusCode: number;

  constructor(
    message: string,
    statusCode: number,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = new.target.name;
    this.statusCode =
      Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600
        ? statusCode
        : 500;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad Request", options?: { cause?: unknown }) {
    super(message, 400, options);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", options?: { cause?: unknown }) {
    super(message, 401, options);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", options?: { cause?: unknown }) {
    super(message, 403, options);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not Found", options?: { cause?: unknown }) {
    super(message, 404, options);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", options?: { cause?: unknown }) {
    super(message, 409, options);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", options?: { cause?: unknown }) {
    super(message, 400, options);
  }
}

export class InternalServerError extends AppError {
  constructor(message = "Internal Server Error", options?: { cause?: unknown }) {
    super(message, 500, options);
  }
}
