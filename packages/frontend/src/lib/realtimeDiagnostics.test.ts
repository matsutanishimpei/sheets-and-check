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
