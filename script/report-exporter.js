// ============================================================================
// CONFIGURABLE REPORT EXPORT MODULE
// ============================================================================

/**
 * Read and validate report configurations from the "Report Configs" sheet
 * @returns {Object} Result object with success status, configurations array, and errors
 */
function readReportConfigurations() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let configSheet;
    
    try {
      configSheet = spreadsheet.getSheetByName(REPORT_CONFIG.REPORT_CONFIG_SHEET_NAME);
    } catch (error) {
      const setupMessage = generateSetupAssistanceMessage();
      return {
        success: false,
        configurations: [],
        errors: [
          `Sheet "${REPORT_CONFIG.REPORT_CONFIG_SHEET_NAME}" not found.`,
          '',
          'SETUP REQUIRED:',
          setupMessage
        ]
      };
    }
    
    // Validate sheet structure first
    const structureValidation = validateConfigurationSheetStructure(configSheet);
    if (!structureValidation.isValid) {
      let errorMessages = [...structureValidation.errors];
      if (structureValidation.setupGuidance.length > 0) {
        errorMessages.push('');
        errorMessages.push('SETUP GUIDANCE:');
        errorMessages.push(...structureValidation.setupGuidance);
      }
      if (structureValidation.warnings.length > 0) {
        errorMessages.push('');
        errorMessages.push('WARNINGS:');
        errorMessages.push(...structureValidation.warnings);
      }
      return {
        success: false,
        configurations: [],
        errors: errorMessages
      };
    }
    
    // Get all data from the sheet
    const data = configSheet.getDataRange().getDisplayValues();
    
    if (data.length <= 1) {
      return {
        success: false,
        configurations: [],
        errors: [
          'Configuration sheet is empty. Please add at least one configuration row.',
          '',
          'QUICK START:',
          'Add a row with these example values:',
          'Weekly Summary | Team member hours summary | Member Name,Total Hours,Date | | Member Name | ASC | NONE | TRUE'
        ]
      };
    }
    
    // Skip header row and process configurations
    const configurations = [];
    const errors = [];
    const reportNames = new Set();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;
      
      // Skip empty rows
      if (!row[REPORT_CONFIG.CONFIG_COLUMNS.REPORT_NAME] || 
          row[REPORT_CONFIG.CONFIG_COLUMNS.REPORT_NAME].trim() === '') {
        continue;
      }
      
      const config = parseConfigurationRow(row, rowNum);
      
      if (config.errors.length > 0) {
        // Generate user-friendly error messages
        config.errors.forEach(error => {
          const userFriendlyError = generateUserFriendlyErrorMessage(
            ERROR_TYPES.CONFIG_VALIDATION_ERROR,
            {
              rowNumber: rowNum,
              details: error,
              value: row[REPORT_CONFIG.CONFIG_COLUMNS.REPORT_NAME]
            }
          );
          errors.push(userFriendlyError);
        });
        continue;
      }
      
      // Check for duplicate report names
      if (reportNames.has(config.data.reportName)) {
        const duplicateError = generateUserFriendlyErrorMessage(
          ERROR_TYPES.CONFIG_VALIDATION_ERROR,
          {
            rowNumber: rowNum,
            fieldName: 'reportName',
            details: `Duplicate report name "${config.data.reportName}". Each report must have a unique name.`,
            value: config.data.reportName
          }
        );
        errors.push(duplicateError);
        continue;
      }
      
      // Only include enabled configurations
      if (config.data.enabled) {
        configurations.push(config.data);
        reportNames.add(config.data.reportName);
      }
    }
    
    if (errors.length > 0) {
      // Add helpful guidance for common errors
      const guidanceMessages = [
        '',
        'COMMON FIXES:',
        '• Check that all required fields are filled in',
        '• Ensure column names match available options exactly',
        '• Verify that Sort By column exists in your Columns list',
        '• Use exact values: ASC/DESC for Sort Order, TRUE/FALSE for Enabled',
        '',
        'Need examples? Check the setup guidance above.'
      ];
      
      return {
        success: false,
        configurations: [],
        errors: [...errors, ...guidanceMessages]
      };
    }
    
    if (configurations.length === 0) {
      return {
        success: false,
        configurations: [],
        errors: [
          'No enabled configurations found.',
          '',
          'SOLUTION:',
          '• Check that at least one configuration has Enabled = TRUE',
          '• Verify your configurations pass all validation rules',
          '• Review the setup guidance above for help'
        ]
      };
    }
    
    return {
      success: true,
      configurations: configurations,
      errors: []
    };
    
  } catch (error) {
    Logger.log('Error reading report configurations: ' + error.message);
    return {
      success: false,
      configurations: [],
      errors: [
        'System error reading configurations. Please try again.',
        '',
        'TECHNICAL DETAILS:',
        error.message,
        '',
        'If this persists, check that:',
        '• The spreadsheet is accessible',
        '• You have edit permissions',
        '• The sheet structure is correct'
      ]
    };
  }
}

