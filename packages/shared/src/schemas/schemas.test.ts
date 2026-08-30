import { describe, it, expect } from 'vitest';
import { SaveRoomLayoutInputSchema } from './roomLayout';
import { StudentToTeacherEventSchema, BroadcastEventSchema } from './broadcastEvent';
import { SeatStatusSchema, LiveSeatStatusSchema } from './seatStatus';

describe('Shared Package Schemas Validation', () => {
  describe('SaveRoomLayoutInputSchema', () => {
    it('should validate valid room layout data', () => {
      const validData = {
        name: 'Classroom A',
        grid: [
          { x: 0, y: 0, type: 'student' },
          { x: 1, y: 0, type: 'teacher' },
          { x: 2, y: 1, type: 'obstacle' },
          { x: 3, y: 3, type: 'door' },
        ],
        supabaseUrl: 'https://example.supabase.co',
        supabaseAnonKey: 'valid-anon-key-12345',
        isActive: true,
      };

      const result = SaveRoomLayoutInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should fail validation when name is empty', () => {
      const invalidData = {
        name: '',
        grid: [],
        supabaseUrl: 'https://example.supabase.co',
        supabaseAnonKey: 'valid-anon-key-12345',
      };

      const result = SaveRoomLayoutInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Room name is required');
      }
    });

    it('should fail validation when coordinates are negative', () => {
      const invalidData = {
        name: 'Classroom A',
        grid: [{ x: -1, y: 0, type: 'student' }],
        supabaseUrl: 'https://example.supabase.co',
        supabaseAnonKey: 'valid-anon-key',
      };

      const result = SaveRoomLayoutInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('StudentToTeacherEventSchema (Student ID and details)', () => {
    it('should validate valid student to teacher events', () => {
      const validData = {
        seatId: '1,1',
        status: 'ok',
        studentName: '山田 太郎',
        studentId: 'B2026X45', // 8 characters (within [5, 15] limit)
        comment: '分かりました！',
      };

      const result = StudentToTeacherEventSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject studentId less than 5 characters', () => {
      const invalidData = {
        seatId: '1,1',
        status: 'ok',
        studentName: '山田 太郎',
        studentId: '1234', // 4 characters
      };

      const result = StudentToTeacherEventSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('5-15');
      }
    });

    it('should reject studentId more than 15 characters', () => {
      const invalidData = {
        seatId: '1,1',
        status: 'ok',
        studentName: '山田 太郎',
        studentId: '1234567890123456', // 16 characters
      };

      const result = StudentToTeacherEventSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('5-15');
      }
    });
  });

  describe('BroadcastEventSchema (Discriminated Union)', () => {
    it('should parse valid student_to_teacher event', () => {
      const event = {
        type: 'student_to_teacher',
        payload: {
          seatId: '2,3',
          status: 'ng',
          studentName: '鈴木 花子',
          studentId: 'A2026Z09',
          comment: 'ここがわかりません',
        },
      };

      const result = BroadcastEventSchema.safeParse(event);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('student_to_teacher');
      }
    });

    it('should parse valid teacher_reset event', () => {
      const event = {
        type: 'teacher_reset',
        payload: {
          reset: true,
        },
      };

      const result = BroadcastEventSchema.safeParse(event);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('teacher_reset');
      }
    });

    it('should reject invalid event types', () => {
      const event = {
        type: 'invalid_event_type',
        payload: {},
      };

      const result = BroadcastEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('Room layout security bounds', () => {
    const base = { name: 'Room', grid: [], supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'key' };

    it('rejects duplicate and out-of-range coordinates', () => {
      expect(SaveRoomLayoutInputSchema.safeParse({ ...base, grid: [{ x: 1, y: 1, type: 'student' }, { x: 1, y: 1, type: 'teacher' }] }).success).toBe(false);
      expect(SaveRoomLayoutInputSchema.safeParse({ ...base, grid: [{ x: 12, y: 0, type: 'student' }] }).success).toBe(false);
    });

    it('rejects excessive room names, grids, and non-HTTPS URLs', () => {
      expect(SaveRoomLayoutInputSchema.safeParse({ ...base, name: 'x'.repeat(101) }).success).toBe(false);
      expect(SaveRoomLayoutInputSchema.safeParse({ ...base, grid: Array.from({ length: 145 }, (_, i) => ({ x: i % 12, y: Math.floor(i / 12), type: 'student' })) }).success).toBe(false);
      expect(SaveRoomLayoutInputSchema.safeParse({ ...base, supabaseUrl: 'http://example.supabase.co' }).success).toBe(false);
    });
  });
});
