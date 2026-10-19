export type ErrorCode =
  | 'VALIDATION'
  | 'INVALID_JSON'
  | 'NOT_FOUND'
  | 'VERSION_CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'SERVER_ERROR'
  | 'DB_UNAVAILABLE'

/** An error that is safe to show to the client. Anything else becomes a generic 500. */
export class AppError extends Error {
  readonly status: number
  readonly code: ErrorCode

  constructor(status: number, code: ErrorCode, message: string) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
  }
}

export const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found.`)

export const versionConflict = () =>
  new AppError(
    409,
    'VERSION_CONFLICT',
    'This card was changed elsewhere. Reload to see the latest version.',
  )
