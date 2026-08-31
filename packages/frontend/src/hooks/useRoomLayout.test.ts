// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRoomLayout } from './useRoomLayout';

const api = vi.hoisted(() => ({ get: vi.fn(), getById: vi.fn(), post: vi.fn(), put: vi.fn() }));

vi.mock('../lib/hc', () => ({
  default: {
    api: {
      rooms: {
        $get: api.get,
        $post: api.post,
        ':id': { $get: api.getById, $put: api.put },
      },
    },
  },
}));
vi.mock('../lib/storage', () => ({
  activeRoom: { save: vi.fn(), clear: vi.fn() },
  teacherAuth: { getSupabaseToken: () => '' },
}));
vi.mock('./useSupabaseClient', () => ({ createEnvironmentSupabaseClient: () => null }));

const response = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' },
});

describe('useRoomLayout save result', () => {
  const addToast = vi.fn();
  const defaultProps = {
    addToast,
    onClearLiveStatuses: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(response(200, { rooms: [] }));
    api.getById.mockResolvedValue(response(200, { id: 'room-default', name: 'Default room', grid: [], isActive: true }));
  });

  it('returns true after a successful D1 save', async () => {
    api.post.mockResolvedValue(response(201, { id: 'room-created' }));
    const { result } = renderHook(() => useRoomLayout(defaultProps));

    await act(async () => {
      expect(await result.current.saveClassroom()).toBe(true);
    });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post.mock.calls[0][0].json).not.toHaveProperty('supabaseUrl');
    expect(api.post.mock.calls[0][0].json).not.toHaveProperty('supabaseAnonKey');
  });

  it('returns false without calling D1 when the room name is empty', async () => {
    const { result } = renderHook(() => useRoomLayout({
      ...defaultProps,
    }));

    act(() => result.current.setRoomName(''));

    await act(async () => {
      expect(await result.current.saveClassroom()).toBe(false);
    });
    expect(api.post).not.toHaveBeenCalled();
  });

  it.each([401, 500])('returns false when D1 responds with %s', async (status) => {
    api.post.mockResolvedValue(response(status, { error: 'save rejected' }));
    const { result } = renderHook(() => useRoomLayout(defaultProps));

    await act(async () => {
      expect(await result.current.saveClassroom()).toBe(false);
    });
  });

  it('returns false after a network error', async () => {
    api.post.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useRoomLayout(defaultProps));

    await act(async () => {
      expect(await result.current.saveClassroom()).toBe(false);
    });
  });

  it('loads legacy Room responses without exposing Supabase settings in state', async () => {
    const { result } = renderHook(() => useRoomLayout(defaultProps));
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    api.getById.mockResolvedValue(response(200, {
      id: 'room-legacy', name: 'Legacy room', grid: [], isActive: true,
      supabaseUrl: 'https://legacy.supabase.co', supabaseAnonKey: 'legacy-key',
    }));

    await act(async () => result.current.loadClassroom('room-legacy'));

    expect(result.current.roomName).toBe('Legacy room');
    expect(result.current).not.toHaveProperty('supabaseUrl');
    expect(result.current).not.toHaveProperty('supabaseAnonKey');
  });
});
