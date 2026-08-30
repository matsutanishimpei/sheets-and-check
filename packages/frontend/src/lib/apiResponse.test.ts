import { describe, expect, it } from 'vitest';
import { extractErrorCode, extractErrorMessage, isTeacherLoginResponse, readResponseBody } from './apiResponse';

describe('apiResponse helpers', () => {
  it('readResponseBody parses JSON responses', async () => {
    const response = new Response(JSON.stringify({ token: 'jwt', supabaseToken: 'sb', teacher: { id: '1', username: 'teacher_admin' } }), {
      headers: { 'content-type': 'application/json' },
    });

    await expect(readResponseBody(response)).resolves.toEqual({
      token: 'jwt',
      supabaseToken: 'sb',
      teacher: { id: '1', username: 'teacher_admin' },
    });
  });

  it('readResponseBody preserves non-JSON responses as text', async () => {
    const response = new Response('<!doctype html><html><body>Login</body></html>', {
      headers: { 'content-type': 'text/html' },
    });

    await expect(readResponseBody(response)).resolves.toBe('<!doctype html><html><body>Login</body></html>');
  });

  it('extractErrorMessage prefers structured error fields', () => {
    expect(extractErrorMessage({ error: '認証失敗' }, 'fallback')).toBe('認証失敗');
    expect(extractErrorMessage({ message: '失敗しました' }, 'fallback')).toBe('失敗しました');
    expect(extractErrorMessage('plain text error', 'fallback')).toBe('plain text error');
    expect(extractErrorMessage(null, 'fallback')).toBe('fallback');
  });

  it('adds only a well-formed stable error code to a user-facing message', () => {
    expect(extractErrorMessage({ error: '認証失敗', code: 'AUTH-T-01' }, 'fallback'))
      .toBe('認証失敗（エラーコード: AUTH-T-01）');
    expect(extractErrorCode({ code: 'RT-RELAY-01' })).toBe('RT-RELAY-01');
    expect(extractErrorCode({ code: 'unsafe code: secret' })).toBeNull();
  });

  it('isTeacherLoginResponse validates the login payload shape', () => {
    expect(
      isTeacherLoginResponse({
        token: 'jwt',
        supabaseToken: 'sb',
        teacher: { id: 'teacher-1', username: 'teacher_admin' },
      })
    ).toBe(true);

    expect(isTeacherLoginResponse({ token: 'jwt', teacher: { id: 'teacher-1' } })).toBe(false);
  });
});
