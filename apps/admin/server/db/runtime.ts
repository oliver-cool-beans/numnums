export type DataStatus = 'ready' | 'env-missing' | 'schema-pending';

type PostgrestLikeError = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message?: string;
};

function asPostgrestLikeError(error: unknown): PostgrestLikeError | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  return error;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  const postgrestError = asPostgrestLikeError(error);

  if (postgrestError) {
    const parts = [postgrestError.message, postgrestError.details, postgrestError.hint]
      .map((value) => value?.trim())
      .filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' | ');
    }
  }

  return typeof error === 'string' ? error : JSON.stringify(error);
}

export function isPermissionDeniedError(error: unknown) {
  const postgrestError = asPostgrestLikeError(error);
  const message = getErrorMessage(error).toLowerCase();

  return postgrestError?.code === '42501' || message.includes('permission denied');
}

export function isBlankPostgrestError(error: unknown) {
  const postgrestError = asPostgrestLikeError(error);

  return Boolean(postgrestError && postgrestError.message === '' && !postgrestError.details && !postgrestError.hint);
}

export function isSchemaPendingError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes('does not exist') ||
    message.includes('could not find the table') ||
    message.includes('schema cache') ||
    message.includes('relation')
  );
}

export function isSetupBlockingError(error: unknown) {
  return isSchemaPendingError(error) || isPermissionDeniedError(error) || isBlankPostgrestError(error);
}

export function getSetupErrorMessage(error: unknown) {
  if (isBlankPostgrestError(error)) {
    return 'Supabase rejected this table through the Data API without returning a message. Check that the table is exposed and that the admin RLS migration has been applied.';
  }

  if (isPermissionDeniedError(error)) {
    const message = getErrorMessage(error);
    return message || 'Supabase denied access to one or more admin tables. Check Data API grants and the admin RLS policies for authenticated users.';
  }

  return getErrorMessage(error);
}

export type DataListResult<T> = {
  status: DataStatus;
  items: T[];
  errorMessage: string | null;
};