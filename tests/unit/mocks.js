/**
 * Mock Google Apps Script APIs for testing
 * Provides mock implementations of SpreadsheetApp, DriveApp, Logger, etc.
 */

// Mock SpreadsheetApp
const SpreadsheetApp = {
  getActiveSpreadsheet: jest.fn(() => ({
    getSheetByName: jest.fn((name) => ({
      getName: jest.fn(() => name),
      getDataRange: jest.fn(() => ({
        getDisplayValues: jest.fn(() => [
          ['Report Name', 'Description', 'Columns', 'Filters', 'Sort By', 'Sort Order', 'Summary Type', 'Enabled', 'Output Structure', 'Grouping Field'],
          ['Test Report', 'Test Description', 'Member Name,Hours', '', 'Member Name', 'ASC', 'NONE', 'TRUE', 'SINGLE_SHEET', '']
        ])
      })),
      getRange: jest.fn(() => ({
        setValues: jest.fn(),
        setFontWeight: jest.fn(),
        setBackground: jest.fn()
      }))
    })),
    insertSheet: jest.fn((name) => ({
      getName: jest.fn(() => name),
      getRange: jest.fn(() => ({
        setValues: jest.fn()
      }))
    }))
  })),
  
  create: jest.fn((name) => ({
    getId: jest.fn(() => 'mock-spreadsheet-id'),
    getUrl: jest.fn(() => 'https://docs.google.com/spreadsheets/mock-url'),
    getActiveSheet: jest.fn(() => ({
      getName: jest.fn(() => 'Sheet1'),
      getRange: jest.fn(() => ({
        setValues: jest.fn(),
        setFontWeight: jest.fn(),
        setBackground: jest.fn()
      }))
    })),
    insertSheet: jest.fn((name) => ({
      getName: jest.fn(() => name)
    }))
  }))
};

// Mock DriveApp
const DriveApp = {
  createFolder: jest.fn((name) => ({
    getId: jest.fn(() => 'mock-folder-id'),
    addFile: jest.fn()
  })),
  
  getFileById: jest.fn((id) => ({
    getName: jest.fn(() => 'Mock File'),
    moveTo: jest.fn()
  })),
  
  getFoldersByName: jest.fn((name) => ({
    hasNext: jest.fn(() => true),
    next: jest.fn(() => ({
      getName: jest.fn(() => name),
      getFiles: jest.fn(() => ({
        hasNext: jest.fn(() => false)
      }))
    }))
  })),
  
  getRootFolder: jest.fn(() => ({
    getFoldersByName: jest.fn((name) => ({
      hasNext: jest.fn(() => true),
      next: jest.fn(() => ({
        getName: jest.fn(() => name),
        getFiles: jest.fn(() => ({
          hasNext: jest.fn(() => false)
        }))
      }))
    }))
  }))
};

// Mock Logger - simple implementation without circular reference
const Logger = {
  log: jest.fn()
};

// Mock console - simple implementation without circular reference
const console = {
  log: jest.fn()
};

// Mock Date for consistent testing
const MockDate = Date;

// Mock UI for user interactions
const UI = {
  alert: jest.fn((title, message, buttons) => {
    console.log(`[Mock UI Alert] ${title}: ${message}`);
    return { getSelectedButton: jest.fn(() => 'OK') };
  }),
  
  prompt: jest.fn((title, message, buttons) => {
    console.log(`[Mock UI Prompt] ${title}: ${message}`);
    return { 
      getSelectedButton: jest.fn(() => 'OK'),
      getResponseText: jest.fn(() => 'Mock Response')
    };
  }),
  
  ButtonSet: {
    OK: 'OK',
    OK_CANCEL: 'OK_CANCEL',
    YES_NO: 'YES_NO',
    YES_NO_CANCEL: 'YES_NO_CANCEL'
  }
};

// Add getUi method to SpreadsheetApp mock
SpreadsheetApp.getUi = jest.fn(() => UI);

// Mock utilities for time and date parsing
const MockUtilities = {
  parseDate: jest.fn((dateString) => {
    return new Date(dateString);
  }),
  
  formatDate: jest.fn((date, format) => {
    return date.toISOString().split('T')[0];
  })
};

// Mock Session for user info
const Session = {
  getActiveUser: jest.fn(() => ({
    getEmail: jest.fn(() => 'test@example.com')
  }))
};

// Export all mocks
module.exports = {
  SpreadsheetApp,
  DriveApp,
  Logger,
  console,
  UI,
  Utilities: MockUtilities,
  Session,
  
  // Helper functions for test setup
  resetMocks: function() {
    jest.clearAllMocks();
  },
  
  // Mock implementation helpers
  mockSpreadsheetData: function(data) {
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName().getDataRange().getDisplayValues.mockReturnValue(data);
  },
  
  mockSheetExists: function(sheetName, exists) {
    if (exists) {
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName.mockReturnValue({
        getName: jest.fn(() => sheetName),
        getDataRange: jest.fn(() => ({
          getDisplayValues: jest.fn(() => [])
        }))
      });
    } else {
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName.mockImplementation(() => {
        throw new Error(`Sheet "${sheetName}" not found`);
      });
    }
  }
};

