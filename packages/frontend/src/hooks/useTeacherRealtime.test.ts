// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dispatch, SetStateAction } from 'react';
import type { LiveSeatStatus } from '@my-app/shared';
import { useTeacherRealtime } from './useTeacherRealtime';

describe('useTeacherRealtime authorization and Teacher events', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('joins private authorized channels and sends the four Teacher control events', async () => {
    const mainSend = vi.fn().mockResolvedValue('ok');
    const makeChannel = (send = vi.fn().mockResolvedValue('ok')) => {
      const channel: any = {
        on: vi.fn(() => channel),
        subscribe: vi.fn((callback?: (status: string) => void) => {
          callback?.('SUBSCRIBED');
          return channel;
        }),
        send,
        unsubscribe: vi.fn(),
      };
      return channel;
    };
    const mainChannel = makeChannel(mainSend);
    const inboxChannel = makeChannel();
    const supabase: any = {
      realtime: { setAuth: vi.fn().mockResolvedValue(undefined) },
      channel: vi.fn((topic: string) => topic.endsWith(':teacher') ? inboxChannel : mainChannel),
      removeChannel: vi.fn().mockResolvedValue('ok'),
    };
    const setLiveStatuses = vi.fn();
    const addToast = vi.fn();

    const { result } = renderHook(() => useTeacherRealtime({
      supabase,
      realtimeToken: 'teacher-realtime-jwt',
      roomId: 'room-1',
      isSeatLocked: false,
      setLiveStatuses,
      addToast,
    }));

    await waitFor(() => expect(supabase.channel).toHaveBeenCalledTimes(2));
    expect(supabase.realtime.setAuth).toHaveBeenCalledWith('teacher-realtime-jwt');
    expect(supabase.channel).toHaveBeenCalledWith('room:room-1', expect.objectContaining({ config: expect.objectContaining({ private: true }) }));

    await act(async () => {
      await result.current.sendTeacherResetBroadcast();
      await result.current.sendStudentEvictedBroadcast('1,1');
      await result.current.sendTeacherLockStateBroadcast(true);
      await result.current.sendRoomLayoutUpdatedBroadcast();
    });

    const events = mainSend.mock.calls.map(([message]) => message.event);
    expect(events).toEqual(expect.arrayContaining([
      'teacher_reset',
      'student_evicted',
      'teacher_lock_state',
      'room_layout_updated',
    ]));
  });

  it('removes online and offline listeners on every unmount', () => {
    const addListener = vi.spyOn(window, 'addEventListener');
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const props = {
      supabase: null,
      realtimeToken: '',
      roomId: null,
      isSeatLocked: false,
      setLiveStatuses: vi.fn(),
      addToast: vi.fn(),
    };

    const first = renderHook(() => useTeacherRealtime(props));
    first.unmount();
    const second = renderHook(() => useTeacherRealtime(props));
    second.unmount();

    for (const eventName of ['online', 'offline']) {
      const added = addListener.mock.calls.filter(([name]) => name === eventName);
      const removed = removeListener.mock.calls.filter(([name]) => name === eventName);
      expect(added).toHaveLength(2);
      expect(removed).toHaveLength(2);
      expect(removed.map(([, handler]) => handler)).toEqual(added.map(([, handler]) => handler));
    }
  });

  it('keeps only the latest answer per seat and records the Teacher receive time', async () => {
    let receiveStudentEvent: ((response: { payload: Record<string, unknown> }) => void) | undefined;
    const makeChannel = (isInbox = false) => {
      const channel: any = {
        on: vi.fn((_type: string, _filter: unknown, callback: typeof receiveStudentEvent) => {
          if (isInbox) receiveStudentEvent = callback;
          return channel;
        }),
        subscribe: vi.fn((callback?: (status: string) => void) => {
          callback?.('SUBSCRIBED');
          return channel;
        }),
        send: vi.fn().mockResolvedValue('ok'),
        unsubscribe: vi.fn(),
      };
      return channel;
    };
    const mainChannel = makeChannel();
    const inboxChannel = makeChannel(true);
    const supabase: any = {
      realtime: { setAuth: vi.fn().mockResolvedValue(undefined) },
      channel: vi.fn((topic: string) => topic.endsWith(':teacher') ? inboxChannel : mainChannel),
      removeChannel: vi.fn().mockResolvedValue('ok'),
    };
    let statuses: Record<string, LiveSeatStatus> = {};
    const setLiveStatuses: Dispatch<SetStateAction<Record<string, LiveSeatStatus>>> = (value) => {
      statuses = typeof value === 'function' ? value(statuses) : value;
    };

    const { result } = renderHook(() => useTeacherRealtime({
      supabase,
      realtimeToken: 'teacher-realtime-jwt',
      roomId: 'room-1',
      isSeatLocked: false,
      setLiveStatuses,
      addToast: vi.fn(),
    }));
    await waitFor(() => expect(receiveStudentEvent).toBeTypeOf('function'));

    act(() => receiveStudentEvent?.({ payload: {
      seatId: '1,1', status: 'ok', studentId: 'STU001', studentName: 'Claim Name', comment: 'first',
    } }));
    const firstTimestamp = result.current.realtimeLogs[0]?.timestamp;
    expect(firstTimestamp).toBeTruthy();
    expect(statuses['1,1']).toMatchObject({ status: 'ok', answeredAt: firstTimestamp });

    act(() => receiveStudentEvent?.({ payload: {
      seatId: '1,1', status: 'ng', studentId: 'STU001', studentName: 'Claim Name', comment: 'latest',
    } }));
    expect(result.current.realtimeLogs).toHaveLength(1);
    expect(result.current.realtimeLogs[0]).toMatchObject({
      seatId: '1,1', status: 'ng', comment: 'latest', studentId: 'STU001', studentName: 'Claim Name',
    });
    expect(statuses['1,1']).toMatchObject({ status: 'ng', comment: 'latest' });

    await act(async () => {
      expect(await result.current.sendTeacherResetBroadcast()).toBe('ok');
    });
    expect(result.current.realtimeLogs).toEqual([]);
  });
});
