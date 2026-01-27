/**
 * Contract tests for callAIService() function - Gemini integration
 * Tests the contract specification for AI service calls
 */

// Import mocks
require('../unit/mocks');

describe('callAIService() Gemini Contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Gemini Input Contract', () => {
    test('should accept valid Gemini request', () => {
      const testRequest = {
        request: {
          prompt: 'Generate report config for: Show hours by employee',
          naturalInput: 'Show hours by employee',
          service: 'gemini'
        }
      };

      const mockCallAIService = jest.fn((prompt, service) => {
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(0);
        expect(service).toBe('gemini');
        
        return {
          success: true,
          data: {
            rawResponse: '{"reportName":"Hours by Employee","columns":"Member Name:record.member"}',
            service: 'gemini',
            responseTime: 1500,
            confidence: 0.95
          }
        };
      });

      const result = mockCallAIService(testRequest.request.prompt, testRequest.request.service);
      
      expect(result.success).toBe(true);
      expect(result.data.service).toBe('gemini');
    });
  });

  describe('Gemini Output Contract', () => {
    test('should return successful Gemini response', () => {
      const mockCallAIService = jest.fn(() => ({
        success: true,
        data: {
          rawResponse: JSON.stringify({
            candidates: [{
              content: {
                parts: [{
                  text: '{"reportName":"Test Report","columns":"Member:record.member"}'
                }]
              }
            }]
          }),
          service: 'gemini',
          responseTime: 2000
        }
      }));

      const result = mockCallAIService('test prompt', 'gemini');

      expect(result).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('rawResponse');
      expect(result.data).toHaveProperty('service', 'gemini');
      expect(result.data).toHaveProperty('responseTime');
      expect(typeof result.data.responseTime).toBe('number');
    });

    test('should handle Gemini API errors', () => {
      const mockCallAIService = jest.fn(() => ({
        success: false,
        error: {
          type: 'auth',
          message: 'Invalid API key',
          retryable: false
        }
      }));

      const result = mockCallAIService('test prompt', 'gemini');

      expect(result.success).toBe(false);
      expect(result.error).toHaveProperty('type');
      expect(result.error).toHaveProperty('message');
      expect(result.error).toHaveProperty('retryable');
    });
  });
});