// ============================================================================
// AI-SPECIFIC MOCKS FOR REPORT GENERATION
// ============================================================================

// Add UI methods to SpreadsheetApp for AI dialog interactions
SpreadsheetApp.getUi = jest.fn(() => ({
  prompt: jest.fn(() => ({
    getSelectedButton: jest.fn(() => 'OK'),
    getResponseText: jest.fn(() => 'Show hours by employee for last month')
  })),
  alert: jest.fn(),
  showModalDialog: jest.fn(),
  Button: {
    OK: 'OK',
    CANCEL: 'CANCEL',
    YES: 'YES',
    NO: 'NO'
  },
  ButtonSet: {
    OK: 'OK',
    OK_CANCEL: 'OK_CANCEL',
    YES_NO: 'YES_NO',
    YES_NO_CANCEL: 'YES_NO_CANCEL'
  }
}));

// Mock PropertiesService for AI API key storage and caching
const PropertiesService = {
  getScriptProperties: jest.fn(() => ({
    getProperty: jest.fn((key) => {
      // Return mock encoded API keys
      if (key === 'AI_GEMINI_KEY') return 'bW9jay1nZW1pbmkta2V5'; // base64 'mock-gemini-key'
      if (key === 'AI_CLAUDE_KEY') return 'bW9jay1jbGF1ZGUta2V5'; // base64 'mock-claude-key'
      if (key === 'AI_KEYS_UPDATED') return '2025-10-28T12:00:00.000Z';
      return null;
    }),
    setProperties: jest.fn(),
    setProperty: jest.fn(),
    deleteProperty: jest.fn(),
    getProperties: jest.fn().mockReturnValue({})
  }))
};

// Mock UrlFetchApp for AI service calls
const UrlFetchApp = {
  fetch: jest.fn((url, options) => {
    // Mock successful AI service responses
    let mockResponse;
    
    if (url.includes('generativelanguage.googleapis.com')) {
      // Mock Gemini response
      mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                reportName: 'Monthly Hours by Employee',
                description: 'Shows total hours worked by each employee last month',
                columns: 'Member Name:record.member,Hours:calculateHours(record.from_time,record.to_time)',
                summaryType: 'MEMBER_TOTALS',
                outputStructure: 'SINGLE_SHEET'
              })
            }]
          }
        }]
      };
    } else if (url.includes('api.anthropic.com')) {
      // Mock Claude response
      mockResponse = {
        content: [{
          text: JSON.stringify({
            reportName: 'Employee Hours Report',
            description: 'Employee hours breakdown for recent period',
            columns: 'Member Name:record.member,Project:record.project,Hours:calculateHours(record.from_time,record.to_time)',
            summaryType: 'MEMBER_TOTALS',
            outputStructure: 'SINGLE_SHEET'
          })
        }]
      };
    }
    
    return {
      getResponseCode: jest.fn(() => 200),
      getContentText: jest.fn(() => JSON.stringify(mockResponse))
    };
  })
};

// Mock Utilities for AI functions
const Utilities = {
  computeDigest: jest.fn((algorithm, input, charset) => {
    // Return mock MD5 hash as byte array
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  }),
  base64Encode: jest.fn((input) => {
    return Buffer.from(input).toString('base64');
  }),
  base64Decode: jest.fn((input, charset) => {
    // Return mock byte array
    return [109, 111, 99, 107, 45, 107, 101, 121]; // 'mock-key' as bytes
  }),
  newBlob: jest.fn((data) => ({
    getDataAsString: jest.fn(() => 'mock-decoded-key')
  })),
  DigestAlgorithm: {
    MD5: 'MD5'
  },
  Charset: {
    UTF_8: 'UTF_8'
  }
};

// Set up global mocks for AI functions
global.SpreadsheetApp = SpreadsheetApp;
global.DriveApp = DriveApp;
global.Logger = Logger;
global.PropertiesService = PropertiesService;
global.UrlFetchApp = UrlFetchApp;
global.Utilities = Utilities;

// Mock sheet data for testing
const mockSheetData = [
  ['date', 'project', 'task', 'startTime', 'endTime', 'hours', 'description'],
  ['2025-01-15', 'ProjectA', 'Development', '09:00', '12:00', '3', 'Feature implementation'],
  ['2025-01-15', 'ProjectB', 'Testing', '13:00', '17:00', '4', 'Unit test writing'],  
  ['2025-01-16', 'ProjectA', 'Review', '09:00', '11:00', '2', 'Code review']
];

// Enhanced exports including AI mocks
module.exports = {
  SpreadsheetApp,
  DriveApp,
  Logger,
  PropertiesService,
  UrlFetchApp,
  Utilities,
  mockSheetData
};
