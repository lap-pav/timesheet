// ============================================================================
// TIMESHEET APPLICATION MAIN UI FUNCTIONS
// ============================================================================

/**
 * Initialize the application menu when the spreadsheet is opened
 */
function onOpen() {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('Custom Menu')
      .addItem('Generate Timesheet Files', 'generateTimesheetFiles')
      .addItem('Aggregate Monthly Timesheets', 'aggregateMonthlyTimesheetsUI')
      .addSeparator()
      .addItem('Create a New Report', 'generateReportFromNaturalLanguage')
      .addItem('Report', 'exportConfigurableReportUI')
      .addToUi();
}

// ============================================================================
// TIMESHEET GENERATION UI FUNCTIONS
// ============================================================================

/**
 * UI function to generate timesheet files for all active members
 */
function generateTimesheetFiles() {
  const time = readTime();
  const members = readMembers();
  console.log(`Time: ${time}`, `Members: `, members);
  const folder = createTimesheetFolder(time);
  members.forEach(function(member) {
    createTimesheetFile(folder, member, time);
  });
  SpreadsheetApp.getUi().alert(`Timesheet files generated in folder: ${folder.getName()}`);
}

// ============================================================================
// TIMESHEET AGGREGATION UI FUNCTIONS
// ============================================================================

/**
 * UI function to aggregate monthly timesheets with user confirmation and progress feedback
 */