/**
 * Parse a single configuration row and validate its data
 * @param {Array} row - Row data from the configuration sheet
 * @param {number} rowNum - Row number for error reporting
 * @returns {Object} Parsed configuration data and validation errors
 */
function parseConfigurationRow(row, rowNum) {
  const errors = [];
  const config = {};
  
  // Report Name validation
  const reportName = row[REPORT_CONFIG.CONFIG_COLUMNS.REPORT_NAME] || '';
  if (!reportName.trim()) {
    errors.push('Report Name is required');
  } else if (reportName.length > REPORT_CONFIG.MAX_REPORT_NAME_LENGTH) {
    errors.push(`Report Name exceeds ${REPORT_CONFIG.MAX_REPORT_NAME_LENGTH} character limit`);
  } else {
    config.reportName = reportName.trim();
  }
  
  // Description validation
  const description = row[REPORT_CONFIG.CONFIG_COLUMNS.DESCRIPTION] || '';
  if (!description.trim()) {
    errors.push('Description is required');
  } else if (description.length > REPORT_CONFIG.MAX_DESCRIPTION_LENGTH) {
    errors.push(`Description exceeds ${REPORT_CONFIG.MAX_DESCRIPTION_LENGTH} character limit`);
  } else {
    config.description = description.trim();
  }
  
  // Columns validation
  const columnsText = row[REPORT_CONFIG.CONFIG_COLUMNS.COLUMNS] || '';
  if (!columnsText.trim()) {
    errors.push('Columns are required');
  } else {
    const columns = columnsText.split(',').map(function(col) {
      return col.trim();
    }).filter(function(col) {
      return col.length > 0;
    });
    
    if (columns.length === 0) {
      errors.push('At least one column must be specified');
    } else {
      // Validate column names against available columns
      const validColumns = Object.keys(REPORT_CONFIG.COLUMN_MAPPINGS);
      const invalidColumns = columns.filter(function(col) {
        return validColumns.indexOf(col) === -1;
      });
      
      if (invalidColumns.length > 0) {
        errors.push(`Invalid columns: ${invalidColumns.join(', ')}. Valid columns: ${validColumns.join(', ')}`);
      } else {
        config.columns = columns;
      }
    }
  }
  
  // Filters parsing
  const filtersText = row[REPORT_CONFIG.CONFIG_COLUMNS.FILTERS] || '';
  if (filtersText.trim()) {
    try {
      config.filters = parseFilters(filtersText);
    } catch (filterError) {
      errors.push(`Invalid filter format: ${filterError.message}`);
    }
  } else {
    config.filters = {};
  }
  
  // Sort By validation
  const sortBy = row[REPORT_CONFIG.CONFIG_COLUMNS.SORT_BY] || '';
  if (sortBy.trim() && config.columns) {
    if (config.columns.indexOf(sortBy.trim()) === -1) {
      errors.push(`Sort By column "${sortBy}" must be included in the Columns list`);
    } else {
      config.sortBy = sortBy.trim();
    }
  } else if (sortBy.trim()) {
    config.sortBy = sortBy.trim();
  }
  
  // Sort Order validation
  const sortOrder = row[REPORT_CONFIG.CONFIG_COLUMNS.SORT_ORDER] || '';
  if (sortOrder.trim()) {
    const upperSortOrder = sortOrder.trim().toUpperCase();
    if (REPORT_CONFIG.VALID_SORT_ORDERS.indexOf(upperSortOrder) === -1) {
      errors.push(`Sort Order must be one of: ${REPORT_CONFIG.VALID_SORT_ORDERS.join(', ')}`);
    } else {
      config.sortOrder = upperSortOrder;
    }
  } else {
    config.sortOrder = 'ASC'; // Default
  }
  
  // Summary Type validation
  const summaryType = row[REPORT_CONFIG.CONFIG_COLUMNS.SUMMARY_TYPE] || '';
  if (summaryType.trim()) {
    const upperSummaryType = summaryType.trim().toUpperCase();
    if (REPORT_CONFIG.VALID_SUMMARY_TYPES.indexOf(upperSummaryType) === -1) {
      errors.push(`Summary Type must be one of: ${REPORT_CONFIG.VALID_SUMMARY_TYPES.join(', ')}`);
    } else {
      config.summaryType = upperSummaryType;
    }
  } else {
    config.summaryType = 'NONE'; // Default
  }
  
  // Enabled validation
  const enabledText = row[REPORT_CONFIG.CONFIG_COLUMNS.ENABLED] || '';
  if (enabledText.toString().trim().toUpperCase() === 'TRUE') {
    config.enabled = true;
  } else if (enabledText.toString().trim().toUpperCase() === 'FALSE') {
    config.enabled = false;
  } else {
    errors.push('Enabled must be TRUE or FALSE');
  }
  
  return {
    data: config,
    errors: errors
  };
}

