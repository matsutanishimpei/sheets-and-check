import { describe, expect, it, vi } from 'vitest';
import { logRealtimeFailure, toSafeRealtimeError } from './realtimeDiagnostics';

describe('Realtime diagnostics', () => {
  it('retains useful error fields while redacting credentials', () => {
    const jwt = 'eyJheader.payload.signature';
    const error = Object.assign(new Error(`join failed: Bearer ${jwt}; apikey: private-key-value`), { code: '403' });
    const safe = toSafeRealtimeError(error);

    expect(safe).toMatchObject({ name: 'Error', code: '403' });
    expect(JSON.stringify(safe)).not.toContain(jwt);
    expect(JSON.stringify(safe)).not.toContain('private-key-value');
  });

  it('retains only safe cause fields and redacts credential values', () => {
    const jwt = 'eyJheader.payload.signature';
    const error = Object.assign(new Error('join failed'), {
      cause: {
        name: 'AuthError',
        message: `Authorization: Bearer ${jwt}`,
        reason: 'JWT_SECRET: super-secret-value',
        code: '403',
        status: 403,
        token: 'must-not-be-copied',
      },
    });

    const safe = toSafeRealtimeError(error);

    expect(safe).toMatchObject({
      cause: {
        name: 'AuthError',
        message: expect.stringContaining('[REDACTED]'),
        reason: expect.stringContaining('[REDACTED]'),
        code: '403',
        status: 403,
      },
    });
    const serialized = JSON.stringify(safe);
    expect(serialized).not.toContain(jwt);
    expect(serialized).not.toContain('super-secret-value');
    expect(serialized).not.toContain('must-not-be-copied');
    expect((safe?.cause as Record<string, unknown>)).not.toHaveProperty('token');
  });

  it('preserves the existing shape when an error has no cause', () => {
    expect(toSafeRealtimeError(Object.assign(new Error('join failed'), { code: '403' }))).toEqual({
      name: 'Error',
      message: 'join failed',
      code: '403',
    });
  });

  it('logs the stable code, status, room and channel without identity data', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logRealtimeFailure('RT-T-MAIN-01', 'room-1', 'teacher-main', 'CHANNEL_ERROR', new Error('denied'));

    expect(errorSpy).toHaveBeenCalledWith(
      '[RT-T-MAIN-01] Realtime channel unavailable',
      expect.objectContaining({
        errorCode: 'RT-T-MAIN-01',
        status: 'CHANNEL_ERROR',
        roomId: 'room-1',
        channel: 'teacher-main',
      }),
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('studentName');
    errorSpy.mockRestore();
  });
});
