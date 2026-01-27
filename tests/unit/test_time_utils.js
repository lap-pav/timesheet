// Unit tests for time standardization utilities
// Tests the time parsing, normalization, and validation functions

describe('Time Standardization Utilities', () => {
  // Mock console for testing
  global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeTime function', () => {
    test('should normalize HH:MM format correctly', () => {
      expect(normalizeTime('9:30')).toBe('09:30');
      expect(normalizeTime('09:30')).toBe('09:30');
      expect(normalizeTime('23:45')).toBe('23:45');
      expect(normalizeTime('00:00')).toBe('00:00');
    });

    test('should normalize HH:MM:SS format to HH:MM', () => {
      expect(normalizeTime('9:30:00')).toBe('09:30');
      expect(normalizeTime('14:45:30')).toBe('14:45');
      expect(normalizeTime('23:59:59')).toBe('23:59');
    });

    test('should normalize decimal format (HH.MM) to HH:MM', () => {
      expect(normalizeTime('9.30')).toBe('09:30');
      expect(normalizeTime('14.45')).toBe('14:45');
      expect(normalizeTime('8.00')).toBe('08:00');
    });

    test('should convert decimal hours to HH:MM', () => {
      expect(normalizeTime('8.5')).toBe('08:30');
      expect(normalizeTime('9.25')).toBe('09:15');
      expect(normalizeTime('17.75')).toBe('17:45');
      expect(normalizeTime('0.5')).toBe('00:30');
    });

    test('should handle edge cases', () => {
      expect(normalizeTime('')).toBe('');
      expect(normalizeTime(null)).toBe('');
      expect(normalizeTime(undefined)).toBe('');
      expect(normalizeTime('invalid')).toBe('invalid');
    });

    test('should handle boundary values', () => {
      expect(normalizeTime('0:00')).toBe('00:00');
      expect(normalizeTime('24:00')).toBe('24:00'); // Edge case - should pass through
      expect(normalizeTime('23:59')).toBe('23:59');
    });

    test('should preserve original for unrecognized formats', () => {
      expect(normalizeTime('morning')).toBe('morning');
      expect(normalizeTime('25:00')).toBe('25:00');
      expect(normalizeTime('abc:def')).toBe('abc:def');
    });
  });

  describe('parseTimeToMinutes function', () => {
    test('should parse HH:MM format correctly', () => {
      expect(parseTimeToMinutes('09:30')).toBe(570); // 9*60 + 30
      expect(parseTimeToMinutes('14:45')).toBe(885); // 14*60 + 45
      expect(parseTimeToMinutes('00:00')).toBe(0);
      expect(parseTimeToMinutes('23:59')).toBe(1439); // 23*60 + 59
    });

    test('should parse HH:MM:SS format correctly', () => {
      expect(parseTimeToMinutes('09:30:00')).toBe(570);
      expect(parseTimeToMinutes('14:45:30')).toBe(885); // Seconds ignored
      expect(parseTimeToMinutes('23:59:59')).toBe(1439);
    });

    test('should parse HH.MM decimal format', () => {
      expect(parseTimeToMinutes('09.30')).toBe(570);
      expect(parseTimeToMinutes('14.45')).toBe(885);
      expect(parseTimeToMinutes('8.00')).toBe(480);
    });

    test('should handle single digit hours', () => {
      expect(parseTimeToMinutes('9:30')).toBe(570);
      expect(parseTimeToMinutes('1:15')).toBe(75);
    });

    test('should return null for invalid formats', () => {
      expect(parseTimeToMinutes('')).toBe(null);
      expect(parseTimeToMinutes(null)).toBe(null);
      expect(parseTimeToMinutes(undefined)).toBe(null);
      expect(parseTimeToMinutes('invalid')).toBe(null);
      expect(parseTimeToMinutes('25:00')).toBe(null); // Invalid hour
      expect(parseTimeToMinutes('12:60')).toBe(null); // Invalid minute
    });

    test('should handle edge cases', () => {
      expect(parseTimeToMinutes('0:00')).toBe(0);
      expect(parseTimeToMinutes('12:00')).toBe(720);
      expect(parseTimeToMinutes('24:00')).toBe(null); // Invalid
    });
  });

  describe('time validation patterns', () => {
    test('should validate time formats against patterns', () => {
      const patterns = [
        /^\d{1,2}:\d{2}$/,        // H:MM or HH:MM
        /^\d{1,2}:\d{2}:\d{2}$/,  // H:MM:SS or HH:MM:SS
        /^\d{1,2}\.\d{2}$/        // H.MM or HH.MM
      ];

      // Valid formats
      expect(patterns.some(p => p.test('9:30'))).toBe(true);
      expect(patterns.some(p => p.test('09:30'))).toBe(true);
      expect(patterns.some(p => p.test('9:30:00'))).toBe(true);
      expect(patterns.some(p => p.test('09:30:45'))).toBe(true);
      expect(patterns.some(p => p.test('9.30'))).toBe(true);
      expect(patterns.some(p => p.test('09.30'))).toBe(true);

      // Invalid formats
      expect(patterns.some(p => p.test('9:3'))).toBe(false); // Single digit minute
      expect(patterns.some(p => p.test('9'))).toBe(false); // Hour only
      expect(patterns.some(p => p.test('morning'))).toBe(false);
      expect(patterns.some(p => p.test('25:00'))).toBe(false); // Invalid hour
    });
  });

  describe('time logic validation', () => {
    test('should validate time ranges correctly', () => {
      // from_time < to_time (valid)
      const from1 = parseTimeToMinutes('09:00');
      const to1 = parseTimeToMinutes('17:00');
      expect(from1 < to1).toBe(true);

      // from_time = to_time (edge case)
      const from2 = parseTimeToMinutes('12:00');
      const to2 = parseTimeToMinutes('12:00');
      expect(from2 >= to2).toBe(true);

      // from_time > to_time (invalid)
      const from3 = parseTimeToMinutes('18:00');
      const to3 = parseTimeToMinutes('09:00');
      expect(from3 >= to3).toBe(true);
    });

    test('should handle overnight shifts', () => {
      // This would require special handling in actual implementation
      const from = parseTimeToMinutes('23:00');
      const to = parseTimeToMinutes('07:00');
      
      // Current implementation treats this as invalid (from >= to)
      // In future, could add logic to detect overnight shifts
      expect(from >= to).toBe(true);
    });
  });

  describe('time formatting utilities', () => {
    test('should pad single digit hours and minutes', () => {
      // Test helper function for padding
      const padTime = (time) => {
        if (!time || typeof time !== 'string') return time;
        const parts = time.split(':');
        if (parts.length >= 2) {
          return `${parts[0].padStart(2, '0')}:${parts[1]}`;
        }
        return time;
      };

      expect(padTime('9:30')).toBe('09:30');
      expect(padTime('12:45')).toBe('12:45');
      expect(padTime('1:05')).toBe('01:05');
    });

    test('should handle decimal hour conversion', () => {
      // Test helper function for decimal conversion
      const decimalToTime = (decimal) => {
        if (isNaN(decimal) || decimal < 0 || decimal > 24) return null;
        const hours = Math.floor(decimal);
        const minutes = Math.round((decimal - hours) * 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      };

      expect(decimalToTime(8.5)).toBe('08:30');
      expect(decimalToTime(9.25)).toBe('09:15');
      expect(decimalToTime(17.75)).toBe('17:45');
      expect(decimalToTime(0.5)).toBe('00:30');
      expect(decimalToTime(24.0)).toBe('24:00');
      expect(decimalToTime(-1)).toBe(null);
      expect(decimalToTime(25)).toBe(null);
    });
  });

  describe('time standardization edge cases', () => {
    test('should handle various input types', () => {
      // Test with different input types
      expect(normalizeTime(930)).toBe('930'); // Number converted to string
      expect(normalizeTime({ time: '9:30' })).toBe('[object Object]');
      expect(normalizeTime(['9', '30'])).toBe('9,30');
    });

    test('should handle whitespace and special characters', () => {
      expect(normalizeTime(' 9:30 ')).toBe('09:30');
      expect(normalizeTime('\t14:45\n')).toBe('14:45');
      expect(normalizeTime('9:30 AM')).toBe('9:30 AM'); // Should pass through
    });

    test('should preserve timezone information', () => {
      // These should pass through as unrecognized formats
      expect(normalizeTime('9:30 PST')).toBe('9:30 PST');
      expect(normalizeTime('14:45 UTC')).toBe('14:45 UTC');
      expect(normalizeTime('9:30+05:00')).toBe('9:30+05:00');
    });
  });

  describe('performance considerations', () => {
    test('should handle large arrays of times efficiently', () => {
      const times = [];
      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
          times.push(`${h}:${m.toString().padStart(2, '0')}`);
        }
      }

      const startTime = Date.now();
      const normalizedTimes = times.map(time => normalizeTime(time));
      const endTime = Date.now();

      expect(normalizedTimes.length).toBe(times.length);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    test('should handle repeated parsing efficiently', () => {
      const testTime = '9:30';
      const iterations = 1000;

      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        parseTimeToMinutes(testTime);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(50); // Should be very fast
    });
  });
});

// Note: These tests validate the time standardization utilities used in the timesheet aggregation system
// They ensure consistent time format handling across different input formats and edge cases