/**
 * Parse filter string into object format
 * @param {string} filtersText - Filter string like "active=true,hours>0"
 * @returns {Object} Parsed filters object
 */
function parseFilters(filtersText) {
  const filters = {};
  const filterPairs = filtersText.split(',');
  
  for (let i = 0; i < filterPairs.length; i++) {
    const pair = filterPairs[i].trim();
    if (!pair) continue;
    
    // Find operator
    let operator = null;
    let operatorIndex = -1;
    
    for (let j = 0; j < REPORT_CONFIG.FILTER_OPERATORS.length; j++) {
      const op = REPORT_CONFIG.FILTER_OPERATORS[j];
      const index = pair.indexOf(op);
      if (index > 0) { // Must not be at the start
        operator = op;
        operatorIndex = index;
        break;
      }
    }
    
    if (!operator) {
      throw new Error(`Invalid filter "${pair}". Expected format: column=value or column>value`);
    }
    
    const key = pair.substring(0, operatorIndex).trim();
    const value = pair.substring(operatorIndex + operator.length).trim();
    
    if (!key || !value) {
      throw new Error(`Invalid filter "${pair}". Both column and value are required`);
    }
    
    // Store with operator
    filters[key] = {
      operator: operator,
      value: value
    };
  }
  
  return filters;
}

/**
 * Generate a configurable report from aggregated timesheet data
 * @param {Array} aggregatedData - Array of aggregated timesheet objects
 * @param {Object} configuration - Report configuration object
 * @returns {Object} Result object with success status, report data, and errors
 */
