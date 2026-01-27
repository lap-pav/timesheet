/**
 * Contract tests for enhanced UI functions
 * Tests the user interface functions for configuration export
 * Tests focus on UI-related behavior per constitutional requirements
 */

const { exportConfigurableReportUI, showAdvancedConfigurationDialog } = require('../../script/main.js');
const mocks = require('./mocks');

// Setup Google Apps Script mocks
global.SpreadsheetApp = mocks.SpreadsheetApp;
global.DriveApp = mocks.DriveApp;
global.Logger = mocks.Logger;
global.console = mocks.console;
global.UI = mocks.UI;
global.Utilities = mocks.Utilities;
global.Session = mocks.Session;

describe('Enhanced UI Functions Contract Tests', () => {
  beforeEach(() => {
    mocks.resetMocks();
  });

  describe('exportConfigurableReportUI', () => {
    test('should display configuration selection dialog', () => {
      // Mock configuration data in spreadsheet
      mocks.mockSpreadsheetData([
        ['Report Name', 'Description', 'Columns', 'Filters', 'Sort By', 'Sort Order', 'Summary Type', 'Enabled', 'Output Structure', 'Grouping Field'],
        ['Project Hours', 'Hours by project', 'Project Name,calculateHours(Time In,Time Out)', '', 'Project Name', 'ASC', 'NONE', 'TRUE', 'SINGLE_SHEET', ''],
        ['Employee Summary', 'Summary by employee', 'Member Name,formatDate(Date)', 'Member Name=John', 'Date', 'DESC', 'SUM', 'TRUE', 'SHEET_PER_EMPLOYEE', 'Member Name'],
        ['Daily Report', 'Daily breakdown', 'Date,Member Name,Hours', '', 'Date', 'ASC', 'NONE', 'FALSE', 'SINGLE_SHEET', '']
      ]);

      // Execute function
      exportConfigurableReportUI();

      // Verify UI interactions
      expect(global.SpreadsheetApp.getUi().prompt).toHaveBeenCalled();
      const promptCall = global.SpreadsheetApp.getUi().prompt.mock.calls[0];
      expect(promptCall[0]).toContain('Select Report Configuration');
      expect(promptCall[1]).toContain('Project Hours');
      expect(promptCall[1]).toContain('Employee Summary');
      expect(promptCall[1]).not.toContain('Daily Report'); // Disabled report should not appear
    });

    test('should handle no enabled configurations', () => {
      // Mock spreadsheet with no enabled configurations
      mocks.mockSpreadsheetData([
        ['Report Name', 'Description', 'Columns', 'Filters', 'Sort By', 'Sort Order', 'Summary Type', 'Enabled', 'Output Structure', 'Grouping Field'],
        ['Disabled Report', 'Test', 'Member Name,Hours', '', 'Member Name', 'ASC', 'NONE', 'FALSE', 'SINGLE_SHEET', '']
      ]);

      // Execute function
      exportConfigurableReportUI();

      // Verify alert shown for no configurations
      expect(global.SpreadsheetApp.getUi().alert).toHaveBeenCalled();
      const alertCall = global.SpreadsheetApp.getUi().alert.mock.calls[0];
      expect(alertCall[0]).toContain('No Configurations');
      expect(alertCall[1]).toContain('No enabled report configurations found');
    });

    test('should handle user cancellation', () => {
      // Mock configuration data
      mocks.mockSpreadsheetData([
        ['Report Name', 'Description', 'Columns', 'Filters', 'Sort By', 'Sort Order', 'Summary Type', 'Enabled', 'Output Structure', 'Grouping Field'],
        ['Test Report', 'Test', 'Member Name,Hours', '', 'Member Name', 'ASC', 'NONE', 'TRUE', 'SINGLE_SHEET', '']
      ]);

      // Mock user cancellation
      global.SpreadsheetApp.getUi().prompt.mockReturnValue({
        getSelectedButton: jest.fn(() => global.UI.ButtonSet.CANCEL),
        getResponseText: jest.fn(() => '')
      });

      // Execute function
      const result = exportConfigurableReportUI();

      // Verify function returns without error
      expect(result).toBeUndefined();
      expect(global.Logger.log).toHaveBeenCalledWith('Report export cancelled by user');
    });

    test('should validate selected configuration index', () => {
      // Mock configuration data
      mocks.mockSpreadsheetData([
        ['Report Name', 'Description', 'Columns', 'Filters', 'Sort By', 'Sort Order', 'Summary Type', 'Enabled', 'Output Structure', 'Grouping Field'],
        ['Test Report', 'Test', 'Member Name,Hours', '', 'Member Name', 'ASC', 'NONE', 'TRUE', 'SINGLE_SHEET', '']
      ]);

      // Mock invalid selection
      global.SpreadsheetApp.getUi().prompt.mockReturnValue({
        getSelectedButton: jest.fn(() => global.UI.ButtonSet.OK),
        getResponseText: jest.fn(() => '99') // Invalid index
      });

      // Execute function
      exportConfigurableReportUI();

      // Verify error handling
      expect(global.SpreadsheetApp.getUi().alert).toHaveBeenCalled();
      const alertCall = global.SpreadsheetApp.getUi().alert.mock.calls[0];
      expect(alertCall[0]).toContain('Invalid Selection');
      expect(alertCall[1]).toContain('Please select a valid configuration number');
    });

    test('should process expression-based columns', () => {
      // Mock configuration with expressions
      mocks.mockSpreadsheetData([
        ['Report Name', 'Description', 'Columns', 'Filters', 'Sort By', 'Sort Order', 'Summary Type', 'Enabled', 'Output Structure', 'Grouping Field'],
        ['Expression Test', 'Test expressions', 'Member Name,calculateHours(Time In,Time Out),formatDate(Date)', '', 'Member Name', 'ASC', 'NONE', 'TRUE', 'SINGLE_SHEET', '']
      ]);

      // Mock valid selection
      global.SpreadsheetApp.getUi().prompt.mockReturnValue({
        getSelectedButton: jest.fn(() => global.UI.ButtonSet.OK),
        getResponseText: jest.fn(() => '1')
      });

      // Execute function
      exportConfigurableReportUI();

      // Verify column processing (this will call internal functions)
      expect(global.Logger.log).toHaveBeenCalledWith('Processing configuration: Expression Test');
    });
  });

  describe('showAdvancedConfigurationDialog', () => {
    test('should display advanced options dialog', () => {
      // Execute function
      const result = showAdvancedConfigurationDialog();

      // Verify UI dialog shown
      expect(global.SpreadsheetApp.getUi().prompt).toHaveBeenCalled();
      const promptCall = global.SpreadsheetApp.getUi().prompt.mock.calls[0];
      expect(promptCall[0]).toContain('Advanced Configuration');
      expect(promptCall[1]).toContain('Output Structure');
      expect(promptCall[1]).toContain('SINGLE_SHEET');
      expect(promptCall[1]).toContain('SHEET_PER_PROJECT');
      expect(promptCall[1]).toContain('SHEET_PER_EMPLOYEE');
    });

    test('should return default configuration on cancel', () => {
      // Mock user cancellation
      global.SpreadsheetApp.getUi().prompt.mockReturnValue({
        getSelectedButton: jest.fn(() => global.UI.ButtonSet.CANCEL),
        getResponseText: jest.fn(() => '')
      });

      // Execute function
      const result = showAdvancedConfigurationDialog();

      // Verify default configuration returned
      expect(result).toEqual({
        outputStructure: 'SINGLE_SHEET',
        groupingField: '',
        customFilename: '',
        includeTimestamp: true
      });
    });

    test('should parse user configuration input', () => {
      // Mock user input
      global.SpreadsheetApp.getUi().prompt.mockReturnValue({
        getSelectedButton: jest.fn(() => global.UI.ButtonSet.OK),
        getResponseText: jest.fn(() => 'SHEET_PER_PROJECT,Project Name,Custom_Report,false')
      });

      // Execute function
      const result = showAdvancedConfigurationDialog();

      // Verify parsed configuration
      expect(result).toEqual({
        outputStructure: 'SHEET_PER_PROJECT',
        groupingField: 'Project Name',
        customFilename: 'Custom_Report',
        includeTimestamp: false
      });
    });

    test('should handle malformed input gracefully', () => {
      // Mock malformed input
      global.SpreadsheetApp.getUi().prompt.mockReturnValue({
        getSelectedButton: jest.fn(() => global.UI.ButtonSet.OK),
        getResponseText: jest.fn(() => 'invalid,input')
      });

      // Execute function
      const result = showAdvancedConfigurationDialog();

      // Verify default values used for missing parts
      expect(result.outputStructure).toBe('invalid'); // First part used even if invalid
      expect(result.groupingField).toBe('input'); // Second part used
      expect(result.customFilename).toBe(''); // Default for missing third part
      expect(result.includeTimestamp).toBe(true); // Default for missing fourth part
    });

    test('should validate output structure options', () => {
      // Mock valid output structure
      global.SpreadsheetApp.getUi().prompt.mockReturnValue({
        getSelectedButton: jest.fn(() => global.UI.ButtonSet.OK),
        getResponseText: jest.fn(() => 'FILE_PER_PROJECT,Project Name,Report,true')
      });

      // Execute function
      const result = showAdvancedConfigurationDialog();

      // Verify configuration accepted
      expect(result.outputStructure).toBe('FILE_PER_PROJECT');
      expect(result.groupingField).toBe('Project Name');
      expect(result.customFilename).toBe('Report');
      expect(result.includeTimestamp).toBe(true);
    });
  });

  describe('UI Error Handling', () => {
    test('should handle SpreadsheetApp errors gracefully', () => {
      // Mock SpreadsheetApp error
      global.SpreadsheetApp.getActiveSpreadsheet.mockImplementation(() => {
        throw new Error('Spreadsheet access error');
      });

      // Execute function
      expect(() => exportConfigurableReportUI()).not.toThrow();

      // Verify error logging
      expect(global.Logger.log).toHaveBeenCalledWith('Error in exportConfigurableReportUI: Spreadsheet access error');
    });

    test('should handle missing configuration sheet', () => {
      // Mock missing sheet
      global.SpreadsheetApp.getActiveSpreadsheet().getSheetByName.mockImplementation(() => {
        throw new Error('Sheet "Report Config" not found');
      });

      // Execute function
      exportConfigurableReportUI();

      // Verify error handling
      expect(global.SpreadsheetApp.getUi().alert).toHaveBeenCalled();
      const alertCall = global.SpreadsheetApp.getUi().alert.mock.calls[0];
      expect(alertCall[0]).toContain('Configuration Error');
      expect(alertCall[1]).toContain('Report Config');
    });
  });
});
