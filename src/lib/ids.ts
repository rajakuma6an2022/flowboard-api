import { AppError } from './errors'

const OBJECT_ID = /^[0-9a-f]{24}$/i

/**
 * Strict ObjectId check. (mongoose.isValidObjectId also accepts any 12-character string,
 * which is not what we want from a URL parameter.)
 */
export function parseId(value: unknown): string {
  if (typeof value !== 'string' || !OBJECT_ID.test(value)) {
    throw new AppError(400, 'VALIDATION', 'Invalid card id.')
  }
  return value
}

/** Escape regex metacharacters so user input is matched literally (also blocks ReDoS patterns). */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