function generateConfigurableReport(aggregatedData, configuration) {
  try {
    Logger.log(`Starting report generation: ${configuration.reportName}`);
    const startTime = Date.now();
    
    // Validate inputs
    if (!Array.isArray(aggregatedData) || aggregatedData.length === 0) {
      return {
        success: false,
        reportData: [],
        metadata: {},
        errors: ['No data provided for report generation']
      };
    }
    
    if (!configuration || !configuration.columns || configuration.columns.length === 0) {
      return {
        success: false,
        reportData: [],
        metadata: {},
        errors: ['Invalid configuration or no columns specified']
      };
    }
    
    let processedData = [...aggregatedData]; // Copy to avoid modifying original
    const processingSteps = [];
    
    // Step 1: Apply filters
    if (configuration.filters && Object.keys(configuration.filters).length > 0) {
      const filterStartTime = Date.now();
      processedData = applyFilters(processedData, configuration.filters);
      processingSteps.push({
        step: 'filtering',
        timeMs: Date.now() - filterStartTime,
        recordsAfter: processedData.length
      });
      Logger.log(`Applied filters: ${processedData.length} records remaining`);
    }
    
    // Step 2: Transform data columns
    const transformStartTime = Date.now();
    processedData = transformDataColumns(processedData, configuration.columns);
    processingSteps.push({
      step: 'column_transformation',
      timeMs: Date.now() - transformStartTime,
      recordsAfter: processedData.length
    });
    Logger.log(`Transformed columns: ${configuration.columns.length} columns selected`);
    
    // Step 3: Apply sorting
    if (configuration.sortBy) {
      const sortStartTime = Date.now();
      processedData = applySorting(processedData, configuration.sortBy, configuration.sortOrder || 'ASC');
      processingSteps.push({
        step: 'sorting',
        timeMs: Date.now() - sortStartTime,
        recordsAfter: processedData.length
      });
      Logger.log(`Applied sorting by: ${configuration.sortBy} ${configuration.sortOrder}`);
    }
    
    // Step 4: Apply aggregation/summary
    if (configuration.summaryType && configuration.summaryType !== 'NONE') {
      const summaryStartTime = Date.now();
      processedData = applySummary(processedData, configuration.summaryType, configuration.columns);
      processingSteps.push({
        step: 'summarization',
        timeMs: Date.now() - summaryStartTime,
        recordsAfter: processedData.length
      });
      Logger.log(`Applied summary: ${configuration.summaryType}`);
    }
    
    const totalProcessingTime = Date.now() - startTime;
    
    Logger.log(`Report generation completed in ${totalProcessingTime}ms: ${processedData.length} records`);
    
    return {
      success: true,
      reportData: processedData,
      metadata: {
        reportName: configuration.reportName,
        description: configuration.description,
        generatedAt: new Date().toISOString(),
        recordCount: processedData.length,
        processingTimeMs: totalProcessingTime,
        processingSteps: processingSteps,
        configuration: configuration
      },
      errors: []
    };
    
  } catch (error) {
    Logger.log('Error generating configurable report: ' + error.message);
    return {
      success: false,
      reportData: [],
      metadata: {},
      errors: [`Report generation failed: ${error.message}`]
    };
  }
}

/**
 * Apply filters to the data
 * @param {Array} data - Data to filter
 * @param {Object} filters - Filter configuration
 * @returns {Array} Filtered data
 */
function applyFilters(data, filters) {
  return data.filter(function(record) {
    for (const [filterColumn, filterConfig] of Object.entries(filters)) {
      const recordValue = record[REPORT_CONFIG.COLUMN_MAPPINGS[filterColumn]] || record[filterColumn];
      
      if (!applyFilterCondition(recordValue, filterConfig.operator, filterConfig.value)) {
        return false; // Record doesn't match this filter
      }
    }
    return true; // Record matches all filters
  });
}

/**
 * Apply a single filter condition
 * @param {*} recordValue - Value from the record
 * @param {string} operator - Filter operator
 * @param {string} filterValue - Filter value
 * @returns {boolean} Whether the condition is met
 */
function applyFilterCondition(recordValue, operator, filterValue) {
  const recordStr = String(recordValue || '').toLowerCase().trim();
  const filterStr = String(filterValue).toLowerCase().trim();
  
  switch (operator) {
    case '=':
      return recordStr === filterStr;
    case '!=':
      return recordStr !== filterStr;
    case '>':
      const numRecord1 = parseFloat(recordValue);
      const numFilter1 = parseFloat(filterValue);
      return !isNaN(numRecord1) && !isNaN(numFilter1) && numRecord1 > numFilter1;
    case '<':
      const numRecord2 = parseFloat(recordValue);
      const numFilter2 = parseFloat(filterValue);
      return !isNaN(numRecord2) && !isNaN(numFilter2) && numRecord2 < numFilter2;
    case '>=':
      const numRecord3 = parseFloat(recordValue);
      const numFilter3 = parseFloat(filterValue);
      return !isNaN(numRecord3) && !isNaN(numFilter3) && numRecord3 >= numFilter3;
    case '<=':
      const numRecord4 = parseFloat(recordValue);
      const numFilter4 = parseFloat(filterValue);
      return !isNaN(numRecord4) && !isNaN(numFilter4) && numRecord4 <= numFilter4;
    case 'contains':
      return recordStr.includes(filterStr);
    default:
      return true;
  }
}

