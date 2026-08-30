export type RealtimeErrorCode = 'RT-T-MAIN-01' | 'RT-T-INBOX-01' | 'RT-S-CHANNEL-01';

const MAX_ERROR_TEXT_LENGTH = 500;

const redactCredentials = (value: string) => value
  .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
  .replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_JWT]')
  .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+\b/gi, '[REDACTED_KEY]')
  .replace(/((?:authorization|api[ _-]?key|anon[ _-]?key|publishable[ _-]?key|password|jwt[ _-]?secret|service[ _-]?role[ _-]?key)["'\s:=]+)[^\s,;"'}]+/gi, '$1[REDACTED]')
  .slice(0, MAX_ERROR_TEXT_LENGTH);

export const toSafeRealtimeError = (error: unknown): Record<string, unknown> | undefined => {
  if (error == null) return undefined;

  if (error instanceof Error) {
    const errorWithCode = error as Error & { code?: unknown };
    return {
      name: redactCredentials(error.name),
      message: redactCredentials(error.message),
      ...(typeof errorWithCode.code === 'string' || typeof errorWithCode.code === 'number'
        ? { code: errorWithCode.code }
        : {}),
    };
  }

  if (typeof error === 'object') {
    const source = error as Record<string, unknown>;
    const safe: Record<string, unknown> = {};
    for (const key of ['name', 'message', 'code', 'status']) {
      const value = source[key];
      if (typeof value === 'string') safe[key] = redactCredentials(value);
      else if (typeof value === 'number' || typeof value === 'boolean') safe[key] = value;
    }
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
