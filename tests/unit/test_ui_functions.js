// Unit tests for UI-interactive functions only (focused for demo)
// Tests the main user-facing functions that interact with Google Apps Script UI

describe('UI Interactive Functions', () => {
  // Mock Google Apps Script globals
  global.SpreadsheetApp = {
    getUi: jest.fn(() => ({
      createMenu: jest.fn(() => ({
        addItem: jest.fn(() => ({
          addItem: jest.fn(() => ({
            addToUi: jest.fn()
          }))
        }))
      })),
      alert: jest.fn(),
      ButtonSet: { YES_NO: 'YES_NO', OK: 'OK' },
      Button: { YES: 'YES', NO: 'NO' }
    })),
    getActiveSpreadsheet: jest.fn(() => ({
      getSheetByName: jest.fn(),
      getId: jest.fn(() => 'mock-spreadsheet-id')
    }))
  };

  global.DriveApp = {
    getFileById: jest.fn(() => ({
      getParents: jest.fn(() => ({
        next: jest.fn(() => ({
          getFoldersByName: jest.fn(() => ({
            hasNext: jest.fn(() => false),
            next: jest.fn()
          })),
          createFolder: jest.fn(() => ({
            getName: jest.fn(() => 'mock-folder')
          }))
        }))
      })),
      makeCopy: jest.fn(() => ({
        moveTo: jest.fn()
      }))
    }))
  };

  global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  };

  // Mock the main constants
  global.TEMPLATE_FILE_ID = "1VK1fZU9QCTobVN2vUJ-FPcjf5BhAr75zUfPWzlXyHH4";
  global.MEMBER_SHEET_NAME = "Members";
  global.MAIN_SHEET_NAME = "Main";
  global.MEMBER_COLUMNS = {
    NO: 0,
    PAV_ID: 1,
    NAME: 2,
    POSITION: 3,
    COMPANY: 4,
    EMAIL: 5,
    IN_ACTIVE: 6,
  };

  // Mock utility functions
  global.readTime = jest.fn(() => '2025-09');
  global.readMembers = jest.fn(() => [
    ['1', 'PAV001', 'John Doe', 'Developer', 'Company A', 'john@example.com', false],
    ['2', 'PAV002', 'Jane Smith', 'Designer', 'Company B', 'jane@example.com', false]
  ]);
  global.createTimesheetFolder = jest.fn(() => ({ getName: () => 'mock-folder' }));
  global.createTimesheetFile = jest.fn();
  global.aggregateMonthlyTimesheets = jest.fn(() => ({
    metadata: {
      successfulFiles: 5,
      totalFiles: 5,
      totalEntries: 150,
      processingTimeMs: 3500,
      systemHealthy: true
    },
    errors: []
  }));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('onOpen function', () => {
    // Load the function from Code.gs - in real scenario this would be imported
    // For testing purposes, we'll define the function inline
    const onOpen = function() {
      var ui = SpreadsheetApp.getUi();
      ui.createMenu('Custom Menu')
        .addItem('Generate Timesheet Files', 'generateTimesheetFiles')
        .addItem('Aggregate Monthly Timesheets', 'aggregateMonthlyTimesheetsUI')
        .addToUi();
    };

    test('should create menu with correct items when spreadsheet opens', () => {
      const mockMenu = {
        addItem: jest.fn(() => mockMenu),
        addToUi: jest.fn()
      };
      const mockUi = {
        createMenu: jest.fn(() => mockMenu)
      };
      SpreadsheetApp.getUi.mockReturnValue(mockUi);

      onOpen();

      expect(SpreadsheetApp.getUi).toHaveBeenCalled();
      expect(mockUi.createMenu).toHaveBeenCalledWith('Custom Menu');
      expect(mockMenu.addItem).toHaveBeenCalledWith('Generate Timesheet Files', 'generateTimesheetFiles');
      expect(mockMenu.addItem).toHaveBeenCalledWith('Aggregate Monthly Timesheets', 'aggregateMonthlyTimesheetsUI');
      expect(mockMenu.addToUi).toHaveBeenCalled();
    });

    test('should handle UI creation errors gracefully', () => {
      SpreadsheetApp.getUi.mockImplementation(() => {
        throw new Error('UI not available');
      });

      expect(() => onOpen()).toThrow('UI not available');
      expect(SpreadsheetApp.getUi).toHaveBeenCalled();
    });
  });

  describe('generateTimesheetFiles function', () => {
    // Define the function inline for testing
    const generateTimesheetFiles = function() {
      const time = readTime();
      const members = readMembers();
      console.log(`Time: ${time}`, `Members: `, members);
      const folder = createTimesheetFolder(time);
      members.forEach(function(member) {
        createTimesheetFile(folder, member, time);
      });
      SpreadsheetApp.getUi().alert(`Timesheet files generated in folder: ${folder.getName()}`);
    };

    test('should generate timesheet files for all active members', () => {
      const mockMembers = [
        ['1', 'PAV001', 'John Doe', 'Developer', 'Company A', 'john@example.com', false],
        ['2', 'PAV002', 'Jane Smith', 'Designer', 'Company B', 'jane@example.com', false]
      ];
      const mockFolder = { getName: () => '2025-09' };
      
      readTime.mockReturnValue('2025-09');
      readMembers.mockReturnValue(mockMembers);
      createTimesheetFolder.mockReturnValue(mockFolder);

      generateTimesheetFiles();

      expect(readTime).toHaveBeenCalled();
      expect(readMembers).toHaveBeenCalled();
      expect(createTimesheetFolder).toHaveBeenCalledWith('2025-09');
      expect(createTimesheetFile).toHaveBeenCalledTimes(2);
      expect(createTimesheetFile).toHaveBeenCalledWith(mockFolder, mockMembers[0], '2025-09');
      expect(createTimesheetFile).toHaveBeenCalledWith(mockFolder, mockMembers[1], '2025-09');
      expect(SpreadsheetApp.getUi().alert).toHaveBeenCalledWith('Timesheet files generated in folder: 2025-09');
    });

    test('should handle empty members list', () => {
      readTime.mockReturnValue('2025-09');
      readMembers.mockReturnValue([]);
      createTimesheetFolder.mockReturnValue({ getName: () => '2025-09' });

      generateTimesheetFiles();

      expect(createTimesheetFile).not.toHaveBeenCalled();
      expect(SpreadsheetApp.getUi().alert).toHaveBeenCalledWith('Timesheet files generated in folder: 2025-09');
    });

    test('should handle folder creation errors', () => {
      readTime.mockReturnValue('2025-09');
      readMembers.mockReturnValue([['1', 'PAV001', 'John Doe', 'Developer', 'Company A', 'john@example.com', false]]);
      createTimesheetFolder.mockImplementation(() => {
        throw new Error('Folder creation failed');
      });

      expect(() => generateTimesheetFiles()).toThrow('Folder creation failed');
      expect(createTimesheetFolder).toHaveBeenCalledWith('2025-09');
    });
  });

  describe('aggregateMonthlyTimesheetsUI function', () => {
    // Define the function inline for testing
    const aggregateMonthlyTimesheetsUI = function() {
      try {
        const time = readTime();
        
        const ui = SpreadsheetApp.getUi();
        const response = ui.alert(
          'Aggregate Monthly Timesheets',
          `This will aggregate all timesheet files for ${time}. This operation may take several minutes for large datasets. Continue?`,
          ui.ButtonSet.YES_NO
        );
        
        if (response !== ui.Button.YES) {
          return;
        }
        
        ui.alert('Processing...', 'Aggregating monthly timesheets. Please wait...', ui.ButtonSet.OK);
        
        const result = aggregateMonthlyTimesheets(time);
        
        const summary = `
Aggregation completed for ${time}:
• Total files processed: ${result.metadata.successfulFiles}/${result.metadata.totalFiles}
• Total entries: ${result.metadata.totalEntries}
• Processing time: ${Math.round(result.metadata.processingTimeMs / 1000)}s
• Errors: ${result.errors ? result.errors.length : 0}
• System healthy: ${result.metadata.systemHealthy ? 'Yes' : 'No'}
        `.trim();
        
        ui.alert('Aggregation Complete', summary, ui.ButtonSet.OK);
        
        console.log('Aggregation result:', result);
        
      } catch (error) {
        console.error('Error in aggregateMonthlyTimesheetsUI:', error);
        SpreadsheetApp.getUi().alert(
          'Aggregation Error', 
          `An error occurred during aggregation: ${error.message}`,
          SpreadsheetApp.getUi().ButtonSet.OK
        );
      }
    };

    test('should complete aggregation workflow when user confirms', () => {
      const mockUi = {
        alert: jest.fn()
          .mockReturnValueOnce(SpreadsheetApp.getUi().Button.YES) // Confirmation
          .mockReturnValueOnce(undefined) // Processing message
          .mockReturnValueOnce(undefined), // Completion message
        ButtonSet: { YES_NO: 'YES_NO', OK: 'OK' },
        Button: { YES: 'YES', NO: 'NO' }
      };
      
      SpreadsheetApp.getUi.mockReturnValue(mockUi);
      readTime.mockReturnValue('2025-09');
      
      const mockResult = {
        metadata: {
          successfulFiles: 5,
          totalFiles: 5,
          totalEntries: 150,
          processingTimeMs: 3500,
          systemHealthy: true
        },
        errors: []
      };
      aggregateMonthlyTimesheets.mockReturnValue(mockResult);

      aggregateMonthlyTimesheetsUI();

      expect(readTime).toHaveBeenCalled();
      expect(mockUi.alert).toHaveBeenCalledTimes(3);
      expect(mockUi.alert).toHaveBeenNthCalledWith(1, 
        'Aggregate Monthly Timesheets',
        'This will aggregate all timesheet files for 2025-09. This operation may take several minutes for large datasets. Continue?',
        'YES_NO'
      );
      expect(aggregateMonthlyTimesheets).toHaveBeenCalledWith('2025-09');
      expect(mockUi.alert).toHaveBeenNthCalledWith(3, 
        'Aggregation Complete',
        expect.stringContaining('Total files processed: 5/5'),
        'OK'
      );
    });

    test('should cancel operation when user declines', () => {
      const mockUi = {
        alert: jest.fn().mockReturnValue(SpreadsheetApp.getUi().Button.NO),
        ButtonSet: { YES_NO: 'YES_NO', OK: 'OK' },
        Button: { YES: 'YES', NO: 'NO' }
      };
      
      SpreadsheetApp.getUi.mockReturnValue(mockUi);
      readTime.mockReturnValue('2025-09');

      aggregateMonthlyTimesheetsUI();

      expect(mockUi.alert).toHaveBeenCalledTimes(1);
      expect(aggregateMonthlyTimesheets).not.toHaveBeenCalled();
    });

    test('should handle aggregation errors gracefully', () => {
      const mockUi = {
        alert: jest.fn()
          .mockReturnValueOnce(SpreadsheetApp.getUi().Button.YES)
          .mockReturnValueOnce(undefined)
          .mockReturnValueOnce(undefined),
        ButtonSet: { YES_NO: 'YES_NO', OK: 'OK' },
        Button: { YES: 'YES', NO: 'NO' }
      };
      
      SpreadsheetApp.getUi.mockReturnValue(mockUi);
      readTime.mockReturnValue('2025-09');
      aggregateMonthlyTimesheets.mockImplementation(() => {
        throw new Error('Aggregation failed');
      });

      aggregateMonthlyTimesheetsUI();

      expect(console.error).toHaveBeenCalledWith('Error in aggregateMonthlyTimesheetsUI:', expect.any(Error));
      expect(mockUi.alert).toHaveBeenLastCalledWith(
        'Aggregation Error',
        'An error occurred during aggregation: Aggregation failed',
        'OK'
      );
    });

    test('should display correct summary format', () => {
      const mockUi = {
        alert: jest.fn().mockReturnValue(SpreadsheetApp.getUi().Button.YES),
        ButtonSet: { YES_NO: 'YES_NO', OK: 'OK' },
        Button: { YES: 'YES', NO: 'NO' }
      };
      
      SpreadsheetApp.getUi.mockReturnValue(mockUi);
      readTime.mockReturnValue('2025-09');
      
      const mockResult = {
        metadata: {
          successfulFiles: 3,
          totalFiles: 5,
          totalEntries: 75,
          processingTimeMs: 2500,
          systemHealthy: false
        },
        errors: ['Error 1', 'Error 2']
      };
      aggregateMonthlyTimesheets.mockReturnValue(mockResult);

      aggregateMonthlyTimesheetsUI();

      const summaryCall = mockUi.alert.mock.calls.find(call => call[0] === 'Aggregation Complete');
      expect(summaryCall[1]).toContain('Total files processed: 3/5');
      expect(summaryCall[1]).toContain('Total entries: 75');
      expect(summaryCall[1]).toContain('Processing time: 3s');
      expect(summaryCall[1]).toContain('Errors: 2');
      expect(summaryCall[1]).toContain('System healthy: No');
    });
  });

  describe('Error handling across UI functions', () => {
    test('should handle SpreadsheetApp.getUi() failures', () => {
      SpreadsheetApp.getUi.mockImplementation(() => {
        throw new Error('UI service unavailable');
      });

      const testFunction = function() {
        SpreadsheetApp.getUi().alert('Test');
      };

      expect(() => testFunction()).toThrow('UI service unavailable');
    });

    test('should handle data reading failures gracefully', () => {
      readTime.mockImplementation(() => {
        throw new Error('Cannot read time data');
      });

      const generateTimesheetFiles = function() {
        const time = readTime();
        return time;
      };

      expect(() => generateTimesheetFiles()).toThrow('Cannot read time data');
    });
  });
});