/**
 * Transform data to include only specified columns
 * @param {Array} data - Original data
 * @param {Array} columns - Columns to include
 * @returns {Array} Transformed data
 */
function transformDataColumns(data, columns) {
  return data.map(function(record) {
    const transformedRecord = {};
    
    columns.forEach(function(column) {
      const mappedField = REPORT_CONFIG.COLUMN_MAPPINGS[column];
      if (mappedField && record[mappedField] !== undefined) {
        transformedRecord[column] = record[mappedField];
      } else if (record[column] !== undefined) {
        transformedRecord[column] = record[column];
      } else {
        transformedRecord[column] = ''; // Default empty value
      }
    });
    
    return transformedRecord;
  });
}

/**
 * Apply sorting to the data
 * @param {Array} data - Data to sort
 * @param {string} sortBy - Column to sort by
 * @param {string} sortOrder - Sort order (ASC/DESC)
 * @returns {Array} Sorted data
 */
function applySorting(data, sortBy, sortOrder) {
  return data.sort(function(a, b) {
    const valueA = a[sortBy] || '';
    const valueB = b[sortBy] || '';
    
    // Try numeric comparison first
    const numA = parseFloat(valueA);
    const numB = parseFloat(valueB);
    
    let comparison = 0;
    
    if (!isNaN(numA) && !isNaN(numB)) {
      // Numeric comparison
      comparison = numA - numB;
    } else {
      // String comparison
      const strA = String(valueA).toLowerCase();
      const strB = String(valueB).toLowerCase();
      comparison = strA.localeCompare(strB);
    }
    
    return sortOrder === 'DESC' ? -comparison : comparison;
  });
}

/**
 * Apply summary/aggregation to the data
 * @param {Array} data - Data to summarize
 * @param {string} summaryType - Type of summary
 * @param {Array} columns - Available columns
 * @returns {Array} Summarized data
 */
function applySummary(data, summaryType, columns) {
  switch (summaryType.toUpperCase()) {
    case 'MEMBER_TOTALS':
      return aggregateByMember(data);
    case 'DAILY_TOTALS':
      return aggregateByDay(data);
    case 'PROJECT_TOTALS':
      return aggregateByProject(data);
    default:
      return data; // No summary
  }
}

/**
 * Aggregate data by team member
 * @param {Array} data - Data to aggregate
 * @returns {Array} Aggregated data
 */
function aggregateByMember(data) {
  const memberTotals = {};
  
  data.forEach(function(record) {
    const memberName = record['Member Name'] || record.member || 'Unknown';
    
    if (!memberTotals[memberName]) {
      memberTotals[memberName] = {
        'Member Name': memberName,
        'Total Hours': 0,
        'Total Entries': 0,
        'Date Range': { start: null, end: null }
      };
    }
    
    // Calculate hours if available
    const hours = calculateHours(record['Start Time'], record['End Time']);
    if (hours > 0) {
      memberTotals[memberName]['Total Hours'] += hours;
    }
    
    memberTotals[memberName]['Total Entries']++;
    
    // Track date range
    const recordDate = record['Date'] || record.date;
    if (recordDate) {
      if (!memberTotals[memberName]['Date Range'].start || recordDate < memberTotals[memberName]['Date Range'].start) {
        memberTotals[memberName]['Date Range'].start = recordDate;
      }
      if (!memberTotals[memberName]['Date Range'].end || recordDate > memberTotals[memberName]['Date Range'].end) {
        memberTotals[memberName]['Date Range'].end = recordDate;
      }
    }
  });
  
  // Convert to array and format
  return Object.values(memberTotals).map(function(member) {
    return {
      'Member Name': member['Member Name'],
      'Total Hours': Math.round(member['Total Hours'] * 100) / 100,
      'Total Entries': member['Total Entries'],
      'Date Range': member['Date Range'].start && member['Date Range'].end 
        ? `${member['Date Range'].start} to ${member['Date Range'].end}`
        : 'N/A'
    };
  });
}

