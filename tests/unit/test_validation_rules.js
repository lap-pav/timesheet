// Unit tests for validation rule enforcement
// Tests the validation logic and rule enforcement in timesheet entries

describe('Validation Rule Enforcement', () => {
  // Mock console for testing
  global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  };

  // Mock validation functions that would be imported
  global.validateTimesheetEntry = validateTimesheetEntry;
  global.mapEntryToColumns = mapEntryToColumns;
  global.parseTimeToMinutes = parseTimeToMinutes;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Required field validation', () => {
    const mockHeaders = ['Date', 'From Time', 'To Time', 'Project', 'Task Type', 'Description'];
    
    test('should pass validation for complete entries', () => {
      const validEntry = ['2025-09-15', '09:00', '17:30', 'Project Alpha', 'Development', 'Working on features'];
      const result = validateTimesheetEntry(validEntry, 'JohnDoe', mockHeaders, 2);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should fail validation for missing required fields', () => {
      const incompleteEntry = ['2025-09-15', '', '17:30', 'Project Alpha', 'Development', 'Working on features'];
      const result = validateTimesheetEntry(incompleteEntry, 'JohnDoe', mockHeaders, 2);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.field === 'from_time' && error.type === 'INVALID_ENTRY'
      )).toBe(true);
    });

    test('should identify all missing required fields', () => {
      const emptyEntry = ['', '', '', '', '', 'Some description'];
      const result = validateTimesheetEntry(emptyEntry, 'JohnDoe', mockHeaders, 2);
      
      expect(result.isValid).toBe(false);
      const missingFields = result.errors
        .filter(error => error.type === 'INVALID_ENTRY')
        .map(error => error.field);
      
      expect(missingFields).toEqual(
        expect.arrayContaining(['date', 'from_time', 'to_time', 'project', 'task_type'])
      );
    });

    test('should handle null and undefined values', () => {
      const nullEntry = [null, undefined, '', 'Project Alpha', 'Development', 'Description'];
      const result = validateTimesheetEntry(nullEntry, 'JohnDoe', mockHeaders, 2);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Date format validation', () => {
    const mockHeaders = ['Date', 'From Time', 'To Time', 'Project', 'Task Type', 'Description'];
    
    test('should accept valid date formats', () => {
      const validDates = [
        ['2025-09-15', '09:00', '17:30', 'Project Alpha', 'Development', 'Work'],
        ['09/15/2025', '09:00', '17:30', 'Project Alpha', 'Development', 'Work'],
        ['9/15/2025', '09:00', '17:30', 'Project Alpha', 'Development', 'Work']
      ];

      validDates.forEach((entry, index) => {
        const result = validateTimesheetEntry(entry, 'JohnDoe', mockHeaders, index + 2);
        expect(result.isValid).toBe(true);
      });
    });

    test('should reject invalid date formats', () => {
      const invalidDates = [
        ['15/09/2025', '09:00', '17:30', 'Project Alpha', 'Development', 'Work'], // DD/MM/YYYY
        ['2025/13/01', '09:00', '17:30', 'Project Alpha', 'Development', 'Work'], // Invalid month
        ['tomorrow', '09:00', '17:30', 'Project Alpha', 'Development', 'Work'],   // Text date
        ['32/01/2025', '09:00', '17:30', 'Project Alpha', 'Development', 'Work']  // Invalid day
      ];

      invalidDates.forEach((entry, index) => {
        const result = validateTimesheetEntry(entry, 'JohnDoe', mockHeaders, index + 2);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => 
          error.type === 'INVALID_ENTRY' && error.source === 'DATE_VALIDATION'
        )).toBe(true);
      });
    });

    test('should handle edge date cases', () => {
      const edgeDates = [
        ['2024-02-29', '09:00', '17:30', 'Project Alpha', 'Development', 'Work'], // Leap year
        ['2025-02-29', '09:00', '17:30', 'Project Alpha', 'Development', 'Work'], // Non-leap year
        ['2025-04-31', '09:00', '17:30', 'Project Alpha', 'Development', 'Work']  // Invalid day for April
      ];

      const result1 = validateTimesheetEntry(edgeDates[0], 'JohnDoe', mockHeaders, 2);
      expect(result1.isValid).toBe(true); // Valid leap year date

      const result2 = validateTimesheetEntry(edgeDates[1], 'JohnDoe', mockHeaders, 3);
      expect(result2.isValid).toBe(false); // Invalid non-leap year date

      const result3 = validateTimesheetEntry(edgeDates[2], 'JohnDoe', mockHeaders, 4);
      expect(result3.isValid).toBe(false); // Invalid day for month
    });
  });

  describe('Time format validation', () => {
    const mockHeaders = ['Date', 'From Time', 'To Time', 'Project', 'Task Type', 'Description'];
    
    test('should accept valid time formats', () => {
      const validTimes = [
        ['2025-09-15', '09:00', '17:30', 'Project Alpha', 'Development', 'Work'],     // HH:MM
        ['2025-09-15', '9:00', '17:30', 'Project Alpha', 'Development', 'Work'],      // H:MM
        ['2025-09-15', '09:00:00', '17:30:45', 'Project Alpha', 'Development', 'Work'], // HH:MM:SS
        ['2025-09-15', '9.00', '17.30', 'Project Alpha', 'Development', 'Work']       // H.MM
      ];

      validTimes.forEach((entry, index) => {
        const result = validateTimesheetEntry(entry, 'JohnDoe', mockHeaders, index + 2);
        expect(result.isValid).toBe(true);
      });
    });

    test('should reject invalid time formats', () => {
      const invalidTimes = [
        ['2025-09-15', '25:00', '17:30', 'Project Alpha', 'Development', 'Work'], // Invalid hour
        ['2025-09-15', '09:60', '17:30', 'Project Alpha', 'Development', 'Work'], // Invalid minute
        ['2025-09-15', 'morning', '17:30', 'Project Alpha', 'Development', 'Work'], // Text time
        ['2025-09-15', '9', '17:30', 'Project Alpha', 'Development', 'Work'],     // Hour only
        ['2025-09-15', '9:3', '17:30', 'Project Alpha', 'Development', 'Work']    // Single digit minute
      ];

      invalidTimes.forEach((entry, index) => {
        const result = validateTimesheetEntry(entry, 'JohnDoe', mockHeaders, index + 2);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => 
          error.type === 'INVALID_ENTRY' && error.source === 'TIME_VALIDATION'
        )).toBe(true);
      });
    });

    test('should handle timecard time validation differently', () => {
      const mockHeadersWithTC = ['Date', 'From Time', 'To Time', 'Project', 'Task Type', 'Description', 'TC From Time', 'TC To Time'];
      
      // Invalid TC times should generate warnings, not errors
      const entryWithInvalidTC = ['2025-09-15', '09:00', '17:30', 'Project Alpha', 'Development', 'Work', 'invalid', 'also-invalid'];
      const result = validateTimesheetEntry(entryWithInvalidTC, 'JohnDoe', mockHeadersWithTC, 2);
      
      expect(result.isValid).toBe(true); // Should still be valid overall
      expect(result.warnings.length).toBeGreaterThan(0); // But should have warnings
    });
  });

  describe('Time logic validation', () => {
    const mockHeaders = ['Date', 'From Time', 'To Time', 'Project', 'Task Type', 'Description'];
    
    test('should validate logical time sequences', () => {
      const validSequence = ['2025-09-15', '09:00', '17:30', 'Project Alpha', 'Development', 'Work'];
      const result = validateTimesheetEntry(validSequence, 'JohnDoe', mockHeaders, 2);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBe(0);
    });

    test('should warn about illogical time sequences', () => {
      const invalidSequence = ['2025-09-15', '17:30', '09:00', 'Project Alpha', 'Development', 'Work'];
      const result = validateTimesheetEntry(invalidSequence, 'JohnDoe', mockHeaders, 2);
      
      expect(result.warnings.some(warning => 
        warning.type === 'INVALID_ENTRY' && warning.source === 'TIME_LOGIC_VALIDATION'
      )).toBe(true);
    });

    test('should handle same from and to times', () => {
      const sameTime = ['2025-09-15', '12:00', '12:00', 'Project Alpha', 'Development', 'Work'];
      const result = validateTimesheetEntry(sameTime, 'JohnDoe', mockHeaders, 2);
      
      expect(result.warnings.some(warning => 
        warning.source === 'TIME_LOGIC_VALIDATION'
      )).toBe(true);
    });

    test('should handle potential overnight shifts', () => {
      const overnightShift = ['2025-09-15', '23:00', '07:00', 'Project Alpha', 'Development', 'Work'];
      const result = validateTimesheetEntry(overnightShift, 'JohnDoe', mockHeaders, 2);
      
      // Current implementation treats this as invalid logic
      expect(result.warnings.some(warning => 
        warning.source === 'TIME_LOGIC_VALIDATION'
      )).toBe(true);
    });
  });

  describe('Data completeness validation', () => {
    const mockHeaders = ['Date', 'From Time', 'To Time', 'Project', 'Task Type', 'Description'];
    
    test('should handle empty rows', () => {
      const emptyRow = [];
      const result = validateTimesheetEntry(emptyRow, 'JohnDoe', mockHeaders, 2);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.message.includes('Empty row')
      )).toBe(true);
    });

    test('should handle rows with all empty cells', () => {
      const allEmptyRow = ['', '', '', '', '', ''];
      const result = validateTimesheetEntry(allEmptyRow, 'JohnDoe', mockHeaders, 2);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.message.includes('All cells empty')
      )).toBe(true);
    });

    test('should handle rows with mixed empty and whitespace cells', () => {
      const mixedEmptyRow = ['  ', '', '\t', '   ', '', '\n'];
      const result = validateTimesheetEntry(mixedEmptyRow, 'JohnDoe', mockHeaders, 2);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.message.includes('All cells empty') || error.message.includes('Missing required field')
      )).toBe(true);
    });
  });

  describe('Column mapping validation', () => {
    test('should handle different header variations', () => {
      const headerVariations = [
        ['Date', 'Start Time', 'End Time', 'Client', 'Activity', 'Notes'],
        ['Day', 'From', 'To', 'Project Name', 'Task', 'Details'],
        ['DATE', 'FROM TIME', 'TO TIME', 'PROJECT', 'TASK TYPE', 'DESCRIPTION']
      ];

      const testEntry = ['2025-09-15', '09:00', '17:30', 'Project Alpha', 'Development', 'Work'];

      headerVariations.forEach((headers, index) => {
        const result = validateTimesheetEntry(testEntry, 'JohnDoe', headers, 2);
        expect(result.isValid).toBe(true);
      });
    });

    test('should handle missing optional columns gracefully', () => {
      const minimalHeaders = ['Date', 'From Time', 'To Time', 'Project', 'Task Type'];
      const testEntry = ['2025-09-15', '09:00', '17:30', 'Project Alpha', 'Development'];
      
      const result = validateTimesheetEntry(testEntry, 'JohnDoe', minimalHeaders, 2);
      expect(result.isValid).toBe(true);
    });

    test('should handle extra columns gracefully', () => {
      const extendedHeaders = ['Date', 'From Time', 'To Time', 'Project', 'Task Type', 'Description', 'Extra1', 'Extra2'];
      const testEntry = ['2025-09-15', '09:00', '17:30', 'Project Alpha', 'Development', 'Work', 'Extra data', 'More data'];
      
      const result = validateTimesheetEntry(testEntry, 'JohnDoe', extendedHeaders, 2);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Business rule validation', () => {
    const mockHeaders = ['Date', 'From Time', 'To Time', 'Project', 'Task Type', 'Description'];
    
    test('should validate reasonable work hours', () => {
      const longWorkDay = ['2025-09-15', '06:00', '23:00', 'Project Alpha', 'Development', 'Very long day'];
      const result = validateTimesheetEntry(longWorkDay, 'JohnDoe', mockHeaders, 2);
      
      // Should be valid but might generate warnings for unusual hours
      expect(result.isValid).toBe(true);
    });

    test('should handle weekend work entries', () => {
      // Saturday entry
      const weekendEntry = ['2025-09-13', '09:00', '17:30', 'Project Alpha', 'Development', 'Weekend work'];
      const result = validateTimesheetEntry(weekendEntry, 'JohnDoe', mockHeaders, 2);
      
      expect(result.isValid).toBe(true);
    });

    test('should validate project and task type combinations', () => {
      const validCombination = ['2025-09-15', '09:00', '17:30', 'Project Alpha', 'Development', 'Coding features'];
      const result = validateTimesheetEntry(validCombination, 'JohnDoe', mockHeaders, 2);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Error message quality', () => {
    const mockHeaders = ['Date', 'From Time', 'To Time', 'Project', 'Task Type', 'Description'];
    
    test('should provide specific error messages', () => {
      const invalidEntry = ['invalid-date', '25:00', '', 'Project Alpha', 'Development', 'Work'];
      const result = validateTimesheetEntry(invalidEntry, 'JohnDoe', mockHeaders, 5);
      
      const errorMessages = result.errors.map(error => error.message);
      
      expect(errorMessages.some(msg => msg.includes('Invalid date format'))).toBe(true);
      expect(errorMessages.some(msg => msg.includes('Invalid time format'))).toBe(true);
      expect(errorMessages.some(msg => msg.includes('Missing required field'))).toBe(true);
    });

    test('should include context in error messages', () => {
      const invalidEntry = ['', '', '', '', '', ''];
      const result = validateTimesheetEntry(invalidEntry, 'TestUser', mockHeaders, 10);
      
      result.errors.forEach(error => {
        expect(error.memberName).toBe('TestUser');
        expect(error.rowIndex).toBe(10);
        expect(error.timestamp).toBeDefined();
      });
    });

    test('should categorize errors by severity', () => {
      const problematicEntry = ['2025-09-15', '18:00', '09:00', '', 'Development', 'Work'];
      const result = validateTimesheetEntry(problematicEntry, 'JohnDoe', mockHeaders, 2);
      
      const errors = result.errors.filter(item => item.severity === 'ERROR');
      const warnings = result.warnings.filter(item => item.severity === 'WARNING');
      
      expect(errors.length).toBeGreaterThan(0); // Missing project is an error
      expect(warnings.length).toBeGreaterThan(0); // Time logic is a warning
    });
  });

  describe('Performance validation', () => {
    const mockHeaders = ['Date', 'From Time', 'To Time', 'Project', 'Task Type', 'Description'];
    
    test('should validate entries efficiently', () => {
      const testEntry = ['2025-09-15', '09:00', '17:30', 'Project Alpha', 'Development', 'Work'];
      const iterations = 100;
      
      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        validateTimesheetEntry(testEntry, 'JohnDoe', mockHeaders, i + 2);
      }
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(500); // Should be fast
    });

    test('should handle large entry arrays efficiently', () => {
      const entries = [];
      for (let i = 1; i <= 31; i++) {
        entries.push([
          `2025-09-${i.toString().padStart(2, '0')}`,
          '09:00',
          '17:30',
          'Project Alpha',
          'Development',
          `Work day ${i}`
        ]);
      }
      
      const startTime = Date.now();
      const results = entries.map((entry, index) => 
        validateTimesheetEntry(entry, 'JohnDoe', mockHeaders, index + 2)
      );
      const endTime = Date.now();
      
      expect(results.length).toBe(31);
      expect(results.every(result => result.isValid)).toBe(true);
      expect(endTime - startTime).toBeLessThan(200);
    });
  });
});

// Note: These tests validate the comprehensive validation rule enforcement system
// They ensure data quality, consistency, and provide meaningful feedback for data issues
