// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { teacherAuth, supabaseConfig, activeRoom, studentSession, clearLegacyResponseData } from './storage';

describe('Storage Layer Abstraction', () => {
  beforeEach(() => {
    // Clear localStorage mock before each test
    localStorage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('teacherAuth helper', () => {
    it('should initially return isAuthenticated = false', () => {
      expect(teacherAuth.isAuthenticated()).toBe(false);
      expect(teacherAuth.getJwt()).toBeNull();
      expect(teacherAuth.getLoggedInTeacher()).toBeNull();
    });

    it('should correctly save, load, and clear teacher credentials', () => {
      const mockTeacher = { id: 'teacher-1', username: 'admin' };
      teacherAuth.save({
        token: 'mock-jwt-token',
        supabaseToken: 'mock-sb-token',
        teacher: mockTeacher,
      });

      expect(teacherAuth.isAuthenticated()).toBe(true);
      expect(teacherAuth.getJwt()).toBe('mock-jwt-token');
      expect(teacherAuth.getSupabaseToken()).toBe('mock-sb-token');
      expect(teacherAuth.getLoggedInTeacher()).toEqual(mockTeacher);

      teacherAuth.clear();
      expect(teacherAuth.isAuthenticated()).toBe(false);
      expect(teacherAuth.getJwt()).toBeNull();
      expect(teacherAuth.getSupabaseToken()).toBe('');
      expect(teacherAuth.getLoggedInTeacher()).toBeNull();
    });
  });

  describe('supabaseConfig helper', () => {
    it('should correctly store and read supabase connection options', () => {
      expect(supabaseConfig.getUrl()).toBe('');
      expect(supabaseConfig.getKey()).toBe('');

      supabaseConfig.save('https://my-project.supabase.co', 'anon-key-abc');
      expect(supabaseConfig.getUrl()).toBe('https://my-project.supabase.co');
      expect(supabaseConfig.getKey()).toBe('anon-key-abc');
    });
  });

  describe('activeRoom helper', () => {
    it('should manage currently managed active room id', () => {
      expect(activeRoom.getId()).toBeNull();

      activeRoom.save('room-xyz');
      expect(activeRoom.getId()).toBe('room-xyz');

      activeRoom.clear();
      expect(activeRoom.getId()).toBeNull();
    });
  });

  it('isolates Student Realtime tokens per room', () => {
    studentSession.saveToken('room-a', 'token-a');
    studentSession.saveToken('room-b', 'token-b');
    expect(studentSession.getToken('room-a')).toBe('token-a');
    expect(studentSession.getToken('room-b')).toBe('token-b');
  });

  it('purges legacy response history without removing Student Session data', () => {
    localStorage.setItem('seat_statuses_room_room-a', '{"student":"personal data"}');
    localStorage.setItem('realtime_logs_room_room-a', '[{"comment":"question"}]');
    localStorage.setItem('class_responses_room_room-a', '{}');
    localStorage.setItem('class_responses_date_room_room-a', 'yesterday');
    studentSession.saveId('room-a', 'STU001');
    studentSession.saveName('room-a', '学生A');

    clearLegacyResponseData();

    expect(localStorage.getItem('seat_statuses_room_room-a')).toBeNull();
    expect(localStorage.getItem('realtime_logs_room_room-a')).toBeNull();
    expect(localStorage.getItem('class_responses_room_room-a')).toBeNull();
    expect(localStorage.getItem('class_responses_date_room_room-a')).toBeNull();
    expect(studentSession.getId('room-a')).toBe('STU001');
    expect(studentSession.getName('room-a')).toBe('学生A');
  });
});
