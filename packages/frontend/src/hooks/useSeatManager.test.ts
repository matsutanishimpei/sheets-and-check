// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSeatManager } from './useSeatManager';
import { clearLegacyResponseData } from '../lib/storage';

describe('useSeatManager Custom Hook', () => {
  const addToastMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    addToastMock.mockClear();
    vi.restoreAllMocks();
  });

  it('should initialize with empty statuses and unlocked seats', () => {
    const { result } = renderHook(() =>
      useSeatManager({ roomId: 'test-room-1', addToast: addToastMock })
    );

    expect(result.current.liveStatuses).toEqual({});
    expect(result.current.isSeatLocked).toBe(false);
  });

  it('does not restore or persist response data in localStorage', () => {
    localStorage.setItem('seat_statuses_room_test-room-1', JSON.stringify({
      'seat-A1': { name: '過去の学生', status: 'ok' },
    }));
    clearLegacyResponseData();
    const { result } = renderHook(() =>
      useSeatManager({ roomId: 'test-room-1', addToast: addToastMock })
    );

    expect(result.current.liveStatuses).toEqual({});
    act(() => result.current.setLiveStatuses({
      'seat-A1': { name: '現在の学生', status: 'ng', comment: '質問' },
    }));
    expect(localStorage.getItem('seat_statuses_room_test-room-1')).toBeNull();
  });

  it('should toggle seat lock status and emit correct toasts', () => {
    const { result } = renderHook(() =>
      useSeatManager({ roomId: 'test-room-1', addToast: addToastMock })
    );

    act(() => {
      const lockVal = result.current.toggleSeatLock();
      expect(lockVal).toBe(true);
    });

    expect(result.current.isSeatLocked).toBe(true);
    expect(addToastMock).toHaveBeenCalledWith('info', expect.stringContaining('ロック'));

    act(() => {
      const lockVal = result.current.toggleSeatLock();
      expect(lockVal).toBe(false);
    });

    expect(result.current.isSeatLocked).toBe(false);
    expect(addToastMock).toHaveBeenCalledWith('info', expect.stringContaining('解除'));
  });

  it('should remove a single live status', () => {
    const mockStatuses = {
      'seat-A1': { name: '学生A', status: 'ok' as const },
      'seat-B2': { name: '学生B', status: 'ng' as const },
    };
    const { result } = renderHook(() =>
      useSeatManager({ roomId: 'test-room-1', addToast: addToastMock })
    );

    act(() => result.current.setLiveStatuses(mockStatuses));
    act(() => {
      result.current.removeLiveStatus('seat-A1');
    });

    expect(result.current.liveStatuses).toEqual({
      'seat-B2': { name: '学生B', status: 'ng' },
    });
  });

  it('should reset statuses without removing students on bulkResetLiveStatuses', () => {
    const mockStatuses = {
      'seat-A1': { name: '学生A', status: 'ok' as const, comment: 'わかった', answeredAt: '10:00:00' },
      'seat-B2': { name: '学生B', status: 'ng' as const, comment: 'わからない', answeredAt: '10:00:01' },
    };

    const { result } = renderHook(() =>
      useSeatManager({ roomId: 'test-room-1', addToast: addToastMock })
    );

    act(() => result.current.setLiveStatuses(mockStatuses));
    act(() => {
      const success = result.current.bulkResetLiveStatuses();
      expect(success).toBe(true);
    });

    expect(result.current.liveStatuses).toEqual({
      'seat-A1': { name: '学生A', status: 'none', comment: '', answeredAt: undefined },
      'seat-B2': { name: '学生B', status: 'none', comment: '', answeredAt: undefined },
    });
    expect(addToastMock).toHaveBeenCalledWith('success', expect.any(String));
  });

  it('should fail bulk reset when roomId is null', () => {
    const { result } = renderHook(() =>
      useSeatManager({ roomId: null, addToast: addToastMock })
    );

    act(() => {
      const success = result.current.bulkResetLiveStatuses();
      expect(success).toBe(false);
    });

    expect(addToastMock).toHaveBeenCalledWith('error', expect.any(String));
  });
});
