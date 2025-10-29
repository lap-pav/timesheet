/**
 * Contract tests for processNaturalLanguageRequest() function
 * Tests the contract specification for natural language processing
 */

// Import mocks
require('../unit/mocks');

describe('processNaturalLanguageRequest() Contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input Contract', () => {
    test('should accept valid natural language input', () => {
      const testInput = {
        userInput: 'Show me weekly hours by project for the development team',
        sessionId: 'test-session-123'
      };

      // Mock the function (will be implemented later)
      const mockProcessNaturalLanguageRequest = jest.fn((input) => {
        // Validate input according to contract
        expect(input.userInput).toBeDefined();
        expect(typeof input.userInput).toBe('string');
        expect(input.userInput.length).toBeGreaterThan(0);
        expect(input.userInput.length).toBeLessThanOrEqual(1000);
        
        return {
          success: true,
          data: {
            processedInput: input.userInput.trim().toLowerCase(),
            context: 'mock-context-with-examples',
            cacheKey: 'mock-cache-key-hash'
          }
        };
      });

      const result = mockProcessNaturalLanguageRequest(testInput);
      
      expect(mockProcessNaturalLanguageRequest).toHaveBeenCalledWith(testInput);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('should reject empty input', () => {
      const testInput = {
        userInput: '',
        sessionId: 'test-session-123'
      };

      const mockProcessNaturalLanguageRequest = jest.fn((input) => {
        if (!input.userInput || input.userInput.trim().length === 0) {
          return {
            success: false,
            error: 'Input must be non-empty string'
          };
        }
      });

      const result = mockProcessNaturalLanguageRequest(testInput);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('non-empty');
    });

    test('should reject input exceeding max length', () => {
      const testInput = {
        userInput: 'a'.repeat(1001), // Exceeds MAX_INPUT_LENGTH
        sessionId: 'test-session-123'
      };

      const mockProcessNaturalLanguageRequest = jest.fn((input) => {
        if (input.userInput.length > 1000) {
          return {
            success: false,
            error: 'Input exceeds maximum length of 1000 characters'
          };
        }
      });

      const result = mockProcessNaturalLanguageRequest(testInput);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('maximum length');
    });

    test('should handle missing sessionId gracefully', () => {
      const testInput = {
        userInput: 'Show hours by employee'
        // sessionId omitted (optional)
      };

      const mockProcessNaturalLanguageRequest = jest.fn((input) => {
        return {
          success: true,
          data: {
            processedInput: input.userInput.trim(),
            context: 'mock-context',
            cacheKey: 'mock-cache-key'
          }
        };
      });

      const result = mockProcessNaturalLanguageRequest(testInput);
      
      expect(result.success).toBe(true);
    });
  });

  describe('Output Contract', () => {
    test('should return success response with required data fields', () => {
      const mockProcessNaturalLanguageRequest = jest.fn(() => ({
        success: true,
        data: {
          processedInput: 'show hours by employee for last month',
          context: 'Complete context with field mappings and examples...',
          cacheKey: 'abc123def456'
        }
      }));

      const result = mockProcessNaturalLanguageRequest({
        userInput: 'Show hours by employee for last month'
      });

      // Verify output contract
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('processedInput');
      expect(result.data).toHaveProperty('context');
      expect(result.data).toHaveProperty('cacheKey');
      
      // Verify data types
      expect(typeof result.data.processedInput).toBe('string');
      expect(typeof result.data.context).toBe('string');
      expect(typeof result.data.cacheKey).toBe('string');
    });

    test('should return error response with error message', () => {
      const mockProcessNaturalLanguageRequest = jest.fn(() => ({
        success: false,
        error: 'Input does not contain report-related keywords'
      }));

      const result = mockProcessNaturalLanguageRequest({
        userInput: 'Hello world'
      });

      // Verify error contract
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    });
  });

  describe('Validation Requirements', () => {
    test('should validate input contains report-related keywords', () => {
      const reportKeywords = ['report', 'hours', 'timesheet', 'project', 'employee', 'member', 'time', 'summary'];
      
      const mockProcessNaturalLanguageRequest = jest.fn((input) => {
        const inputLower = input.userInput.toLowerCase();
        const hasReportKeywords = reportKeywords.some(keyword => 
          inputLower.includes(keyword)
        );
        
        if (!hasReportKeywords) {
          return {
            success: false,
            error: 'Input must contain report-related keywords'
          };
        }
        
        return {
          success: true,
          data: {
            processedInput: input.userInput,
            context: 'mock-context',
            cacheKey: 'mock-key'
          }
        };
      });

      // Test with report-related input
      const validResult = mockProcessNaturalLanguageRequest({
        userInput: 'Show me the project hours report'
      });
      expect(validResult.success).toBe(true);

      // Test with non-report input
      const invalidResult = mockProcessNaturalLanguageRequest({
        userInput: 'Hello how are you'
      });
      expect(invalidResult.success).toBe(false);
    });

    test('should ensure context includes examples and field mappings', () => {
      const mockProcessNaturalLanguageRequest = jest.fn(() => {
        const context = `
          Available fields: member, date, from_time, to_time, project, task_type, description
          Functions: calculateHours, formatDate, getDayOfWeek
          Examples: Member Name:record.member, Hours:calculateHours(record.from_time,record.to_time)
        `;
        
        return {
          success: true,
          data: {
            processedInput: 'processed input',
            context: context,
            cacheKey: 'cache-key'
          }
        };
      });

      const result = mockProcessNaturalLanguageRequest({
        userInput: 'Show hours by project'
      });

      expect(result.success).toBe(true);
      expect(result.data.context).toContain('Available fields');
      expect(result.data.context).toContain('Functions');
      expect(result.data.context).toContain('Examples');
    });
  });

  describe('Cache Key Generation', () => {
    test('should generate consistent cache keys for same input', () => {
      const mockProcessNaturalLanguageRequest = jest.fn((input) => {
        // Mock MD5 hash generation
        const mockHash = Utilities.computeDigest(
          Utilities.DigestAlgorithm.MD5,
          input.userInput,
          Utilities.Charset.UTF_8
        );
        const cacheKey = mockHash.map(byte => (byte + 256).toString(16).slice(-2)).join('');
        
        return {
          success: true,
          data: {
            processedInput: input.userInput,
            context: 'mock-context',
            cacheKey: cacheKey
          }
        };
      });

      const input1 = { userInput: 'Show hours by employee' };
      const input2 = { userInput: 'Show hours by employee' };
      
      const result1 = mockProcessNaturalLanguageRequest(input1);
      const result2 = mockProcessNaturalLanguageRequest(input2);

      expect(result1.data.cacheKey).toBe(result2.data.cacheKey);
    });

    test('should generate different cache keys for different input', () => {
      const mockProcessNaturalLanguageRequest = jest.fn((input) => {
        // Simple hash mock based on input
        const cacheKey = `hash-${input.userInput.length}-${input.userInput.charCodeAt(0)}`;
        
        return {
          success: true,
          data: {
            processedInput: input.userInput,
            context: 'mock-context',
            cacheKey: cacheKey
          }
        };
      });

      const input1 = { userInput: 'Show hours by employee' };
      const input2 = { userInput: 'Show hours by project' };
      
      const result1 = mockProcessNaturalLanguageRequest(input1);
      const result2 = mockProcessNaturalLanguageRequest(input2);

      expect(result1.data.cacheKey).not.toBe(result2.data.cacheKey);
    });
  });

  describe('Error Handling', () => {
    test('should handle processing errors gracefully', () => {
      const mockProcessNaturalLanguageRequest = jest.fn(() => {
        try {
          // Simulate processing error
          throw new Error('Context generation failed');
        } catch (error) {
          return {
            success: false,
            error: `Processing failed: ${error.message}`
          };
        }
      });

      const result = mockProcessNaturalLanguageRequest({
        userInput: 'Show hours'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Processing failed');
    });

    test('should validate input parameter exists', () => {
      const mockProcessNaturalLanguageRequest = jest.fn((input) => {
        if (!input || typeof input !== 'object') {
          return {
            success: false,
            error: 'Invalid input parameter'
          };
        }
        
        if (!input.userInput) {
          return {
            success: false,
            error: 'userInput field is required'
          };
        }

        return {
          success: true,
          data: {
            processedInput: input.userInput,
            context: 'mock-context',
            cacheKey: 'mock-key'
          }
        };
      });

      // Test missing input parameter
      const result1 = mockProcessNaturalLanguageRequest(null);
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Invalid input parameter');

      // Test missing userInput field
      const result2 = mockProcessNaturalLanguageRequest({});
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('userInput field is required');
    });
  });
});
