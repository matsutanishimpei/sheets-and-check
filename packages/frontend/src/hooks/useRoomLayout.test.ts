// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRoomLayout } from './useRoomLayout';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));

vi.mock('../lib/hc', () => ({
  default: {
    api: {
      rooms: {
        $get: api.get,
        $post: api.post,
        ':id': { $put: api.put },
      },
    },
  },
}));
vi.mock('../lib/storage', () => ({
  activeRoom: { save: vi.fn(), clear: vi.fn() },
  supabaseConfig: { getUrl: () => '', getKey: () => '' },
  teacherAuth: { getSupabaseToken: () => '' },
}));

const response = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' },
});

describe('useRoomLayout save result', () => {
  const addToast = vi.fn();
  const defaultProps = {
    addToast,
    onClearLiveStatuses: vi.fn(),
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'anon-key',
    setSupabaseUrl: vi.fn(),
    setSupabaseAnonKey: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(response(200, { rooms: [] }));
  });

  it('returns true after a successful D1 save', async () => {
    api.post.mockResolvedValue(response(201, { id: 'room-created' }));
    const { result } = renderHook(() => useRoomLayout(defaultProps));

    await act(async () => {
      expect(await result.current.saveClassroom()).toBe(true);
    });
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('returns false without calling D1 when validation fails', async () => {
    const { result } = renderHook(() => useRoomLayout({
      ...defaultProps,
      supabaseUrl: '',
      supabaseAnonKey: '',
    }));

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
});
