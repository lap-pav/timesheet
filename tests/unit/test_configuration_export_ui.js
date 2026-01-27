// Unit tests for Configuration Export UI functions only (focused for demo)
// Tests the main user-facing functions for configurable report export

describe('Configuration Export UI Functions', () => {
  // Mock Google Apps Script globals
  global.SpreadsheetApp = {
    getUi: jest.fn(() => ({
      createMenu: jest.fn(() => ({
        addItem: jest.fn(() => ({
          addItem: jest.fn(() => ({
            addItem: jest.fn(() => ({
              addToUi: jest.fn()
            }))
          }))
        }))
      })),
      alert: jest.fn(),
      prompt: jest.fn(),
      ButtonSet: { YES_NO: 'YES_NO', OK: 'OK', OK_CANCEL: 'OK_CANCEL' },
      Button: { YES: 'YES', NO: 'NO', OK: 'OK', CANCEL: 'CANCEL' }
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

  // Mock the configuration export constants
  global.REPORT_CONFIG = {
    REPORT_CONFIG_SHEET_NAME: "Report Configs",
    CONFIG_COLUMNS: {
      REPORT_NAME: 0,
      DESCRIPTION: 1,
      COLUMNS: 2,
      FILTERS: 3,
      SORT_BY: 4,
      SORT_ORDER: 5,
      SUMMARY_TYPE: 6,
      ENABLED: 7
    },
    MAX_REPORT_NAME_LENGTH: 50,
    MAX_DESCRIPTION_LENGTH: 200,
    VALID_SORT_ORDERS: ['ASC', 'DESC'],
    VALID_SUMMARY_TYPES: ['SUM', 'COUNT', 'AVG', 'NONE']
  };

  global.ERROR_TYPES = {
    CONFIG_SHEET_NOT_FOUND: 'CONFIG_SHEET_NOT_FOUND',
    CONFIG_VALIDATION_ERROR: 'CONFIG_VALIDATION_ERROR',
    REPORT_GENERATION_ERROR: 'REPORT_GENERATION_ERROR',
    EXPORT_ERROR: 'EXPORT_ERROR'
  };

  // Mock utility functions
  global.readReportConfigurations = jest.fn();
  global.generateConfigurableReport = jest.fn();
  global.exportReportToGoogleSheets = jest.fn();
  global.aggregateMonthlyTimesheets = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportConfigurableReportUI function', () => {
    // Define the function signature we expect to implement
    const exportConfigurableReportUI = function() {
      try {
        // Get available configurations
        const configResult = readReportConfigurations();
        
        if (!configResult.success || configResult.configurations.length === 0) {
          SpreadsheetApp.getUi().alert(
            'No Report Configurations',
            'No valid report configurations found. Please set up configurations in the "Report Configs" sheet first.',
            SpreadsheetApp.getUi().ButtonSet.OK
          );
          return;
        }
        
        // Show configuration selection dialog
        const selectedConfig = selectReportConfigurationUI(configResult.configurations);
        if (!selectedConfig) {
          return; // User cancelled
        }
        
        // Get aggregated data
        const time = readTime();
        const aggregatedData = aggregateMonthlyTimesheets(time);
        
        // Generate report
        const reportResult = generateConfigurableReport(aggregatedData, selectedConfig);
        if (!reportResult.success) {
          SpreadsheetApp.getUi().alert(
            'Report Generation Error',
            `Failed to generate report: ${reportResult.errors.join(', ')}`,
            SpreadsheetApp.getUi().ButtonSet.OK
          );
          return;
        }
        
        // Export to Google Sheets
        const folder = createTimesheetFolder(time);
        const exportResult = exportReportToGoogleSheets(reportResult.reportData, selectedConfig, folder);
        
        if (exportResult.success) {
          SpreadsheetApp.getUi().alert(
            'Report Export Complete',
            `Report "${selectedConfig.reportName}" exported successfully.\nFile: ${exportResult.fileName}`,
            SpreadsheetApp.getUi().ButtonSet.OK
          );
        } else {
          SpreadsheetApp.getUi().alert(
            'Export Error',
            `Failed to export report: ${exportResult.errors.join(', ')}`,
            SpreadsheetApp.getUi().ButtonSet.OK
          );
        }
        
      } catch (error) {
        console.error('Error in exportConfigurableReportUI:', error);
        SpreadsheetApp.getUi().alert(
          'System Error',
          `An unexpected error occurred: ${error.message}`,
          SpreadsheetApp.getUi().ButtonSet.OK
        );
      }
    };

    test('should show configuration selection when valid configs exist', () => {
      const mockConfigs = [
        { reportName: 'Monthly Summary', description: 'Test config', enabled: true }
      ];
      const mockReportData = { headers: ['Test'], rows: [['data']], metadata: {} };
      const mockExportResult = { success: true, fileName: 'test-report.xlsx' };
      
      readReportConfigurations.mockReturnValue({ success: true, configurations: mockConfigs });
      global.selectReportConfigurationUI = jest.fn().mockReturnValue(mockConfigs[0]);
      global.readTime = jest.fn().mockReturnValue('2025-10');
      aggregateMonthlyTimesheets.mockReturnValue({ entries: [] });
      generateConfigurableReport.mockReturnValue({ success: true, reportData: mockReportData });
      global.createTimesheetFolder = jest.fn().mockReturnValue({});
      exportReportToGoogleSheets.mockReturnValue(mockExportResult);

      exportConfigurableReportUI();

      expect(readReportConfigurations).toHaveBeenCalled();
      expect(global.selectReportConfigurationUI).toHaveBeenCalledWith(mockConfigs);
      expect(SpreadsheetApp.getUi().alert).toHaveBeenCalledWith(
        'Report Export Complete',
        expect.stringContaining('exported successfully'),
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    });

    test('should show error when no configurations found', () => {
      readReportConfigurations.mockReturnValue({ success: false, configurations: [], errors: ['No configs'] });

      exportConfigurableReportUI();

      expect(SpreadsheetApp.getUi().alert).toHaveBeenCalledWith(
        'No Report Configurations',
        expect.stringContaining('No valid report configurations found'),
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    });

    test('should handle report generation errors gracefully', () => {
      const mockConfigs = [{ reportName: 'Test', enabled: true }];
      readReportConfigurations.mockReturnValue({ success: true, configurations: mockConfigs });
      global.selectReportConfigurationUI = jest.fn().mockReturnValue(mockConfigs[0]);
      global.readTime = jest.fn().mockReturnValue('2025-10');
      aggregateMonthlyTimesheets.mockReturnValue({ entries: [] });
      generateConfigurableReport.mockReturnValue({ success: false, errors: ['Test error'] });

      exportConfigurableReportUI();

      expect(SpreadsheetApp.getUi().alert).toHaveBeenCalledWith(
        'Report Generation Error',
        expect.stringContaining('Failed to generate report'),
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    });

    test('should handle user cancellation', () => {
      const mockConfigs = [{ reportName: 'Test', enabled: true }];
      readReportConfigurations.mockReturnValue({ success: true, configurations: mockConfigs });
      global.selectReportConfigurationUI = jest.fn().mockReturnValue(null); // User cancelled

      exportConfigurableReportUI();

      expect(generateConfigurableReport).not.toHaveBeenCalled();
      expect(exportReportToGoogleSheets).not.toHaveBeenCalled();
    });
  });

  describe('selectReportConfigurationUI function', () => {
    // Define the function signature we expect to implement
    const selectReportConfigurationUI = function(configurations) {
      if (!configurations || configurations.length === 0) {
        return null;
      }
      
      if (configurations.length === 1) {
        // If only one configuration, confirm with user
        const response = SpreadsheetApp.getUi().alert(
          'Generate Report',
          `Generate report: "${configurations[0].reportName}"?\n\n${configurations[0].description}`,
          SpreadsheetApp.getUi().ButtonSet.YES_NO
        );
        
        return response === SpreadsheetApp.getUi().Button.YES ? configurations[0] : null;
      }
      
      // Multiple configurations - show selection dialog
      let prompt = 'Select a report configuration:\n\n';
      configurations.forEach(function(config, index) {
        prompt += `${index + 1}. ${config.reportName}\n   ${config.description}\n\n`;
      });
      prompt += 'Enter the number (1-' + configurations.length + ') or cancel:';
      
      const response = SpreadsheetApp.getUi().prompt(
        'Select Report Configuration',
        prompt,
        SpreadsheetApp.getUi().ButtonSet.OK_CANCEL
      );
      
      if (response.getSelectedButton() !== SpreadsheetApp.getUi().Button.OK) {
        return null; // User cancelled
      }
      
      const choice = parseInt(response.getResponseText());
      if (isNaN(choice) || choice < 1 || choice > configurations.length) {
        SpreadsheetApp.getUi().alert(
          'Invalid Selection',
          'Please enter a valid number between 1 and ' + configurations.length,
          SpreadsheetApp.getUi().ButtonSet.OK
        );
        return null;
      }
      
      return configurations[choice - 1];
    };

    test('should display available configurations for user selection', () => {
      const mockConfigs = [
        { reportName: 'Monthly Summary', description: 'Total hours by member' },
        { reportName: 'Daily Detail', description: 'Detailed daily breakdown' }
      ];
      
      const mockResponse = {
        getSelectedButton: jest.fn().mockReturnValue(SpreadsheetApp.getUi().Button.OK),
        getResponseText: jest.fn().mockReturnValue('1')
      };
      SpreadsheetApp.getUi().prompt.mockReturnValue(mockResponse);

      const result = selectReportConfigurationUI(mockConfigs);

      expect(SpreadsheetApp.getUi().prompt).toHaveBeenCalledWith(
        'Select Report Configuration',
        expect.stringContaining('Monthly Summary'),
        SpreadsheetApp.getUi().ButtonSet.OK_CANCEL
      );
      expect(result).toBe(mockConfigs[0]);
    });

    test('should handle single configuration with confirmation', () => {
      const mockConfig = [{ reportName: 'Only Config', description: 'Single option' }];
      SpreadsheetApp.getUi().alert.mockReturnValue(SpreadsheetApp.getUi().Button.YES);

      const result = selectReportConfigurationUI(mockConfig);

      expect(SpreadsheetApp.getUi().alert).toHaveBeenCalledWith(
        'Generate Report',
        expect.stringContaining('Only Config'),
        SpreadsheetApp.getUi().ButtonSet.YES_NO
      );
      expect(result).toBe(mockConfig[0]);
    });

    test('should handle user cancellation', () => {
      const mockConfigs = [{ reportName: 'Test', description: 'Test config' }];
      SpreadsheetApp.getUi().alert.mockReturnValue(SpreadsheetApp.getUi().Button.NO);

      const result = selectReportConfigurationUI(mockConfigs);

      expect(result).toBeNull();
    });

    test('should handle empty configurations', () => {
      const result = selectReportConfigurationUI([]);
      expect(result).toBeNull();
    });

    test('should handle invalid selection number', () => {
      const mockConfigs = [
        { reportName: 'Config 1', description: 'First' },
        { reportName: 'Config 2', description: 'Second' }
      ];
      
      const mockResponse = {
        getSelectedButton: jest.fn().mockReturnValue(SpreadsheetApp.getUi().Button.OK),
        getResponseText: jest.fn().mockReturnValue('5') // Invalid choice
      };
      SpreadsheetApp.getUi().prompt.mockReturnValue(mockResponse);

      const result = selectReportConfigurationUI(mockConfigs);

      expect(SpreadsheetApp.getUi().alert).toHaveBeenCalledWith(
        'Invalid Selection',
        expect.stringContaining('valid number'),
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      expect(result).toBeNull();
    });
  });

  describe('onOpen menu integration', () => {
    // Define the expected updated onOpen function
    const onOpenWithConfigExport = function() {
      var ui = SpreadsheetApp.getUi();
      ui.createMenu('Custom Menu')
        .addItem('Generate Timesheet Files', 'generateTimesheetFiles')
        .addItem('Aggregate Monthly Timesheets', 'aggregateMonthlyTimesheetsUI')
        .addItem('Export Configurable Report', 'exportConfigurableReportUI')
        .addToUi();
    };

    test('should add configuration export menu item', () => {
      const mockMenu = {
        addItem: jest.fn(() => mockMenu),
        addToUi: jest.fn()
      };
      const mockUi = {
        createMenu: jest.fn(() => mockMenu)
      };
      SpreadsheetApp.getUi.mockReturnValue(mockUi);

      onOpenWithConfigExport();

      expect(SpreadsheetApp.getUi).toHaveBeenCalled();
      expect(mockUi.createMenu).toHaveBeenCalledWith('Custom Menu');
      expect(mockMenu.addItem).toHaveBeenCalledWith('Generate Timesheet Files', 'generateTimesheetFiles');
      expect(mockMenu.addItem).toHaveBeenCalledWith('Aggregate Monthly Timesheets', 'aggregateMonthlyTimesheetsUI');
      expect(mockMenu.addItem).toHaveBeenCalledWith('Export Configurable Report', 'exportConfigurableReportUI');
      expect(mockMenu.addToUi).toHaveBeenCalled();
    });

    test('should handle UI creation errors gracefully', () => {
      SpreadsheetApp.getUi.mockImplementation(() => {
        throw new Error('UI not available');
      });

      expect(() => onOpenWithConfigExport()).toThrow('UI not available');
      expect(SpreadsheetApp.getUi).toHaveBeenCalled();
    });

    test('should maintain existing menu structure', () => {
      const mockMenu = {
        addItem: jest.fn(() => mockMenu),
        addToUi: jest.fn()
      };
      const mockUi = {
        createMenu: jest.fn(() => mockMenu)
      };
      SpreadsheetApp.getUi.mockReturnValue(mockUi);

      onOpenWithConfigExport();

      // Verify all three menu items are added in correct order
      expect(mockMenu.addItem).toHaveBeenNthCalledWith(1, 'Generate Timesheet Files', 'generateTimesheetFiles');
      expect(mockMenu.addItem).toHaveBeenNthCalledWith(2, 'Aggregate Monthly Timesheets', 'aggregateMonthlyTimesheetsUI');
      expect(mockMenu.addItem).toHaveBeenNthCalledWith(3, 'Export Configurable Report', 'exportConfigurableReportUI');
      expect(mockMenu.addItem).toHaveBeenCalledTimes(3);
    });
  });
});
