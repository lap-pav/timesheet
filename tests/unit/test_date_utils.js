// Unit tests for date normalization functions
// Tests the date parsing, normalization, and validation functions

describe('Date Normalization Utilities', () => {
  // Mock console for testing
  global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeDate function', () => {
    test('should preserve YYYY-MM-DD format', () => {
      expect(normalizeDate('2025-09-15')).toBe('2025-09-15');
      expect(normalizeDate('2025-01-01')).toBe('2025-01-01');
      expect(normalizeDate('2025-12-31')).toBe('2025-12-31');
    });

    test('should convert MM/DD/YYYY to YYYY-MM-DD', () => {
      expect(normalizeDate('09/15/2025')).toBe('2025-09-15');
      expect(normalizeDate('01/01/2025')).toBe('2025-01-01');
      expect(normalizeDate('12/31/2025')).toBe('2025-12-31');
    });

    test('should convert M/D/YYYY to YYYY-MM-DD', () => {
      expect(normalizeDate('9/15/2025')).toBe('2025-09-15');
      expect(normalizeDate('1/1/2025')).toBe('2025-01-01');
      expect(normalizeDate('12/3/2025')).toBe('2025-12-03');
    });

    test('should handle Date objects', () => {
      const date1 = new Date(2025, 8, 15); // Month is 0-indexed (8 = September)
      expect(normalizeDate(date1)).toBe('2025-09-15');
      
      const date2 = new Date(2025, 0, 1); // January 1
      expect(normalizeDate(date2)).toBe('2025-01-01');
      
      const date3 = new Date(2025, 11, 31); // December 31
      expect(normalizeDate(date3)).toBe('2025-12-31');
    });

    test('should handle string dates that can be parsed', () => {
      expect(normalizeDate('September 15, 2025')).toBe('2025-09-15');
      expect(normalizeDate('Jan 1, 2025')).toBe('2025-01-01');
      expect(normalizeDate('2025-09-15T10:30:00')).toBe('2025-09-15');
    });

    test('should handle edge cases', () => {
      expect(normalizeDate('')).toBe('');
      expect(normalizeDate(null)).toBe('');
      expect(normalizeDate(undefined)).toBe('');
    });

    test('should return original for unrecognized formats', () => {
      expect(normalizeDate('invalid-date')).toBe('invalid-date');
      expect(normalizeDate('tomorrow')).toBe('tomorrow');
      expect(normalizeDate('2025/13/45')).toBe('2025/13/45'); // Invalid date
    });

    test('should handle leap years correctly', () => {
      // 2024 is a leap year
      const leapDate = new Date(2024, 1, 29); // February 29, 2024
      expect(normalizeDate(leapDate)).toBe('2024-02-29');
      
      expect(normalizeDate('02/29/2024')).toBe('2024-02-29');
    });

    test('should handle different centuries', () => {
      expect(normalizeDate('01/01/2000')).toBe('2000-01-01');
      expect(normalizeDate('12/31/1999')).toBe('1999-12-31');
      expect(normalizeDate('06/15/2050')).toBe('2050-06-15');
    });
  });

  describe('date validation patterns', () => {
    test('should validate date formats against patterns', () => {
      const patterns = [
        /^\d{4}-\d{2}-\d{2}$/,    // YYYY-MM-DD
        /^\d{2}\/\d{2}\/\d{4}$/,  // MM/DD/YYYY
        /^\d{1,2}\/\d{1,2}\/\d{4}$/ // M/D/YYYY
      ];

      // Valid formats
      expect(patterns.some(p => p.test('2025-09-15'))).toBe(true);
      expect(patterns.some(p => p.test('09/15/2025'))).toBe(true);
      expect(patterns.some(p => p.test('9/15/2025'))).toBe(true);
      expect(patterns.some(p => p.test('1/1/2025'))).toBe(true);

      // Invalid formats
      expect(patterns.some(p => p.test('2025-9-15'))).toBe(false); // Single digit month
      expect(patterns.some(p => p.test('15/09/2025'))).toBe(false); // DD/MM/YYYY
      expect(patterns.some(p => p.test('Sep 15, 2025'))).toBe(false);
      expect(patterns.some(p => p.test('2025-13-01'))).toBe(false); // Invalid month
    });
  });

  describe('date range validation', () => {
    test('should validate reasonable date ranges', () => {
      // Test helper function
      const isValidDateRange = (dateStr) => {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        return !isNaN(date.getTime()) && year >= 1900 && year <= 2100;
      };

      expect(isValidDateRange('2025-09-15')).toBe(true);
      expect(isValidDateRange('2000-01-01')).toBe(true);
      expect(isValidDateRange('2050-12-31')).toBe(true);
      
      expect(isValidDateRange('1800-01-01')).toBe(false); // Too old
      expect(isValidDateRange('2200-01-01')).toBe(false); // Too far in future
      expect(isValidDateRange('invalid')).toBe(false);
    });

    test('should validate month boundaries', () => {
      const isValidMonth = (month) => month >= 1 && month <= 12;
      
      expect(isValidMonth(1)).toBe(true);
      expect(isValidMonth(12)).toBe(true);
      expect(isValidMonth(0)).toBe(false);
      expect(isValidMonth(13)).toBe(false);
    });

    test('should validate day boundaries', () => {
      const isValidDay = (day, month, year) => {
        const daysInMonth = new Date(year, month, 0).getDate();
        return day >= 1 && day <= daysInMonth;
      };

      expect(isValidDay(15, 9, 2025)).toBe(true); // September 15
      expect(isValidDay(31, 12, 2025)).toBe(true); // December 31
      expect(isValidDay(29, 2, 2024)).toBe(true); // Leap year February 29
      expect(isValidDay(29, 2, 2025)).toBe(false); // Non-leap year February 29
      expect(isValidDay(31, 4, 2025)).toBe(false); // April only has 30 days
    });
  });

  describe('date parsing utilities', () => {
    test('should extract date components correctly', () => {
      // Test helper function
      const extractDateComponents = (dateStr) => {
        const normalized = normalizeDate(dateStr);
        const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
          return {
            year: parseInt(match[1], 10),
            month: parseInt(match[2], 10),
            day: parseInt(match[3], 10)
          };
        }
        return null;
      };

      expect(extractDateComponents('2025-09-15')).toEqual({
        year: 2025, month: 9, day: 15
      });
      
      expect(extractDateComponents('09/15/2025')).toEqual({
        year: 2025, month: 9, day: 15
      });
      
      expect(extractDateComponents('invalid')).toBe(null);
    });

    test('should handle timezone considerations', () => {
      // Date objects can have timezone issues
      const utcDate = new Date('2025-09-15T12:00:00.000Z');
      const localDate = new Date('2025-09-15T12:00:00');
      
      // Both should normalize to the same date
      expect(normalizeDate(utcDate)).toBe('2025-09-15');
      expect(normalizeDate(localDate)).toBe('2025-09-15');
    });
  });

  describe('date standardization edge cases', () => {
    test('should handle various input types', () => {
      expect(normalizeDate(20250915)).toBe('20250915'); // Number to string
      expect(normalizeDate({ date: '2025-09-15' })).toBe('[object Object]');
      expect(normalizeDate(['2025', '09', '15'])).toBe('2025,09,15');
    });

    test('should handle whitespace and formatting', () => {
      expect(normalizeDate(' 2025-09-15 ')).toBe('2025-09-15');
      expect(normalizeDate('\t09/15/2025\n')).toBe('2025-09-15');
    });

    test('should handle international date formats cautiously', () => {
      // DD/MM/YYYY format is ambiguous and should not be assumed
      // These should pass through as unrecognized
      expect(normalizeDate('15/09/2025')).toBe('15/09/2025'); // DD/MM/YYYY
      expect(normalizeDate('15-09-2025')).toBe('15-09-2025'); // DD-MM-YYYY
    });

    test('should handle partial dates', () => {
      expect(normalizeDate('2025-09')).toBe('2025-09'); // Year-month only
      expect(normalizeDate('2025')).toBe('2025'); // Year only
      expect(normalizeDate('09/2025')).toBe('09/2025'); // Month/year
    });
  });

  describe('month-specific validations', () => {
    test('should handle different month lengths', () => {
      // Test dates for months with different lengths
      const testDates = [
        { date: '2025-01-31', valid: true }, // 31 days
        { date: '2025-02-28', valid: true }, // 28 days (non-leap)
        { date: '2025-02-29', valid: false }, // Invalid in non-leap year
        { date: '2024-02-29', valid: true }, // Valid in leap year
        { date: '2025-04-30', valid: true }, // 30 days
        { date: '2025-04-31', valid: false }, // Invalid (April has 30 days)
      ];

      testDates.forEach(({ date, valid }) => {
        const parsed = new Date(date);
        const isValid = !isNaN(parsed.getTime()) && 
                       parsed.toISOString().startsWith(date);
        expect(isValid).toBe(valid);
      });
    });

    test('should identify weekend vs weekday patterns', () => {
      // Test helper for business logic
      const isWeekend = (dateStr) => {
        const date = new Date(dateStr);
        const day = date.getDay();
        return day === 0 || day === 6; // Sunday = 0, Saturday = 6
      };

      expect(isWeekend('2025-09-13')).toBe(true); // Saturday
      expect(isWeekend('2025-09-14')).toBe(true); // Sunday
      expect(isWeekend('2025-09-15')).toBe(false); // Monday
      expect(isWeekend('2025-09-19')).toBe(false); // Friday
    });
  });

  describe('performance considerations', () => {
    test('should handle large arrays of dates efficiently', () => {
      const dates = [];
      for (let month = 1; month <= 12; month++) {
        for (let day = 1; day <= 28; day++) { // Safe for all months
          dates.push(`${month}/${day}/2025`);
        }
      }

      const startTime = Date.now();
      const normalizedDates = dates.map(date => normalizeDate(date));
      const endTime = Date.now();

      expect(normalizedDates.length).toBe(dates.length);
      expect(endTime - startTime).toBeLessThan(200); // Should be reasonably fast
    });

    test('should handle repeated parsing efficiently', () => {
      const testDate = '09/15/2025';
      const iterations = 1000;

      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        normalizeDate(testDate);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });
  });

  describe('date comparison utilities', () => {
    test('should enable date comparisons after normalization', () => {
      const date1 = normalizeDate('09/15/2025');
      const date2 = normalizeDate('2025-09-16');
      const date3 = normalizeDate('09/15/2025');

      expect(date1 < date2).toBe(true);
      expect(date1 > date2).toBe(false);
      expect(date1 === date3).toBe(true);
    });

    test('should handle date arithmetic scenarios', () => {
      const baseDate = new Date('2025-09-15');
      
      // Add days
      const nextDay = new Date(baseDate);
      nextDay.setDate(baseDate.getDate() + 1);
      expect(normalizeDate(nextDay)).toBe('2025-09-16');
      
      // Subtract days
      const prevDay = new Date(baseDate);
      prevDay.setDate(baseDate.getDate() - 1);
      expect(normalizeDate(prevDay)).toBe('2025-09-14');
    });
  });
});

// Note: These tests validate the date normalization utilities used in the timesheet aggregation system
// They ensure consistent date format handling across different input formats and cultural conventions
