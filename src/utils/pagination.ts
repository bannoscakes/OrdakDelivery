import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MIN_PAGE_SIZE } from '@config/constants';

/**
 * Normalize and validate pagination parameters
 */
export function normalizePagination(params: {
  page?: number;
  limit?: number;
}): {
  page: number;
  limit: number;
  skip: number;
} {
  // Validate and normalize page (must be >= 1)
  let page = params.page || 1;
  if (page < 1) {
    page = 1;
  }

  // Validate and normalize limit (must be between MIN and MAX)
  let limit = params.limit || DEFAULT_PAGE_SIZE;
  if (limit < MIN_PAGE_SIZE) {
    limit = MIN_PAGE_SIZE;
  }
  if (limit > MAX_PAGE_SIZE) {
    limit = MAX_PAGE_SIZE;
  }

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}