function aggregateMonthlyTimesheetsUI() {
  try {
    // Get the current time from the spreadsheet (same as generateTimesheetFiles)
    const time = readTime();
    
    // Confirm with user before proceeding
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'Aggregate Monthly Timesheets',
      `This will aggregate all timesheet files for ${time}. This operation may take several minutes for large datasets. Continue?`,
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      return;
    }
    
    // Show processing message
    ui.alert('Processing...', 'Aggregating monthly timesheets. Please wait...', ui.ButtonSet.OK);
    
    // Call the main aggregation function
    const result = aggregateMonthlyTimesheets(time);
    
    // Show results to user
    const summary = `
Aggregation completed for ${time}:
• Total files processed: ${result.metadata.successfulFiles}/${result.metadata.totalFiles}
• Total entries: ${result.metadata.totalEntries}
• Processing time: ${Math.round(result.metadata.processingTimeMs / 1000)}s
• Errors: ${result.errors ? result.errors.length : 0}
• System healthy: ${result.metadata.systemHealthy ? 'Yes' : 'No'}
    `.trim();
    
    ui.alert('Aggregation Complete', summary, ui.ButtonSet.OK);
    
    // Log detailed results to console for debugging
    console.log('Aggregation result:', result);
    
  } catch (error) {
    // Handle any errors gracefully
    console.error('Error in aggregateMonthlyTimesheetsUI:', error);
    SpreadsheetApp.getUi().alert(
      'Aggregation Error', 
      `An error occurred during aggregation: ${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

// ============================================================================
// CONFIGURABLE REPORT EXPORT UI FUNCTIONS
// ============================================================================

/**
 * Enhanced UI function to export configurable reports with expression support
 * Shows configuration selection and handles the export process
 */
function exportConfigurableReportUI() {
  try {
    Logger.log('Starting exportConfigurableReportUI');
    const ui = SpreadsheetApp.getUi();
    
    // Get available configurations
    ui.alert('Initializing...', 'Loading report configurations...', ui.ButtonSet.OK);
    const configResult = readReportConfigurations();
    
    if (!configResult.success) {
      ui.alert(
        'Configuration Error',
        `Error loading configurations: ${configResult.errors.join(' ')}`,
        ui.ButtonSet.OK
      );
      return;
    }
    
    // Filter enabled configurations
    const enabledConfigs = configResult.configurations.filter(function(config) {
      return config.enabled === true;
    });
    
    if (enabledConfigs.length === 0) {
      ui.alert(
        'No Configurations',
        'No enabled report configurations found. Please enable at least one configuration in the "Report Config" sheet.',
        ui.ButtonSet.OK
      );
      return;
    }
    
    // Show enhanced configuration selection dialog
    const selectedConfig = selectReportConfigurationUI(enabledConfigs);
    if (!selectedConfig) {
      Logger.log('Report export cancelled by user');
      return; // User cancelled
    }
    
    Logger.log(`Processing configuration: ${selectedConfig.reportName}`);
    
    // Ensure backward compatibility and migration
    const migratedConfig = ensureBackwardCompatibility(selectedConfig);
  
    
    // Progress tracking for data aggregation
    ui.alert('Processing...', 'Gathering timesheet data for report generation...', ui.ButtonSet.OK);
    const startTime = new Date().getTime();
    
    // Get time period and aggregated data
    const time = readTime();
    const aggregatedData = aggregateMonthlyTimesheets(time);
    
    // Validate aggregated data
    if (!aggregatedData || !Array.isArray(aggregatedData.entries) || aggregatedData.entries.length === 0) {
      ui.alert(
        'No Data Available',
        'No timesheet data was found to generate the report. Please ensure there are timesheet files in the correct format and try again.',
        ui.ButtonSet.OK
      );
      return;
    }
    
    // Check if aggregation took more than 30 seconds
    const aggregationTime = new Date().getTime() - startTime;
    if (aggregationTime > 30000) {
      ui.alert(
        'Progress Update',
        `Data aggregation completed in ${Math.round(aggregationTime / 1000)} seconds. Now generating report...`,
        ui.ButtonSet.OK
      );
    }
    
    // Generate report with enhanced configuration
    const reportStartTime = new Date().getTime();
    const configType = migratedConfig.columnDefinitions ? 'expression-based' : 'legacy';
    ui.alert('Generating Report...', `Creating "${migratedConfig.reportName}" report (${configType}) with specified filters and formatting...`, ui.ButtonSet.OK);
    
    const reportResult = generateConfigurableReport(aggregatedData.entries, migratedConfig);
    
    if (!reportResult.success) {
      ui.alert(
        'Report Generation Error',
        `Failed to generate report: ${reportResult.errors.join(', ')}`,
        ui.ButtonSet.OK
      );
      return;
    }
    
    // Check report generation time
    const reportTime = new Date().getTime() - reportStartTime;
    if (reportTime > 30000) {
      ui.alert(
        'Progress Update',
        `Report generation completed in ${Math.round(reportTime / 1000)} seconds. Now exporting to Google Sheets...`,
        ui.ButtonSet.OK
      );
    }
    
    // Determine output structure for export
    const outputStructure = migratedConfig.outputStructure !== 'SINGLE_SHEET' ? {
      outputType: migratedConfig.outputStructure,
      groupingField: migratedConfig.groupingField
    } : null;
    
    // Export to Google Sheets with enhanced output structure support
    const exportStartTime = new Date().getTime();
    const exportMessage = outputStructure ? 
      `Creating "${migratedConfig.reportName}" with ${migratedConfig.outputStructure} structure...` :
      `Creating Google Sheets file for "${migratedConfig.reportName}" with ${reportResult.reportData.length} records...`;
    ui.alert('Exporting...', exportMessage, ui.ButtonSet.OK);
    
    const exportResult = exportReportToGoogleSheets(reportResult.reportData, reportResult.metadata, 'new_file', outputStructure);
    
    // Check export time
    const exportTime = new Date().getTime() - exportStartTime;
    const totalTime = new Date().getTime() - startTime;
    
    if (exportResult.success) {
      let successMessage = `Report exported successfully!\n\n`;
      successMessage += `Report: ${selectedConfig.reportName}\n`;
      successMessage += `Records: ${reportResult.reportData.length}\n`;
      successMessage += `File: ${exportResult.fileName}\n`;
      
      // Add timing information for operations > 30 seconds
      if (totalTime > 30000) {
        successMessage += `\nTotal processing time: ${Math.round(totalTime / 1000)} seconds`;
        if (aggregationTime > 10000) successMessage += `\n• Data aggregation: ${Math.round(aggregationTime / 1000)}s`;
        if (reportTime > 10000) successMessage += `\n• Report generation: ${Math.round(reportTime / 1000)}s`;
        if (exportTime > 10000) successMessage += `\n• Export to Sheets: ${Math.round(exportTime / 1000)}s`;
      }
      
      ui.alert('Export Complete', successMessage, ui.ButtonSet.OK);
    } else {
      ui.alert(
        'Export Error',
        `Failed to export report: ${exportResult.errors.join(', ')}`,
        ui.ButtonSet.OK
      );
    }
    
  } catch (error) {
    Logger.log('Error in exportConfigurableReportUI: ' + error.message);
    SpreadsheetApp.getUi().alert(
      'System Error',
      `An unexpected error occurred: ${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * UI function to select a report configuration from available options
 * @param {Array} configurations - Array of available configurations
 * @returns {Object|null} Selected configuration object or null if cancelled
 */
function selectReportConfigurationUI(configurations) {
  try {
    if (!configurations || configurations.length === 0) {
      return null;
    }
    
    // If only one configuration, use it directly
    if (configurations.length === 1) {
      const config = configurations[0];
      const ui = SpreadsheetApp.getUi();
      const response = ui.alert(
        'Confirm Configuration',
        `Use report configuration "${config.reportName}"?\n\nDescription: ${config.description}\nColumns: ${config.columns.join(', ')}`,
        SpreadsheetApp.getUi().ButtonSet.YES_NO
      );
      
      return response === ui.Button.YES ? config : null;
    }
    
    // Multiple configurations - show selection dialog
    const ui = SpreadsheetApp.getUi();
    
    // Build configuration list for display
    const configOptions = [];
    for (let i = 0; i < configurations.length; i++) {
      const config = configurations[i];
      configOptions.push(`${i + 1}. ${config.reportName} - ${config.description}`);
    }
    
    const prompt = 'Select a report configuration:\n\n' + configOptions.join('\n') + '\n\nEnter the number (1-' + configurations.length + '):';
    
    const response = ui.prompt('Select Report Configuration', prompt, ui.ButtonSet.OK_CANCEL);
    
    if (response.getSelectedButton() !== ui.Button.OK) {
      return null; // User cancelled
    }
    
    const selectedIndex = parseInt(response.getResponseText());
    
    if (isNaN(selectedIndex) || selectedIndex < 1 || selectedIndex > configurations.length) {
      ui.alert('Invalid Selection', 'Please enter a valid number between 1 and ' + configurations.length, ui.ButtonSet.OK);
      return selectReportConfigurationUI(configurations); // Recursive retry
    }
    
    return configurations[selectedIndex - 1];
    
  } catch (error) {
    Logger.log('Error in selectReportConfigurationUI: ' + error.message);
    SpreadsheetApp.getUi().alert(
      'Selection Error',
      `Error selecting configuration: ${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return null;
  }
}

// ============================================================================
// SHARED UTILITY FUNCTIONS
// ============================================================================

/**
 * Read the time period (YYYY-MM format) from the main sheet
 * @returns {string} Time period in YYYY-MM format
 */
function readTime() {
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MAIN_SHEET_NAME);
  const year = mainSheet.getRange("B1").getValue();
  const month = mainSheet.getRange("B2").getValue();
  const paddedMonth = month.toString().padStart(2, '0');
  return `${year}-${paddedMonth}`;
}

/**
 * Read active members from the Members sheet
 * @returns {Array} Array of member data arrays
 */
function readMembers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MEMBER_SHEET_NAME);
  var data = sheet.getDataRange().getDisplayValues();
  // filter data with In-active = false, find column index of In-active
  data.shift(); // remove header row
  data = data.filter(function(row) { return !row[MEMBER_COLUMNS.IN_ACTIVE]; });

  return data;
}

// ============================================================================
// AI REPORT GENERATION UI ENTRY POINTS
// ============================================================================

/**
 * Main entry point for AI-powered report generation
 * Called from Google Sheets menu
 */
function generateReportFromNaturalLanguage() {
  try {
    logAIInfo('Starting natural language report generation from UI');
    
    const ui = SpreadsheetApp.getUi();
    
    // Check if AI credentials are set up
    if (!checkAICredentials()) {
      const response = ui.alert(
        'AI Setup Required',
        'AI credentials are not configured. Would you like to set them up now?',
        ui.ButtonSet.YES_NO
      );
      
      if (response === ui.Button.YES) {
        ui.alert('Manual Setup Required', 'Please ask your administrator to set up AI credentials in the Apps Script Properties Service.', ui.ButtonSet.OK);
        return;
      } else {
        ui.alert('Setup Required', 'AI credentials are required to generate reports. Please set them up through the menu.', ui.ButtonSet.OK);
        return;
      }
    }
    
    // Get user input for report requirements
    const promptResponse = ui.prompt(
      'Generate a New Report',
      'Describe the report you want to generate. For example:\n' +
      '• "Show me weekly hours by project for September"\n' +
      '• "Create a report showing employee overtime hours"\n' +
      '• "Generate time tracking summary by department"\n\n' +
      'What would you like to see in your report?',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (promptResponse.getSelectedButton() !== ui.Button.OK) {
      logAIInfo('User cancelled report generation');
      return;
    }
    
    const userInput = promptResponse.getResponseText().trim();
    if (!userInput) {
      ui.alert('Input Required', 'Please describe what kind of report you want to generate.', ui.ButtonSet.OK);
      return;
    }
    
    logAIInfo('Processing user request: ' + userInput);
    
    // Show processing message
    ui.alert('Processing Request', 'Analyzing your request and generating configuration. This may take a moment...', ui.ButtonSet.OK);
    
    // Process the natural language request
    const result = processNaturalLanguageRequest(userInput);
    
    if (!result.success) {
      logAIInfo('Failed to process request: ' + result.error);
      ui.alert(
        'Processing Error',
        'Sorry, I couldn\'t understand your request. Please try rephrasing it or check the error details:\n\n' + 
        result.error,
        ui.ButtonSet.OK
      );
      return;
    }
    
    logAIInfo('Successfully generated configuration: ' + result.data.name);
    
    // Show success message with configuration details
    showAIReportSuccessDialog(result.data, { fromCache: result.fromCache });
    
  } catch (error) {
    console.error('Error in generateReportFromNaturalLanguage:', error);
    logAIInfo('Error in UI function: ' + error.message);
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      'System Error',
      'An unexpected error occurred while generating your report. Please try again or contact support.\n\nError: ' + error.message,
      ui.ButtonSet.OK
    );
  }
}



/**
 * Show success dialog after AI report generation
 * @param {Object} configuration - Generated configuration
 * @param {Object} metadata - Generation metadata
 */
function showAIReportSuccessDialog(configuration, metadata) {
  try {
    const ui = SpreadsheetApp.getUi();
    
    let message = `Successfully generated report configuration!\n\n`;
    message += `Report Name: ${configuration.name}\n`;
    message += `Description: ${configuration.description}\n`;
    message += `Fields: ${configuration.fields ? configuration.fields.length : 0} columns\n`;
    message += `Output Structure: ${configuration.output_structure}\n`;
    
    if (metadata && metadata.fromCache) {
      message += `\nSource: Cached result\n`;
    }
    
    message += `\nThe configuration has been saved and is ready to use.`;
    
    ui.alert('AI Report Generated', message, ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('Error showing success dialog:', error);
    // Don't throw error here as the main operation succeeded
  }
}

// ============================================================================
// ENHANCED CONFIGURATION UI FUNCTIONS
// ============================================================================

/**
 * Show advanced configuration dialog for output structure options
 * @returns {Object} Advanced configuration options
 */
function showAdvancedConfigurationDialog() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    const promptMessage = `Advanced Configuration Options

Choose output structure and settings:

Output Structure Options:
1. SINGLE_SHEET - All data in one sheet (default)
2. SHEET_PER_PROJECT - Separate sheet for each project
3. SHEET_PER_EMPLOYEE - Separate sheet for each employee  
4. FILE_PER_PROJECT - Separate file for each project
5. FILE_PER_EMPLOYEE - Separate file for each employee

Enter your preferences (comma-separated):
Structure,GroupingField,CustomFilename,IncludeTimestamp

Example: SHEET_PER_PROJECT,Project Name,Custom_Report,true

Or press Cancel for defaults.`;

    const response = ui.prompt('Advanced Configuration', promptMessage, ui.ButtonSet.OK_CANCEL);
    
    // Default configuration
    const defaults = {
      outputStructure: 'SINGLE_SHEET',
      groupingField: '',
      customFilename: '',
      includeTimestamp: true
    };
    
    if (response.getSelectedButton() !== ui.Button.OK) {
      return defaults;
    }
    
    const userInput = response.getResponseText().trim();
    if (!userInput) {
      return defaults;
    }
    
    // Parse user input
    const parts = userInput.split(',').map(function(part) {
      return part.trim();
    });
    
    const config = {
      outputStructure: parts[0] || defaults.outputStructure,
      groupingField: parts[1] || defaults.groupingField,
      customFilename: parts[2] || defaults.customFilename,
      includeTimestamp: parts[3] ? parts[3].toLowerCase() === 'true' : defaults.includeTimestamp
    };
    
    return config;
    
  } catch (error) {
    console.error('Error in showAdvancedConfigurationDialog:', error);
    // Return defaults on error
    return {
      outputStructure: 'SINGLE_SHEET',
      groupingField: '',
      customFilename: '',
      includeTimestamp: true
    };
  }
}