/**
 * Aggregate data by day
 * @param {Array} data - Data to aggregate
 * @returns {Array} Aggregated data
 */
function aggregateByDay(data) {
  const dailyTotals = {};
  
  data.forEach(function(record) {
    const date = record['Date'] || record.date || 'Unknown';
    
    if (!dailyTotals[date]) {
      dailyTotals[date] = {
        'Date': date,
        'Total Hours': 0,
        'Total Entries': 0,
        'Members': new Set()
      };
    }
    
    // Calculate hours if available
    const hours = calculateHours(record['Start Time'], record['End Time']);
    if (hours > 0) {
      dailyTotals[date]['Total Hours'] += hours;
    }
    
    dailyTotals[date]['Total Entries']++;
    
    const memberName = record['Member Name'] || record.member;
    if (memberName) {
      dailyTotals[date]['Members'].add(memberName);
    }
  });
  
  // Convert to array and format
  return Object.values(dailyTotals).map(function(day) {
    return {
      'Date': day['Date'],
      'Total Hours': Math.round(day['Total Hours'] * 100) / 100,
      'Total Entries': day['Total Entries'],
      'Members Count': day['Members'].size,
      'Members': Array.from(day['Members']).join(', ')
    };
  });
}

/**
 * Aggregate data by project
 * @param {Array} data - Data to aggregate
 * @returns {Array} Aggregated data
 */
function aggregateByProject(data) {
  const projectTotals = {};
  
  data.forEach(function(record) {
    const project = record['Project Name'] || record.project || 'Unknown';
    
    if (!projectTotals[project]) {
      projectTotals[project] = {
        'Project Name': project,
        'Total Hours': 0,
        'Total Entries': 0,
        'Members': new Set()
      };
    }
    
    // Calculate hours if available
    const hours = calculateHours(record['Start Time'], record['End Time']);
    if (hours > 0) {
      projectTotals[project]['Total Hours'] += hours;
    }
    
    projectTotals[project]['Total Entries']++;
    
    const memberName = record['Member Name'] || record.member;
    if (memberName) {
      projectTotals[project]['Members'].add(memberName);
    }
  });
  
  // Convert to array and format
  return Object.values(projectTotals).map(function(project) {
    return {
      'Project Name': project['Project Name'],
      'Total Hours': Math.round(project['Total Hours'] * 100) / 100,
      'Total Entries': project['Total Entries'],
      'Members Count': project['Members'].size,
      'Members': Array.from(project['Members']).join(', ')
    };
  });
}

/**
 * Calculate hours between start and end time
 * @param {string} startTime - Start time string
 * @param {string} endTime - End time string
 * @returns {number} Hours difference
 */
function calculateHours(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  
  if (startMinutes === null || endMinutes === null) return 0;
  if (endMinutes <= startMinutes) return 0;
  
  return (endMinutes - startMinutes) / 60;
}

/**
 * Export report data to Google Sheets
 * @param {Array} reportData - Report data to export
 * @param {Object} metadata - Report metadata
 * @param {string} outputLocation - Output location ('new_file' or folder path)
 * @returns {Object} Export result
 */
