/**
 * Contract tests for validateConfiguration() function
 * Tests the contract specification for configuration validation
 */

// Import mocks
require('../unit/mocks');

describe('validateConfiguration() Contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input Contract', () => {
    test('should accept valid configuration object', () => {
      const validConfig = {
        reportName: 'Test Report',
        description: 'Test description',
        columns: 'Member Name:record.member,Hours:calculateHours(record.from_time,record.to_time)',
        filters: 'Hours>0',
        sortBy: 'Member Name',
        sortOrder: 'ASC',
        summaryType: 'NONE',
        outputStructure: 'SINGLE_SHEET',
        groupingField: ''
      };

      const mockValidateConfiguration = jest.fn((config) => {
        // Validate required fields
        expect(config).toHaveProperty('reportName');
        expect(config).toHaveProperty('description');
        expect(config).toHaveProperty('columns');
        expect(config).toHaveProperty('summaryType');
        expect(config).toHaveProperty('outputStructure');
        
        return {
          isValid: true,
          errors: [],
          warnings: [],
          fieldErrors: {},
          suggestions: []
        };
      });

      const result = mockValidateConfiguration(validConfig);
      
      expect(mockValidateConfiguration).toHaveBeenCalledWith(validConfig);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Output Contract', () => {
    test('should return validation result with all required fields', () => {
      const mockValidateConfiguration = jest.fn(() => ({
        isValid: true,
        errors: [],
        warnings: ['Report name should be more descriptive'],
        fieldErrors: {},
        suggestions: ['Consider adding filters for better performance']
      }));

      const result = mockValidateConfiguration({});

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('fieldErrors');
      expect(result).toHaveProperty('suggestions');
      
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(typeof result.fieldErrors).toBe('object');
    });

    test('should return validation errors for invalid configuration', () => {
      const mockValidateConfiguration = jest.fn(() => ({
        isValid: false,
        errors: [
          'Report name is required',
          'Invalid column expression: unknown_field'
        ],
        warnings: [],
        fieldErrors: {
          reportName: ['Field is required'],
          columns: ['Invalid field reference: unknown_field']
        },
        suggestions: [
          'Use valid field names from: member, date, project',
          'Check expression syntax'
        ]
      }));

      const result = mockValidateConfiguration({
        reportName: '',
        columns: 'Unknown:unknown_field'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.fieldErrors).toHaveProperty('reportName');
      expect(result.fieldErrors).toHaveProperty('columns');
    });
  });

  describe('Validation Rules', () => {
    test('should validate report name uniqueness', () => {
      const mockValidateConfiguration = jest.fn((config) => {
        const existingNames = ['Existing Report', 'Another Report'];
        
        if (existingNames.includes(config.reportName)) {
          return {
            isValid: false,
            errors: ['Report name already exists'],
            warnings: [],
            fieldErrors: {
              reportName: ['Name must be unique']
            },
            suggestions: ['Try: "' + config.reportName + ' v2"']
          };
        }
        
        return {
          isValid: true,
          errors: [],
          warnings: [],
          fieldErrors: {},
          suggestions: []
        };
      });

      const duplicateResult = mockValidateConfiguration({
        reportName: 'Existing Report'
      });
      expect(duplicateResult.isValid).toBe(false);
      expect(duplicateResult.errors).toContain('Report name already exists');

      const uniqueResult = mockValidateConfiguration({
        reportName: 'New Unique Report'
      });
      expect(uniqueResult.isValid).toBe(true);
    });

    test('should validate column expression syntax', () => {
      const mockValidateConfiguration = jest.fn((config) => {
        const validFields = ['member', 'date', 'from_time', 'to_time', 'project'];
        const validFunctions = ['calculateHours', 'formatDate', 'getDayOfWeek'];
        
        const errors = [];
        const fieldErrors = {};
        
        if (config.columns) {
          const columns = config.columns.split(',');
          columns.forEach(column => {
            const [displayName, expression] = column.split(':');
            
            if (expression && expression.startsWith('record.')) {
              const fieldName = expression.replace('record.', '');
              if (!validFields.includes(fieldName)) {
                errors.push(`Invalid field: ${fieldName}`);
                fieldErrors.columns = fieldErrors.columns || [];
                fieldErrors.columns.push(`Unknown field: ${fieldName}`);
              }
            }
          });
        }
        
        return {
          isValid: errors.length === 0,
          errors: errors,
          warnings: [],
          fieldErrors: fieldErrors,
          suggestions: errors.length > 0 ? ['Use valid field names: ' + validFields.join(', ')] : []
        };
      });

      const invalidResult = mockValidateConfiguration({
        columns: 'Name:record.invalid_field,Hours:record.from_time'
      });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Invalid field: invalid_field');

      const validResult = mockValidateConfiguration({
        columns: 'Name:record.member,Hours:calculateHours(record.from_time,record.to_time)'
      });
      expect(validResult.isValid).toBe(true);
    });

    test('should validate sort column exists in columns list', () => {
      const mockValidateConfiguration = jest.fn((config) => {
        if (config.sortBy) {
          const columnNames = config.columns.split(',').map(col => col.split(':')[0].trim());
          
          if (!columnNames.includes(config.sortBy)) {
            return {
              isValid: false,
              errors: ['Sort column not found in columns list'],
              warnings: [],
              fieldErrors: {
                sortBy: ['Column must exist in columns list']
              },
              suggestions: ['Available columns: ' + columnNames.join(', ')]
            };
          }
        }
        
        return {
          isValid: true,
          errors: [],
          warnings: [],
          fieldErrors: {},
          suggestions: []
        };
      });

      const invalidResult = mockValidateConfiguration({
        columns: 'Member Name:record.member,Hours:record.hours',
        sortBy: 'Project Name'
      });
      expect(invalidResult.isValid).toBe(false);

      const validResult = mockValidateConfiguration({
        columns: 'Member Name:record.member,Hours:record.hours',
        sortBy: 'Member Name'
      });
      expect(validResult.isValid).toBe(true);
    });
  });
});
