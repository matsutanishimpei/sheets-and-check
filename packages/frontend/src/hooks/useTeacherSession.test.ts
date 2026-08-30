// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTeacherSession } from './useTeacherSession';

const mocks = vi.hoisted(() => ({
  saveClassroom: vi.fn(),
  sendRoomLayoutUpdatedBroadcast: vi.fn(),
  roomLayout: {
    roomName: 'Room', setRoomName: vi.fn(), roomId: 'room-1',
    cases: [{ caseName: '通常講義 (標準)', grid: {} }], activeCaseIdx: 0,
    setActiveCaseIdx: vi.fn(), updateActiveCaseName: vi.fn(), addNewCase: vi.fn(),
    deleteCurrentCase: vi.fn(), isLoadingRooms: false, savedRooms: [], isSaving: false,
    isActive: true, setIsActive: vi.fn(), loadClassroom: vi.fn(), saveClassroom: vi.fn(),
    createNewClassroomSession: vi.fn(), fetchRooms: vi.fn(), clearCurrentGrid: vi.fn(),
    deleteClassroom: vi.fn(), updateGridCell: vi.fn(),
  },
  seatManager: {
    liveStatuses: {}, setLiveStatuses: vi.fn(), isSeatLocked: false,
    removeLiveStatus: vi.fn(), bulkResetLiveStatuses: vi.fn(), toggleSeatLock: vi.fn(),
  },
}));

mocks.roomLayout.saveClassroom = mocks.saveClassroom;

vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('../lib/storage', () => ({
  teacherAuth: { getSupabaseToken: () => 'teacher-token' },
  supabaseConfig: { getUrl: () => 'https://test.supabase.co', getKey: () => 'anon-key' },
  activeRoom: { getId: () => null },
}));
vi.mock('./useSupabaseClient', () => ({
  useSupabaseClient: () => ({
    supabaseUrl: 'https://test.supabase.co', setSupabaseUrl: vi.fn(),
    supabaseAnonKey: 'anon-key', setSupabaseAnonKey: vi.fn(),
    supabase: {}, saveSupabaseConfig: vi.fn(),
  }),
}));
vi.mock('./useRoomLayout', () => ({ useRoomLayout: () => mocks.roomLayout }));
vi.mock('./useSeatManager', () => ({ useSeatManager: () => mocks.seatManager }));
vi.mock('./useTeacherRealtime', () => ({
  useTeacherRealtime: () => ({
    realtimeLogs: [], isOnline: true, sendStudentEvictedBroadcast: vi.fn(),
    sendTeacherResetBroadcast: vi.fn(), sendTeacherLockStateBroadcast: vi.fn(),
    sendRoomLayoutUpdatedBroadcast: mocks.sendRoomLayoutUpdatedBroadcast,
  }),
}));

describe('useTeacherSession layout update broadcast', () => {
  beforeEach(() => vi.clearAllMocks());

  it('broadcasts room_layout_updated only after D1 save succeeds', async () => {
    mocks.saveClassroom.mockResolvedValue(true);
    mocks.sendRoomLayoutUpdatedBroadcast.mockResolvedValue('ok');
    const { result } = renderHook(() => useTeacherSession());

    await act(async () => {
      expect(await result.current.saveClassroom()).toBe(true);
    });

    expect(mocks.sendRoomLayoutUpdatedBroadcast).toHaveBeenCalledTimes(1);
    expect(mocks.saveClassroom.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.sendRoomLayoutUpdatedBroadcast.mock.invocationCallOrder[0]);
  });

  it.each(['validation', '401', '500', 'network'])(
    'does not broadcast when the %s save path fails',
    async () => {
      mocks.saveClassroom.mockResolvedValue(false);
      const { result } = renderHook(() => useTeacherSession());

      await act(async () => {
        expect(await result.current.saveClassroom()).toBe(false);
      });

      expect(mocks.sendRoomLayoutUpdatedBroadcast).not.toHaveBeenCalled();
    },
  );
});
