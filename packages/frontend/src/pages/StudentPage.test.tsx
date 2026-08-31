// @vitest-environment jsdom
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentPage } from './StudentPage';

const mocks = vi.hoisted(() => ({
  getRoom: vi.fn(),
  getToken: vi.fn(),
  useSupabaseClient: vi.fn(),
  addToast: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ roomId: 'room-123' }),
  useNavigate: () => vi.fn(),
}));
vi.mock('../lib/hc', () => ({
  default: {
    api: {
      rooms: {
        ':id': {
          $get: mocks.getRoom,
          'student-token': { $post: mocks.getToken },
        },
      },
    },
  },
}));
vi.mock('../hooks/useSupabaseClient', () => ({
  useSupabaseClient: mocks.useSupabaseClient,
}));
vi.mock('../hooks/useStudentRealtime', () => ({
  useStudentRealtime: () => ({ isFallbackActive: false, sendStudentToTeacherBroadcast: vi.fn() }),
}));
vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('../lib/storage', () => ({
  studentSession: {
    getToken: () => '', getId: () => null, getName: () => null, getSeatId: () => null, getPrevSeatId: () => null,
    saveToken: vi.fn(), removeSeatId: vi.fn(), saveId: vi.fn(), saveName: vi.fn(), saveLastRoomId: vi.fn(),
    saveSeatId: vi.fn(), savePrevSeatId: vi.fn(),
  },
}));
vi.mock('../containers/StudentView', () => ({ StudentView: () => <div>student-view</div> }));

describe('StudentPage Supabase decoupling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSupabaseClient.mockReturnValue({ supabase: {} });
    mocks.getRoom.mockResolvedValue(new Response(JSON.stringify({
      id: 'room-123', name: 'Room without credentials', grid: [], isActive: true,
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
  });

  afterEach(() => cleanup());

  it('loads a Room API response without Supabase fields and has no constant connection badge', async () => {
    render(<StudentPage />);

    await waitFor(() => expect(mocks.getRoom).toHaveBeenCalled());
    expect(mocks.useSupabaseClient).toHaveBeenCalledWith('');
    expect(screen.queryByText('Realtime 有効')).not.toBeInTheDocument();
    expect(screen.queryByText('Supabase 未接続')).not.toBeInTheDocument();
    expect(mocks.addToast).not.toHaveBeenCalledWith('error', expect.stringContaining('Supabase 接続設定'));
  });
});
