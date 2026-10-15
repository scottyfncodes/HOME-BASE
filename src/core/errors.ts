export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: "not_found" | "forbidden" | "validation" | "unauthenticated" | "conflict" | "unavailable",
    public readonly status: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, "not_found", 404);
  }
}
export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to that.") {
    super(message, "forbidden", 403);
  }
}
export class UnauthenticatedError extends AppError {
  constructor(message = "Please sign in.") {
    super(message, "unauthenticated", 401);
  }
}
export class ValidationError extends AppError {
  constructor(
    message = "Please check the form.",
    public readonly fields: Record<string, string> = {},
  ) {
    super(message, "validation", 400);
  }
}
export class ConflictError extends AppError {
  constructor(message = "That conflicts with existing data.") {
    super(message, "conflict", 409);
  }
}
export class UnavailableError extends AppError {
  constructor(message = "That feature is not available on this server.") {
    super(message, "unavailable", 503);
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