function exportReportToGoogleSheets(reportData, metadata, outputLocation) {
  try {
    Logger.log(`Starting export to Google Sheets: ${metadata.reportName}`);
    
    if (!Array.isArray(reportData) || reportData.length === 0) {
      return {
        success: false,
        fileName: null,
        fileUrl: null,
        errors: ['No data to export']
      };
    }
    
    // Create new spreadsheet
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `${metadata.reportName}_${timestamp}`;
    
    const newSpreadsheet = SpreadsheetApp.create(fileName);
    const sheet = newSpreadsheet.getActiveSheet();
    
    // Set up headers
    const headers = Object.keys(reportData[0]);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format headers
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#E8F0FE');
    
    // Add data
    const dataRows = reportData.map(function(record) {
      return headers.map(function(header) {
        return record[header] || '';
      });
    });
    
    if (dataRows.length > 0) {
      sheet.getRange(2, 1, dataRows.length, headers.length).setValues(dataRows);
    }
    
    // Auto-resize columns
    headers.forEach(function(header, index) {
      sheet.autoResizeColumn(index + 1);
    });
    
    // Add metadata sheet
    const metadataSheet = newSpreadsheet.insertSheet('Metadata');
    const metadataEntries = [
      ['Report Name', metadata.reportName],
      ['Description', metadata.description],
      ['Generated At', metadata.generatedAt],
      ['Record Count', metadata.recordCount],
      ['Processing Time (ms)', metadata.processingTimeMs]
    ];
    
    metadataSheet.getRange(1, 1, metadataEntries.length, 2).setValues(metadataEntries);
    metadataSheet.getRange(1, 1, metadataEntries.length, 1).setFontWeight('bold');
    
    Logger.log(`Export completed: ${fileName}`);
    
    return {
      success: true,
      fileName: fileName,
      fileUrl: newSpreadsheet.getUrl(),
      fileId: newSpreadsheet.getId(),
      errors: []
    };
    
  } catch (error) {
    Logger.log('Error exporting to Google Sheets: ' + error.message);
    return {
      success: false,
      fileName: null,
      fileUrl: null,
      errors: [`Export failed: ${error.message}`]
    };
  }
}

// ============================================================================
// CONFIGURATION VALIDATION HELPERS
// ============================================================================

/**
 * Validate configuration sheet structure and provide user-friendly setup guidance
 * @param {Object} sheet - Google Sheets sheet object
 * @returns {Object} Validation result with user guidance
 */
function validateConfigurationSheetStructure(sheet) {
  try {
    const errors = [];
    const warnings = [];
    const setupGuidance = [];
    
    // Check if sheet exists
    if (!sheet) {
      return {
        isValid: false,
        errors: ['Configuration sheet not found'],
        warnings: [],
        setupGuidance: [generateSetupAssistanceMessage()]
      };
    }
    
    // Check if sheet has data
    const data = sheet.getDataRange().getDisplayValues();
    if (data.length === 0) {
      return {
        isValid: false,
        errors: ['Configuration sheet is empty'],
        warnings: [],
        setupGuidance: [generateSetupAssistanceMessage()]
      };
    }
    
    // Check header row
    if (data.length === 1) {
      warnings.push('Only header row found. Please add at least one configuration row.');
    }
    
    // Validate expected column count
    const headerRow = data[0];
    const expectedColumns = Object.keys(REPORT_CONFIG.CONFIG_COLUMNS).length;
    
    if (headerRow.length < expectedColumns) {
      errors.push(`Configuration sheet has ${headerRow.length} columns but needs ${expectedColumns} columns.`);
    }
    
    // Check for reasonable header names
    const expectedHeaders = ['Report Name', 'Description', 'Columns', 'Filters', 'Sort By', 'Sort Order', 'Summary Type', 'Enabled'];
    const headerWarnings = [];
    
    for (let i = 0; i < Math.min(expectedHeaders.length, headerRow.length); i++) {
      const actualHeader = String(headerRow[i]).trim();
      const expectedHeader = expectedHeaders[i];
      
      if (actualHeader.toLowerCase() !== expectedHeader.toLowerCase()) {
        headerWarnings.push(`Column ${String.fromCharCode(65 + i)} should be "${expectedHeader}" but found "${actualHeader}"`);
      }
    }
    
    if (headerWarnings.length > 0) {
      warnings.push('Header validation warnings:', ...headerWarnings);
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      setupGuidance: setupGuidance
    };
    
  } catch (error) {
    return {
      isValid: false,
      errors: [`Error validating sheet structure: ${error.message}`],
      warnings: [],
      setupGuidance: [generateSetupAssistanceMessage()]
    };
  }
}

/**
 * Generate user-friendly error messages for common configuration mistakes
 * @param {string} errorType - Type of error from ERROR_TYPES
 * @param {Object} context - Additional context for error message
 * @returns {string} User-friendly error message
 */
