/**
 * Contract tests for AI configuration caching functions
 * Tests the setCachedConfiguration, getCachedConfiguration, and clearExpiredCache functions
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock the Google Apps Script environment
require('../unit/mocks');

// Import the functions to test
const { setCachedConfiguration, getCachedConfiguration, clearExpiredCache } = require('../../script/ai-report-generator');

describe('AI Configuration Caching Contract Tests', () => {
  let mockProperties;
  let mockPropertiesService;

  beforeEach(() => {
    // Create a fresh properties store for each test
    const propertiesStore = {};
    
    mockProperties = {
      setProperty: jest.fn((key, value) => {
        propertiesStore[key] = value;
      }),
      getProperty: jest.fn((key) => {
        return propertiesStore[key] || null;
      }),
      deleteProperty: jest.fn((key) => {
        delete propertiesStore[key];
      }),
      getProperties: jest.fn(() => {
        return { ...propertiesStore };
      })
    };

    mockPropertiesService = {
      getScriptProperties: jest.fn().mockReturnValue(mockProperties)
    };

    // Mock PropertiesService global
    global.PropertiesService = mockPropertiesService;
    
    // Mock Date for consistent timestamp testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('setCachedConfiguration() Function', () => {
    
    it('should store configuration with proper cache key and expiration', () => {
      // Arrange
      const cacheKey = 'test-cache-key';
      const config = {
        reportName: 'Test Report',
        description: 'Test Description',
        columns: 'Date,Hours'
      };
      const service = 'gemini';

      // Act
      const result = setCachedConfiguration(cacheKey, config, service);

      // Assert
      expect(result.success).toBe(true);
      expect(result.cacheKey).toBe(cacheKey);
      expect(result.expiresAt).toBe('2024-01-16T10:00:00.000Z'); // 24 hours later
      
      expect(mockProperties.setProperty).toHaveBeenCalledWith(
        `AI_CACHE_${cacheKey}`,
        expect.stringContaining('"config":')
      );
      
      // Verify the stored data structure
      const storedCall = mockProperties.setProperty.mock.calls[0];
      const storedData = JSON.parse(storedCall[1]);
      expect(storedData.config).toEqual(config);
      expect(storedData.service).toBe(service);
      expect(storedData.timestamp).toBe('2024-01-15T10:00:00.000Z');
      expect(storedData.expiresAt).toBe('2024-01-16T10:00:00.000Z');
    });

    it('should handle cache storage errors gracefully', () => {
      // Arrange
      mockProperties.setProperty.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const cacheKey = 'test-key';
      const config = { reportName: 'Test' };
      const service = 'claude';

      // Act
      const result = setCachedConfiguration(cacheKey, config, service);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to cache configuration');
    });

  });

  describe('getCachedConfiguration() Function', () => {
    
    it('should retrieve valid cached configuration', () => {
      // Arrange
      const cacheKey = 'valid-cache';
      const cachedConfig = {
        reportName: 'Cached Report',
        columns: 'Member,Hours'
      };
      
      const cacheData = {
        config: cachedConfig,
        service: 'gemini',
        timestamp: '2024-01-15T09:00:00.000Z',
        expiresAt: '2024-01-16T09:00:00.000Z' // Still valid
      };
      
      mockProperties.getProperty.mockReturnValue(JSON.stringify(cacheData));

      // Act
      const result = getCachedConfiguration(cacheKey);

      // Assert
      expect(result.success).toBe(true);
      expect(result.found).toBe(true);
      expect(result.config).toEqual(cachedConfig);
      expect(result.service).toBe('gemini');
      expect(result.timestamp).toBe('2024-01-15T09:00:00.000Z');
      expect(result.expiresAt).toBe('2024-01-16T09:00:00.000Z');
      
      expect(mockProperties.getProperty).toHaveBeenCalledWith(`AI_CACHE_${cacheKey}`);
    });

    it('should return not found when no cache exists', () => {
      // Arrange
      const cacheKey = 'nonexistent-key';
      mockProperties.getProperty.mockReturnValue(null);

      // Act
      const result = getCachedConfiguration(cacheKey);

      // Assert
      expect(result.success).toBe(true);
      expect(result.found).toBe(false);
      expect(result.reason).toBe('No cached data found');
    });

    it('should detect and clean up expired cache', () => {
      // Arrange
      const cacheKey = 'expired-cache';
      const expiredCacheData = {
        config: { reportName: 'Expired Report' },
        service: 'claude',
        timestamp: '2024-01-14T08:00:00.000Z',
        expiresAt: '2024-01-15T08:00:00.000Z' // Expired (current time is 10:00)
      };
      
      mockProperties.getProperty.mockReturnValue(JSON.stringify(expiredCacheData));

      // Act
      const result = getCachedConfiguration(cacheKey);

      // Assert
      expect(result.success).toBe(true);
      expect(result.found).toBe(false);
      expect(result.reason).toBe('Cache expired');
      
      // Verify expired cache was deleted
      expect(mockProperties.deleteProperty).toHaveBeenCalledWith(`AI_CACHE_${cacheKey}`);
    });

    it('should handle cache retrieval errors gracefully', () => {
      // Arrange
      const cacheKey = 'error-key';
      mockProperties.getProperty.mockImplementation(() => {
        throw new Error('Properties service unavailable');
      });

      // Act
      const result = getCachedConfiguration(cacheKey);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to retrieve cached configuration');
    });

    it('should handle corrupted cache data gracefully', () => {
      // Arrange
      const cacheKey = 'corrupted-cache';
      mockProperties.getProperty.mockReturnValue('invalid json data');

      // Act
      const result = getCachedConfiguration(cacheKey);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to retrieve cached configuration');
    });

  });

  describe('clearExpiredCache() Function', () => {
    
    it('should clear expired cache entries only', () => {
      // Arrange
      const propertiesData = {
        'AI_CACHE_valid1': JSON.stringify({
          config: { reportName: 'Valid 1' },
          expiresAt: '2024-01-16T12:00:00.000Z' // Future
        }),
        'AI_CACHE_expired1': JSON.stringify({
          config: { reportName: 'Expired 1' },
          expiresAt: '2024-01-15T08:00:00.000Z' // Past
        }),
        'AI_CACHE_expired2': JSON.stringify({
          config: { reportName: 'Expired 2' },
          expiresAt: '2024-01-14T10:00:00.000Z' // Past
        }),
        'OTHER_PROPERTY': 'should not be touched'
      };
      
      mockProperties.getProperties.mockReturnValue(propertiesData);

      // Act
      const result = clearExpiredCache();

      // Assert
      expect(result.success).toBe(true);
      expect(result.clearedCount).toBe(2);
      expect(result.errorCount).toBe(0);
      
      // Verify correct entries were deleted
      expect(mockProperties.deleteProperty).toHaveBeenCalledWith('AI_CACHE_expired1');
      expect(mockProperties.deleteProperty).toHaveBeenCalledWith('AI_CACHE_expired2');
      expect(mockProperties.deleteProperty).not.toHaveBeenCalledWith('AI_CACHE_valid1');
      expect(mockProperties.deleteProperty).not.toHaveBeenCalledWith('OTHER_PROPERTY');
    });

    it('should handle corrupted cache entries by removing them', () => {
      // Arrange
      const propertiesData = {
        'AI_CACHE_valid': JSON.stringify({
          config: { reportName: 'Valid' },
          expiresAt: '2024-01-16T12:00:00.000Z'
        }),
        'AI_CACHE_corrupted1': 'invalid json',
        'AI_CACHE_corrupted2': '{"incomplete": "json"'
      };
      
      mockProperties.getProperties.mockReturnValue(propertiesData);

      // Act
      const result = clearExpiredCache();

      // Assert
      expect(result.success).toBe(true);
      expect(result.clearedCount).toBe(0);
      expect(result.errorCount).toBe(2);
      
      // Verify corrupted entries were deleted
      expect(mockProperties.deleteProperty).toHaveBeenCalledWith('AI_CACHE_corrupted1');
      expect(mockProperties.deleteProperty).toHaveBeenCalledWith('AI_CACHE_corrupted2');
      expect(mockProperties.deleteProperty).not.toHaveBeenCalledWith('AI_CACHE_valid');
    });

    it('should handle empty properties gracefully', () => {
      // Arrange
      mockProperties.getProperties.mockReturnValue({});

      // Act
      const result = clearExpiredCache();

      // Assert
      expect(result.success).toBe(true);
      expect(result.clearedCount).toBe(0);
      expect(result.errorCount).toBe(0);
    });

    it('should handle cache cleanup errors gracefully', () => {
      // Arrange
      mockProperties.getProperties.mockImplementation(() => {
        throw new Error('Properties service error');
      });

      // Act
      const result = clearExpiredCache();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to clear expired cache');
    });

  });

});
