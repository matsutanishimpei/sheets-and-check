export type TeacherLoginResponse = {
  token: string;
  supabaseToken: string;
  teacher: {
    id: string;
    username: string;
  };
};

type ResponseLike = {
  clone(): {
    text(): Promise<string>;
  };
  headers: {
    get(name: string): string | null;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function readResponseBody(response: ResponseLike): Promise<unknown> {
  const rawBody = await response.clone().text();
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';

  if (contentType.includes('application/json')) {
    try {
      return rawBody ? JSON.parse(rawBody) : null;
    } catch {
      return rawBody.trim() ? rawBody : null;
    }
  }

  return rawBody.trim() ? rawBody : null;
}

export function extractErrorMessage(body: unknown, fallbackMessage: string): string {
  const code = extractErrorCode(body);
  const withCode = (message: string) => code ? `${message}（エラーコード: ${code}）` : message;
  if (typeof body === 'string') {
    return withCode(body);
  }

  if (isRecord(body)) {
    const error = body.error;
    if (typeof error === 'string' && error.trim()) {
      return withCode(error);
    }

    const message = body.message;
    if (typeof message === 'string' && message.trim()) {
      return withCode(message);
    }
  }

  return fallbackMessage;
}

export function extractErrorCode(body: unknown): string | null {
  if (!isRecord(body) || typeof body.code !== 'string') return null;
  return /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/.test(body.code) ? body.code : null;
}

export function isTeacherLoginResponse(body: unknown): body is TeacherLoginResponse {
  if (!isRecord(body)) {
    return false;
  }

  const { token, supabaseToken, teacher } = body;
  if (typeof token !== 'string' || typeof supabaseToken !== 'string') {
    return false;
  }

  if (!isRecord(teacher)) {
    return false;
  }

  return typeof teacher.id === 'string' && typeof teacher.username === 'string';
}
