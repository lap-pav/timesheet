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
  setupMasterTemplate(time);
  const folder = createTimesheetFolder(time);
  members.forEach(function(member) {
    createTimesheetFile(folder, member, time);
  });
  SpreadsheetApp.getUi().alert(`Timesheet files generated in folder: ${folder.getName()}`);
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
        `Error loading configurations:\n\n${configResult.errors.join('\n• ')}`,
        ui.ButtonSet.OK
      );
      return;
    }
    
    // Filter active configurations (In-active checkbox unchecked means active/enabled)
    const enabledConfigs = configResult.configurations.filter(function(config) {
      return config.enabled === true;
    });
    
    if (enabledConfigs.length === 0) {
      ui.alert(
        'No Configurations',
        'No active report configurations found. Please ensure at least one configuration has the In-active checkbox unchecked in the "Report Config" sheet.',
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
        `Failed to generate report:\n\n• ${reportResult.errors.join('\n• ')}`,
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
        `Failed to export report:\n\n• ${exportResult.errors.join('\n• ')}`,
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

