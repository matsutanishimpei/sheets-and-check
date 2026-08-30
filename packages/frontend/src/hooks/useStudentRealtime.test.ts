// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStudentRealtime } from './useStudentRealtime';

const props = {
  supabase: null,
  studentClassroomId: 'room-1',
  studentToken: 'student-jwt',
  addToast: vi.fn(),
  onTeacherReset: vi.fn(),
  onTeacherEvict: vi.fn(),
  onTeacherLockState: vi.fn(),
  onRoomLayoutUpdated: vi.fn(),
};

describe('useStudentRealtime Student answer relay', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reports success only for a successful Worker response and sends no client identity', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const { result } = renderHook(() => useStudentRealtime(props));

    let sendResult: 'ok' | 'error' = 'error';
    await act(async () => {
      sendResult = await result.current.sendStudentToTeacherBroadcast('1,1', 'ok', 'Forged Name', 'FORGED1', 'understood');
    });

    expect(sendResult).toBe('ok');
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(request.body as string)).toEqual({ seatId: '1,1', status: 'ok', comment: 'understood' });
    expect(request.headers).toMatchObject({ Authorization: 'Bearer student-jwt' });
  });

  it.each([401, 403, 429, 500])('reports error for Worker HTTP %s', async (status) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status }));
    const { result } = renderHook(() => useStudentRealtime(props));

    let sendResult: 'ok' | 'error' = 'ok';
    await act(async () => {
      sendResult = await result.current.sendStudentToTeacherBroadcast('1,1', 'ng', 'Name', 'STU001');
    });
    expect(sendResult).toBe('error');
  });

  it('reports error for a network failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network failed'));
    const { result } = renderHook(() => useStudentRealtime(props));

    let sendResult: 'ok' | 'error' = 'ok';
    await act(async () => {
      sendResult = await result.current.sendStudentToTeacherBroadcast('1,1', 'ng', 'Name', 'STU001');
    });
    expect(sendResult).toBe('error');
  });

  it('keeps the four Teacher-to-Student control event listeners active', async () => {
    const handlers = new Map<string, (response: { payload?: Record<string, unknown> }) => void>();
    const channel: any = {
      on: vi.fn((_type: string, filter: { event: string }, callback: (response: { payload?: Record<string, unknown> }) => void) => {
        handlers.set(filter.event, callback);
        return channel;
      }),
      subscribe: vi.fn((callback?: (status: string) => void) => {
        callback?.('SUBSCRIBED');
        return channel;
      }),
      unsubscribe: vi.fn(),
    };
    const callbacks = {
      onTeacherReset: vi.fn(),
      onTeacherEvict: vi.fn(),
      onTeacherLockState: vi.fn(),
      onRoomLayoutUpdated: vi.fn(),
    };
    const supabase: any = {
      realtime: { setAuth: vi.fn().mockResolvedValue(undefined) },
      channel: vi.fn(() => channel),
      removeChannel: vi.fn().mockResolvedValue('ok'),
    };

    renderHook(() => useStudentRealtime({ ...props, ...callbacks, supabase }));
    await waitFor(() => expect(handlers.size).toBe(4));

    act(() => {
      handlers.get('teacher_reset')?.({});
      handlers.get('student_evicted')?.({ payload: { seatId: '1,1' } });
      handlers.get('teacher_lock_state')?.({ payload: { locked: true } });
      handlers.get('room_layout_updated')?.({});
    });
    expect(callbacks.onTeacherReset).toHaveBeenCalledOnce();
    expect(callbacks.onTeacherEvict).toHaveBeenCalledWith('1,1');
    expect(callbacks.onTeacherLockState).toHaveBeenCalledWith(true);
    expect(callbacks.onRoomLayoutUpdated).toHaveBeenCalledOnce();
  });

  it('activates fallback on CLOSED and retries with status monitoring until SUBSCRIBED', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const makeChannel = () => {
      const channel: any = {
        on: vi.fn(() => channel),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      };
      return channel;
    };
    const firstChannel = makeChannel();
    const retryChannel = makeChannel();
    const supabase: any = {
      realtime: { setAuth: vi.fn().mockResolvedValue(undefined) },
      channel: vi.fn()
        .mockReturnValueOnce(firstChannel)
        .mockReturnValueOnce(retryChannel),
      removeChannel: vi.fn().mockResolvedValue('ok'),
    };

    const { result } = renderHook(() => useStudentRealtime({ ...props, supabase }));
    await act(async () => undefined);
    const firstStatusHandler = firstChannel.subscribe.mock.calls[0]?.[0];
    expect(firstStatusHandler).toBeTypeOf('function');

    act(() => firstStatusHandler('CLOSED'));
    expect(result.current.isFallbackActive).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(10000);
      await Promise.resolve();
    });
    const retryStatusHandler = retryChannel.subscribe.mock.calls[0]?.[0];
    expect(supabase.removeChannel).toHaveBeenCalledWith(firstChannel);
    expect(retryStatusHandler).toBeTypeOf('function');

    act(() => retryStatusHandler('SUBSCRIBED'));
    expect(result.current.isFallbackActive).toBe(false);
  });

  it('does not retry after unmount', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const channel: any = {
      on: vi.fn(() => channel),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    };
    const supabase: any = {
      realtime: { setAuth: vi.fn().mockResolvedValue(undefined) },
      channel: vi.fn(() => channel),
      removeChannel: vi.fn().mockResolvedValue('ok'),
    };

    const rendered = renderHook(() => useStudentRealtime({ ...props, supabase }));
    await act(async () => undefined);
    const statusHandler = channel.subscribe.mock.calls[0]?.[0];
    act(() => statusHandler('TIMED_OUT'));
    rendered.unmount();
    act(() => vi.advanceTimersByTime(10000));

    expect(supabase.channel).toHaveBeenCalledTimes(1);
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
  });
});
