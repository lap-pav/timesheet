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
  }))
};

// Mock Logger
const Logger = {
  log: jest.fn((message) => {
    console.log('[Mock Logger]', message);
  })
};

// Mock console for Google Apps Script environment
const console = {
  log: jest.fn((message) => {
    // In real Google Apps Script, console.log maps to Logger.log
    Logger.log(message);
  })
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
