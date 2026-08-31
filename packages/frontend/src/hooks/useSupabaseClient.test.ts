// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSupabaseClient } from './useSupabaseClient';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  setAuth: vi.fn(),
  client: { realtime: { setAuth: vi.fn() } },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}));

describe('useSupabaseClient environment configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.client.realtime.setAuth = mocks.setAuth;
    mocks.createClient.mockReturnValue(mocks.client);
    vi.stubEnv('VITE_SUPABASE_URL', ' https://project.supabase.co/realtime/v1/ ');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', ' anon-key-from-env ');
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ['Teacher', 'teacher-realtime-jwt'],
    ['Student', 'student-realtime-jwt'],
  ])('creates the %s client only from Vite environment variables', async (_role, token) => {
    const { result } = renderHook(() => useSupabaseClient(token));

    expect(result.current.supabase).toBe(mocks.client);
    expect(mocks.createClient).toHaveBeenCalledWith('https://project.supabase.co', 'anon-key-from-env');
    await waitFor(() => expect(mocks.setAuth).toHaveBeenCalledWith(token));
  });

  it('does not create a client when either environment variable is missing', () => {
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    const { result } = renderHook(() => useSupabaseClient('token'));

    expect(result.current.supabase).toBeNull();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
