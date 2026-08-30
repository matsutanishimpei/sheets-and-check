import { describe, it, expect } from 'vitest';
import { filterStudentId, validateStudentId } from './studentIdHelper';

describe('Frontend Helper Utilities', () => {
  describe('Student ID Filtering and Validation', () => {
    it('filterStudentId - should auto-capitalize and remove invalid symbols/spaces', () => {
      expect(filterStudentId('24te1234')).toBe('24TE1234');
      expect(filterStudentId('  24te-1234  ')).toBe('24TE1234');
      expect(filterStudentId('abc#123_XYZ')).toBe('ABC123XYZ');
      expect(filterStudentId('24TE1234')).toBe('24TE1234');
    });

    it('validateStudentId - should enforce length constraints of [5, 15]', () => {
      expect(validateStudentId('1234')).toBe(false); // 4 chars
      expect(validateStudentId('12345')).toBe(true); // 5 chars
      expect(validateStudentId('1234567890')).toBe(true); // 10 chars
      expect(validateStudentId('123456789012345')).toBe(true); // 15 chars
      expect(validateStudentId('1234567890123456')).toBe(false); // 16 chars
    });
  });
});