function generateUserFriendlyErrorMessage(errorType, context = {}) {
  const rowInfo = context.rowNumber ? ` (Row ${context.rowNumber})` : '';
  const fieldInfo = context.fieldName ? ` in "${context.fieldName}" field` : '';
  
  switch (errorType) {
    case ERROR_TYPES.CONFIG_VALIDATION_ERROR:
      return `Configuration Error${rowInfo}${fieldInfo}: ${context.details || 'Invalid configuration'}`;
    
    case ERROR_TYPES.FILTER_ERROR:
      return `Filter Error${rowInfo}: ${context.details || 'Invalid filter format'}`;
    
    case ERROR_TYPES.REPORT_GENERATION_ERROR:
      return `Report Generation Error: ${context.details || 'Failed to generate report'}`;
    
    case ERROR_TYPES.EXPORT_ERROR:
      return `Export Error: ${context.details || 'Failed to export report'}`;
    
    default:
      return `Error${rowInfo}${fieldInfo}: ${context.details || 'Unknown error occurred'}`;
  }
}

/**
 * Generate setup assistance message for new users
 * @returns {string} Comprehensive setup guide
 */
function generateSetupAssistanceMessage() {
  const examples = createConfigurationExamples();
  
  let message = 'Configuration Export Setup Guide\n\n';
  message += '1. CREATE CONFIGURATION SHEET:\n';
  message += '   • Right-click on sheet tabs → Insert sheet\n';
  message += '   • Name it exactly: "Report Configs"\n\n';
  
  message += '2. ADD COLUMN HEADERS (Row 1):\n';
  message += '   A: Report Name\n';
  message += '   B: Description\n';
  message += '   C: Columns\n';
  message += '   D: Filters\n';
  message += '   E: Sort By\n';
  message += '   F: Sort Order\n';
  message += '   G: Summary Type\n';
  message += '   H: Enabled\n\n';
  
  message += '3. EXAMPLE CONFIGURATIONS:\n\n';
  
  examples.forEach((example, index) => {
    message += `Example ${index + 1}: ${example.name}\n`;
    message += `${example.reportName} | ${example.description} | ${example.columns} | ${example.filters} | ${example.sortBy} | ${example.sortOrder} | ${example.summaryType} | ${example.enabled}\n\n`;
  });
  
  message += '4. AVAILABLE COLUMNS:\n';
  message += '   ' + Object.keys(REPORT_CONFIG.COLUMN_MAPPINGS).join(', ') + '\n\n';
  
  message += '5. FILTER FORMAT:\n';
  message += '   • column=value (exact match)\n';
  message += '   • column>value (greater than)\n';
  message += '   • column<value (less than)\n';
  message += '   • Multiple filters: active=true,hours>0\n\n';
  
  message += '6. SUMMARY TYPES:\n';
  message += '   • NONE: Show individual records\n';
  message += '   • MEMBER_TOTALS: Group by team member\n';
  message += '   • DAILY_TOTALS: Group by date\n';
  message += '   • PROJECT_TOTALS: Group by project\n';
  
  return message;
}

/**
 * Create helpful configuration examples for users
 * @returns {Array} Array of example configuration objects with explanations
 */
function createConfigurationExamples() {
  return [
    {
      name: "Basic Member Summary",
      reportName: "Weekly Summary",
      description: "Team member hours summary",
      columns: "Member Name,Total Hours,Date",
      filters: "",
      sortBy: "Member Name",
      sortOrder: "ASC",
      summaryType: "NONE",
      enabled: "TRUE"
    },
    {
      name: "Project Hours Report",
      reportName: "Project Hours",
      description: "Hours by project with member details",
      columns: "Project Name,Member Name,Hours",
      filters: "Hours>0",
      sortBy: "Project Name",
      sortOrder: "ASC",
      summaryType: "PROJECT_TOTALS",
      enabled: "TRUE"
    },
    {
      name: "Daily Activity Report",
      reportName: "Daily Activity",
      description: "Daily summary of all activities",
      columns: "Date,Total Hours,Members Count",
      filters: "",
      sortBy: "Date",
      sortOrder: "DESC",
      summaryType: "DAILY_TOTALS",
      enabled: "TRUE"
    }
  ];
}
