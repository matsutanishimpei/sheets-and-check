export type RealtimeErrorCode = 'RT-T-MAIN-01' | 'RT-T-INBOX-01' | 'RT-S-CHANNEL-01';

const MAX_ERROR_TEXT_LENGTH = 500;

const redactCredentials = (value: string) => value
  .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
  .replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_JWT]')
  .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+\b/gi, '[REDACTED_KEY]')
  .replace(/((?:authorization|api[ _-]?key|anon[ _-]?key|publishable[ _-]?key|password|jwt[ _-]?secret|service[ _-]?role[ _-]?key)["'\s:=]+)[^\s,;"'}]+/gi, '$1[REDACTED]')
  .slice(0, MAX_ERROR_TEXT_LENGTH);

const toSafeErrorFields = (
  source: Record<string, unknown>,
  fields: readonly string[],
): Record<string, unknown> => {
  const safe: Record<string, unknown> = {};
  for (const key of fields) {
    const value = source[key];
    if (typeof value === 'string') safe[key] = redactCredentials(value);
    else if (typeof value === 'number' || typeof value === 'boolean') safe[key] = value;
  }
  return safe;
};

const toSafeRealtimeCause = (cause: unknown): Record<string, unknown> | undefined => {
  if (cause == null || typeof cause !== 'object') return undefined;

  const source = cause as Record<string, unknown>;
  const safe = toSafeErrorFields(source, ['name', 'message', 'reason', 'code', 'status']);
  if (cause instanceof Error) {
    safe.name = redactCredentials(cause.name);
    safe.message = redactCredentials(cause.message);
  }
  return Object.keys(safe).length ? safe : undefined;
};

export const toSafeRealtimeError = (error: unknown): Record<string, unknown> | undefined => {
  if (error == null) return undefined;

  if (error instanceof Error) {
    const errorWithDetails = error as Error & { code?: unknown; cause?: unknown };
    const cause = toSafeRealtimeCause(errorWithDetails.cause);
    return {
      name: redactCredentials(error.name),
      message: redactCredentials(error.message),
      ...(typeof errorWithDetails.code === 'string' || typeof errorWithDetails.code === 'number'
        ? { code: typeof errorWithDetails.code === 'string'
          ? redactCredentials(errorWithDetails.code)
          : errorWithDetails.code }
        : {}),
      ...(cause ? { cause } : {}),
    };
  }

  if (typeof error === 'object') {
    const source = error as Record<string, unknown>;
    const safe = toSafeErrorFields(source, ['name', 'message', 'code', 'status']);
    const cause = toSafeRealtimeCause(source.cause);
    if (cause) safe.cause = cause;
    return Object.keys(safe).length ? safe : { name: 'UnknownRealtimeError' };
  }

  return { message: redactCredentials(String(error)) };
};

export const logRealtimeFailure = (
  code: RealtimeErrorCode,
  roomId: string,
  channel: 'teacher-main' | 'teacher-inbox' | 'student',
  status: string,
  error?: unknown,
) => {
  console.error(`[${code}] Realtime channel unavailable`, {
    errorCode: code,
    status,
    roomId,
    channel,
    error: toSafeRealtimeError(error),
  });
};
