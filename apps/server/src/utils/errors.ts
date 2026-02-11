export class AppError extends Error {
  constructor(
    public code: string,
    public httpStatus: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  EVENT_NOT_FOUND: () => new AppError('EVENT_NOT_FOUND', 404, 'Event not found'),
  INVALID_CREDENTIALS: () => new AppError('INVALID_CREDENTIALS', 401, 'Invalid credentials'),
  UNAUTHORIZED: () => new AppError('UNAUTHORIZED', 401, 'Unauthorized'),
  INVALID_TOKEN: () => new AppError('INVALID_TOKEN', 401, 'Invalid or expired token'),
  ROOM_NOT_FOUND: () => new AppError('ROOM_NOT_FOUND', 404, 'Chat room not found'),
  ADMIN_ONLY_ROOM: () => new AppError('ADMIN_ONLY_ROOM', 403, 'This room is admin only'),
  RATE_LIMIT_EXCEEDED: () => new AppError('RATE_LIMIT_EXCEEDED', 429, 'Too many messages, slow down'),
  MESSAGE_TOO_LONG: () => new AppError('MESSAGE_TOO_LONG', 400, 'Message exceeds 400 characters'),
  MESSAGE_EMPTY: () => new AppError('MESSAGE_EMPTY', 400, 'Message cannot be empty'),
  MESSAGE_NOT_FOUND: () => new AppError('MESSAGE_NOT_FOUND', 404, 'Message not found'),
  MESSAGE_ALREADY_DELETED: () => new AppError('MESSAGE_ALREADY_DELETED', 400, 'Message already deleted'),
  VALIDATION_ERROR: (details: string) => new AppError('VALIDATION_ERROR', 400, `Validation error: ${details}`),
  FORBIDDEN: (msg = 'Forbidden') => new AppError('FORBIDDEN', 403, msg),
};

export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
    };
  }
  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  };
}
