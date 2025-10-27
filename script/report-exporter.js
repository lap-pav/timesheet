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
  
  // Columns validation - Enhanced to support expressions
  const columnsText = row[REPORT_CONFIG.CONFIG_COLUMNS.COLUMNS] || '';
  if (!columnsText.trim()) {
    errors.push('Columns are required');
  } else {
    try {
      // Parse column definitions using enhanced parser
      const columnDefinitions = parseColumnDefinitions(columnsText);
      
      // Validate expressions
      const validationErrors = [];
      columnDefinitions.forEach(function(colDef, index) {
        if (colDef.isCustom) {
          // Validate transformation expression
          const validation = validateTransformationExpression(colDef.expression);
          if (!validation.isValid) {
            validationErrors.push(`Column ${index + 1} (${colDef.displayName}): ${validation.errorMessage}`);
          } else {
            colDef.validated = true;
          }
        } else {
          // For simple columns without expressions, auto-convert to expression format
          const fieldName = colDef.displayName;
          const mappedField = REPORT_CONFIG.COLUMN_MAPPINGS[fieldName];
          
          if (mappedField) {
            // Convert legacy column name to expression
            colDef.expression = `record.${mappedField}`;
            colDef.isCustom = true;
            colDef.validated = true;
          } else {
            // Unknown column name - suggest expression format
            validationErrors.push(`Unknown column: "${fieldName}". Use expression format like "${fieldName}:record.field_name" or check available fields: ${Object.keys(REPORT_CONFIG.COLUMN_MAPPINGS).join(', ')}`);
          }
        }
      });
      
      if (validationErrors.length > 0) {
        errors.push(...validationErrors);
      } else {
        config.columnDefinitions = columnDefinitions;
        // Maintain backward compatibility
        config.columns = columnDefinitions.map(function(colDef) {
          return colDef.displayName;
        });
      }
      
    } catch (parseError) {
      errors.push(`Column parsing error: ${parseError.message}`);
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
  
  // Output Structure validation (new feature)
  const outputStructure = row[REPORT_CONFIG.CONFIG_COLUMNS.OUTPUT_STRUCTURE] || '';
  if (outputStructure.trim()) {
    const upperOutputStructure = outputStructure.trim().toUpperCase();
    const validOutputTypes = ['SINGLE_SHEET', 'SHEET_PER_PROJECT', 'SHEET_PER_EMPLOYEE', 'FILE_PER_PROJECT', 'FILE_PER_EMPLOYEE'];
    if (validOutputTypes.indexOf(upperOutputStructure) === -1) {
      errors.push(`Output Structure must be one of: ${validOutputTypes.join(', ')}`);
    } else {
      config.outputStructure = upperOutputStructure;
    }
  } else {
    config.outputStructure = 'SINGLE_SHEET'; // Default
  }
  
  // Grouping Field validation (new feature)
  const groupingField = row[REPORT_CONFIG.CONFIG_COLUMNS.GROUPING_FIELD] || '';
  if (groupingField.trim()) {
    // For multi-sheet/file outputs, grouping field is required
    if (config.outputStructure && config.outputStructure !== 'SINGLE_SHEET') {
      if (!config.columns || config.columns.indexOf(groupingField.trim()) === -1) {
        errors.push(`Grouping Field "${groupingField}" must be included in the Columns list`);
      } else {
        config.groupingField = groupingField.trim();
      }
    } else {
      config.groupingField = groupingField.trim();
    }
  } else {
    // Check if grouping field is required but missing
    if (config.outputStructure && config.outputStructure !== 'SINGLE_SHEET') {
      errors.push(`Grouping Field is required for output structure: ${config.outputStructure}`);
    }
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
    
    // Step 2: Transform data columns - Enhanced with expressions
    const transformStartTime = Date.now();
    
    // Check if configuration has enhanced column definitions
    if (configuration.columnDefinitions && configuration.columnDefinitions.length > 0) {
      // Use expression-based transformation
      processedData = transformDataColumnsWithExpressions(processedData, configuration.columnDefinitions);
      Logger.log(`Applied expression-based transformations: ${configuration.columnDefinitions.length} columns`);
    } else {
      // Fallback to legacy transformation for backward compatibility
      processedData = transformDataColumns(processedData, configuration.columns);
      Logger.log(`Applied legacy transformations: ${configuration.columns.length} columns selected`);
    }
    
    processingSteps.push({
      step: 'column_transformation',
      timeMs: Date.now() - transformStartTime,
      recordsAfter: processedData.length,
      transformationType: configuration.columnDefinitions ? 'expression-based' : 'legacy'
    });
    
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

// ============================================================================
// ENHANCED EXPRESSION COMPILATION CACHING WITH PERFORMANCE OPTIMIZATION
// ============================================================================

/**
 * Cache for compiled expressions to improve performance
 * @type {Object<string, Function>}
 */
var EXPRESSION_CACHE = {};

/**
 * Cache statistics for performance monitoring
 * @type {Object}
 */
var CACHE_STATS = {
  hits: 0,
  misses: 0,
  compilations: 0,
  evictions: 0,
  totalEvaluations: 0
};

/**
 * Maximum cache size to prevent memory issues
 * @type {number}
 */
var MAX_CACHE_SIZE = 1000;

/**
 * Cache access timestamps for LRU eviction
 * @type {Object<string, number>}
 */
var CACHE_ACCESS_TIMES = {};

/**
 * Get or create a compiled expression function with enhanced caching
 * @param {string} expression - JavaScript expression to compile
 * @param {Array<string>} contextKeys - Keys for the execution context
 * @returns {Function} Compiled function
 */
function getCompiledExpression(expression, contextKeys) {
  const cacheKey = expression + '|' + contextKeys.join(',');
  const now = Date.now();
  
  // Check cache hit
  if (EXPRESSION_CACHE[cacheKey]) {
    CACHE_STATS.hits++;
    CACHE_ACCESS_TIMES[cacheKey] = now;
    return EXPRESSION_CACHE[cacheKey];
  }
  
  // Cache miss - need to compile
  CACHE_STATS.misses++;
  CACHE_STATS.compilations++;
  
  try {
    // Check if we need to evict entries to stay under size limit
    if (Object.keys(EXPRESSION_CACHE).length >= MAX_CACHE_SIZE) {
      evictOldestCacheEntries(Math.floor(MAX_CACHE_SIZE * 0.2)); // Evict 20% of entries
    }
    
    const func = new Function(...contextKeys, `return (${expression});`);
    EXPRESSION_CACHE[cacheKey] = func;
    CACHE_ACCESS_TIMES[cacheKey] = now;
    return func;
  } catch (error) {
    console.error('Failed to compile expression:', expression, error);
    throw new Error(`Expression compilation failed: ${error.message}`);
  }
}

/**
 * Evict oldest cache entries based on LRU (Least Recently Used) policy
 * @param {number} count - Number of entries to evict
 */
function evictOldestCacheEntries(count) {
  // Get entries sorted by access time (oldest first)
  const entries = Object.keys(CACHE_ACCESS_TIMES)
    .map(key => ({ key, time: CACHE_ACCESS_TIMES[key] }))
    .sort((a, b) => a.time - b.time)
    .slice(0, count);
  
  // Remove oldest entries
  entries.forEach(entry => {
    delete EXPRESSION_CACHE[entry.key];
    delete CACHE_ACCESS_TIMES[entry.key];
    CACHE_STATS.evictions++;
  });
}

/**
 * Clear expression cache and reset statistics (useful for memory management)
 */
function clearExpressionCache() {
  EXPRESSION_CACHE = {};
  CACHE_ACCESS_TIMES = {};
  CACHE_STATS = {
    hits: 0,
    misses: 0,
    compilations: 0,
    evictions: 0,
    totalEvaluations: 0
  };
}

/**
 * Get cache performance statistics
 * @returns {Object} Cache statistics with performance metrics
 */
function getCacheStats() {
  const hitRate = CACHE_STATS.totalEvaluations > 0 
    ? (CACHE_STATS.hits / CACHE_STATS.totalEvaluations * 100).toFixed(2) + '%'
    : '0%';
  
  return {
    ...CACHE_STATS,
    cacheSize: Object.keys(EXPRESSION_CACHE).length,
    maxCacheSize: MAX_CACHE_SIZE,
    hitRate: hitRate,
    memoryEfficiency: CACHE_STATS.evictions > 0 ? 'Active LRU eviction' : 'No eviction needed'
  };
}

/**
 * Warm up cache with common expressions for better performance
 * @param {Array<string>} commonExpressions - Array of frequently used expressions
 */
function warmUpExpressionCache(commonExpressions) {
  console.log('Warming up expression cache with', commonExpressions.length, 'common expressions');
  
  const commonContextKeys = ['record', 'recordIndex'];
  commonExpressions.forEach(function(expr) {
    try {
      getCompiledExpression(expr, commonContextKeys);
    } catch (error) {
      console.warn('Failed to warm up expression:', expr, error.message);
    }
  });
  
  console.log('Cache warm-up complete. Cache size:', Object.keys(EXPRESSION_CACHE).length);
}

/**
 * Transform data using expression-based column definitions with performance optimization
 * @param {Array} data - Original data array
 * @param {Array<Object>} columnDefinitions - Array of ColumnDefinition objects
 * @returns {Array} Transformed data with expression-based columns
 */
function transformDataColumnsWithExpressions(data, columnDefinitions) {
  try {
    // Pre-warm cache with common expressions for better performance
    const expressionsToWarm = columnDefinitions.map(def => def.expression);
    if (data.length > 100) { // Only warm up for larger datasets
      warmUpExpressionCache(expressionsToWarm);
    }
    
    // Batch processing for large datasets
    const batchSize = 1000;
    const results = [];
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchResults = batch.map(function(record, batchIndex) {
        const recordIndex = i + batchIndex;
        const transformedRecord = {};
        
        columnDefinitions.forEach(function(columnDef) {
          try {
            // Create expression context
            const context = {
              record: record,
              recordIndex: recordIndex
            };
            
            // Evaluate expression and set result
            const result = evaluateExpression(columnDef.expression, context);
            transformedRecord[columnDef.displayName] = result;
            
          } catch (error) {
            console.error(`Error evaluating expression for column "${columnDef.displayName}" at record ${recordIndex}:`, error);
            // Use fallback value on error
            transformedRecord[columnDef.displayName] = `ERROR: ${error.message}`;
          }
        });
        
        return transformedRecord;
      });
      
      results.push(...batchResults);
      
      // Progress logging for large datasets
      if (data.length > 5000 && (i + batchSize) % 5000 === 0) {
        console.log(`Processed ${Math.min(i + batchSize, data.length)} / ${data.length} records`);
      }
    }
    
    // Log cache performance for debugging
    if (data.length > 100) {
      const stats = getCacheStats();
      console.log(`Expression processing complete. Cache hit rate: ${stats.hitRate}, Cache size: ${stats.cacheSize}`);
    }
    
    return results;
    
  } catch (error) {
    console.error('Error in transformDataColumnsWithExpressions:', error);
    throw error;
  }
}

/**
 * Transform data to include only specified columns with proper mapping (legacy version)
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
 * Export report data to Google Sheets with enhanced output structure support
 * @param {Array} reportData - Report data to export
 * @param {Object} metadata - Report metadata
 * @param {string} outputLocation - Output location ('new_file' or folder path)
 * @param {Object} outputStructure - Output structure configuration (optional)
 * @returns {Object} Export result
 */
function exportReportToGoogleSheets(reportData, metadata, outputLocation, outputStructure) {
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
    
    // Use enhanced output structure if provided
    if (outputStructure && outputStructure.outputType !== 'SINGLE_SHEET') {
      return exportWithOutputStructure(reportData, metadata, outputLocation, outputStructure);
    }
    
    // Create new spreadsheet
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `${metadata.reportName}_${timestamp}`;
    
    const newSpreadsheet = SpreadsheetApp.create(fileName);
    const sheet = newSpreadsheet.getActiveSheet();
    
    // Move to organized folder structure
    try {
      const timeperiod = metadata.timeperiod || readTime(); // Get current time period
      const targetFolder = ensureReportFolder(outputLocation, metadata.reportName, timeperiod);
      const file = DriveApp.getFileById(newSpreadsheet.getId());
      
      // Move file to target folder and remove from root
      targetFolder.addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    } catch (error) {
      Logger.log(`Warning: Could not organize file into folder: ${error.message}`);
    }
    
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
    
    // Organize file in folder if needed
    if (outputLocation && outputLocation !== 'new_file') {
      organizeFileInFolder(newSpreadsheet.getId(), outputLocation);
    }
    
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

/**
 * Export report data using enhanced output structure (multi-file/sheet)
 * @param {Array} reportData - Report data
 * @param {Object} metadata - Report metadata  
 * @param {string} outputLocation - Output location
 * @param {Object} outputStructure - Output structure configuration
 * @returns {Object} Export result
 */
function exportWithOutputStructure(reportData, metadata, outputLocation, outputStructure) {
  try {
    Logger.log(`Starting enhanced export with structure: ${outputStructure.outputType}`);
    console.log('DEBUG: Export parameters:', {
      outputType: outputStructure.outputType,
      groupingField: outputStructure.groupingField,
      dataLength: reportData.length,
      sampleRecord: reportData[0]
    });
    
    // Use the provided output structure configuration
    const structurePlan = {
      outputType: outputStructure.outputType,
      groupingField: outputStructure.groupingField,
      estimatedFileCount: 1,
      estimatedSheetCount: 1,
      groupInfo: {},
      recommendations: []
    };
    
    // Analyze data for grouping if needed
    if (outputStructure.outputType !== 'SINGLE_SHEET' && reportData && reportData.length > 0) {
      const groups = new Set();
      let totalRecords = 0;
      
      console.log('DEBUG: Analyzing grouping with field:', outputStructure.groupingField);
      console.log('DEBUG: Available fields in first record:', Object.keys(reportData[0]));
      
      reportData.forEach(function(record) {
        const groupValue = record[outputStructure.groupingField];
        console.log(`DEBUG: Record groupValue for "${outputStructure.groupingField}":`, groupValue);
        if (groupValue !== undefined && groupValue !== null && groupValue !== '') {
          groups.add(String(groupValue));
        }
        totalRecords++;
      });
      
      console.log('DEBUG: Found groups:', Array.from(groups));
      
      structurePlan.groupInfo = {
        totalGroups: groups.size,
        groupNames: Array.from(groups).sort(),
        totalRecords: totalRecords,
        averageRecordsPerGroup: totalRecords / Math.max(groups.size, 1)
      };
      
      // Calculate estimates
      if (outputStructure.outputType.includes('FILE_PER_')) {
        structurePlan.estimatedFileCount = groups.size;
        structurePlan.estimatedSheetCount = groups.size; // One sheet per file
      } else if (outputStructure.outputType.includes('SHEET_PER_')) {
        structurePlan.estimatedFileCount = 1;
        structurePlan.estimatedSheetCount = groups.size;
      }
    }
    
    // Create output files using the structure engine
    const createdFiles = createOutputFiles(reportData, structurePlan, metadata);
    
    // Organize files in folder if needed
    if (outputLocation && outputLocation !== 'new_file') {
      const folder = ensureReportFolder(outputLocation, metadata.reportName);
      createdFiles.forEach(function(fileInfo) {
        organizeFileInFolder(fileInfo.id, folder.getId());
      });
    }
    
    // Prepare summary result
    const result = {
      success: true,
      fileName: createdFiles.length === 1 ? createdFiles[0].name : `${createdFiles.length} files created`,
      fileUrl: createdFiles.length === 1 ? createdFiles[0].url : null,
      fileId: createdFiles.length === 1 ? createdFiles[0].id : null,
      createdFiles: createdFiles,
      outputStructure: outputStructure,
      errors: []
    };
    
    Logger.log(`Enhanced export completed: ${createdFiles.length} files created`);
    return result;
    
  } catch (error) {
    Logger.log('Error in enhanced export: ' + error.message);
    return {
      success: false,
      fileName: null,
      fileUrl: null,
      errors: [`Enhanced export failed: ${error.message}`]
    };
  }
}

/**
 * Organize a file into a specific folder using DriveApp
 * @param {string} fileId - Google Drive file ID
 * @param {string} folderId - Target folder ID or path
 */
function organizeFileInFolder(fileId, folderId) {
  try {
    const file = DriveApp.getFileById(fileId);
    let targetFolder;
    
    if (typeof folderId === 'string' && folderId.length > 10) {
      // Assume it's a folder ID
      targetFolder = DriveApp.getFolderById(folderId); 
    } else {
      // Assume it's a folder path - would need path resolution
      Logger.log(`Warning: Folder path resolution not implemented: ${folderId}`);
      return;
    }
    
    // Move file to target folder
    targetFolder.addFile(file);
    
    // Remove from root if needed (optional)
    const parents = file.getParents();
    while (parents.hasNext()) {
      const parent = parents.next();
      if (parent.getName() !== targetFolder.getName()) {
        parent.removeFile(file);
      }
    }
    
    Logger.log(`File organized in folder: ${file.getName()}`);
    
  } catch (error) {
    Logger.log(`Warning: Could not organize file in folder: ${error.message}`);
  }
}

/**
 * Ensure a report folder exists, creating it if necessary
 * @param {string} basePath - Base path or folder ID
 * @param {string} reportName - Report name for folder naming
 * @returns {Object} Google Drive folder object
 */
function ensureReportFolder(basePath, reportName, timeperiod) {
  try {
    // Step 1: Get the folder where the current spreadsheet (Apps Script) is located
    const currentSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const spreadsheetFile = DriveApp.getFileById(currentSpreadsheet.getId());
    const parentFolders = spreadsheetFile.getParents();
    
    let baseFolder;
    if (parentFolders.hasNext()) {
      baseFolder = parentFolders.next(); // Use the spreadsheet's parent folder
    } else {
      baseFolder = DriveApp.getRootFolder(); // Fallback to root if no parent
    }
    
    // Step 2: Create or find main "Timesheet Reports" folder in the same directory
    const mainFolderName = REPORT_CONFIG.REPORT_FOLDER_CONFIG.MAIN_FOLDER_NAME;
    let mainFolder;
    
    const existingMainFolders = baseFolder.getFoldersByName(mainFolderName);
    
    if (existingMainFolders.hasNext()) {
      mainFolder = existingMainFolders.next();
    } else {
      mainFolder = baseFolder.createFolder(mainFolderName);
    }
    
    // Step 2: Create or find monthly subfolder (YYYY-MM format)
    let targetFolder = mainFolder;
    if (REPORT_CONFIG.REPORT_FOLDER_CONFIG.MONTHLY_SUBFOLDERS && timeperiod) {
      const monthlyFolderName = `${timeperiod}-Reports`; // e.g., "2025-10-Reports"
      const existingMonthlyFolders = mainFolder.getFoldersByName(monthlyFolderName);
      
      if (existingMonthlyFolders.hasNext()) {
        targetFolder = existingMonthlyFolders.next();
      } else {
        targetFolder = mainFolder.createFolder(monthlyFolderName);
      }
    }
    
    return targetFolder;
    
  } catch (error) {
    Logger.log(`Warning: Could not create report folder structure: ${error.message}`);
    return DriveApp.getRootFolder(); // Fallback to root
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

// ============================================================================
// ENHANCED EXPRESSION SYSTEM FUNCTIONS
// ============================================================================

/**
 * Smart split function that respects parentheses in expressions
 * Splits by comma but ignores commas inside function calls
 * @param {string} text - Text to split
 * @returns {Array} Array of parts
 */
function smartSplitColumns(text) {
  const parts = [];
  let current = '';
  let parenDepth = 0;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (char === '(') {
      parenDepth++;
      current += char;
    } else if (char === ')') {
      parenDepth--;
      current += char;
    } else if (char === ',' && parenDepth === 0) {
      // Only split on comma if we're not inside parentheses
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        parts.push(trimmed);
      }
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last part
  const trimmed = current.trim();
  if (trimmed.length > 0) {
    parts.push(trimmed);
  }
  
  return parts;
}

/**
 * Parse column configuration text into structured column definitions
 * @param {string} columnsText - Column definitions in format "Name:expression,Name2:expression2" or "SimpleName,SimpleName2"
 * @returns {Array<Object>} Array of ColumnDefinition objects
 * @throws {Error} If input is invalid or contains duplicate column names
 */
function parseColumnDefinitions(columnsText) {
  try {
    // Validate input
    if (!columnsText || typeof columnsText !== 'string' || columnsText.trim() === '') {
      throw new Error('Columns text cannot be empty');
    }
    
    if (columnsText.length > 2000) {
      throw new Error('Columns text exceeds maximum length of 2000 characters');
    }
    
    // Smart split by comma that respects parentheses in function calls
    const columnParts = smartSplitColumns(columnsText);
    if (columnParts.length === 0) {
      throw new Error('No valid column definitions found');
    }
    
    const columnDefinitions = [];
    const usedNames = new Set();
    
    for (let i = 0; i < columnParts.length; i++) {
      const part = columnParts[i];
      let displayName, expression, isCustom;
      
      // Check if this is an expression format (contains colon) or simple format
      if (part.includes(':')) {
        const colonIndex = part.indexOf(':');
        displayName = part.substring(0, colonIndex).trim();
        expression = part.substring(colonIndex + 1).trim();
        isCustom = true;
        
        if (displayName === '' || expression === '') {
          throw new Error(`Invalid column definition format at position ${i + 1}: "${part}"`);
        }
      } else {
        // Simple column name - direct field mapping
        displayName = part;
        expression = `record["${part}"]`; // Simple field access
        isCustom = false;
      }
      
      // Validate display name
      if (displayName.length > 50) {
        throw new Error(`Column name "${displayName}" exceeds maximum length of 50 characters`);
      }
      
      // Check for duplicates
      if (usedNames.has(displayName)) {
        throw new Error(`Duplicate column name: ${displayName}`);
      }
      usedNames.add(displayName);
      
      // Create column definition object
      columnDefinitions.push({
        displayName: displayName,
        expression: expression,
        isCustom: isCustom,
        validated: false, // Will be validated separately
        errorMessage: null
      });
    }
    
    return columnDefinitions;
    
  } catch (error) {
    console.error('Error in parseColumnDefinitions:', error);
    if (error.message.includes('Columns text cannot be empty') || 
        error.message.includes('Invalid column definition format') ||
        error.message.includes('Duplicate column name')) {
      throw error; // Re-throw validation errors as-is
    }
    throw new Error(`Parse error: ${error.message}`);
  }
}

/**
 * Evaluate a transformation expression within a safe context with performance optimization
 * @param {string} expression - JavaScript expression to evaluate
 * @param {Object} context - Context object containing record data and helper functions
 * @returns {any} Result of expression evaluation
 * @throws {Error} If expression evaluation fails
 */
function evaluateExpression(expression, context) {
  try {
    // Update performance stats
    CACHE_STATS.totalEvaluations++;
    
    // Validate inputs
    if (!expression || typeof expression !== 'string') {
      throw new Error('Expression must be a non-empty string');
    }
    
    if (!context || typeof context !== 'object') {
      throw new Error('Context must be an object');
    }
    
    // Create safe evaluation context with built-in functions and record data
    const safeContext = {
      record: context.record || {},
      // Add transformation functions from constants
      calculateHours: EXPRESSION_FUNCTIONS.calculateHours,
      formatDate: EXPRESSION_FUNCTIONS.formatDate,
      formatTime: EXPRESSION_FUNCTIONS.formatTime,
      getDayOfWeek: EXPRESSION_FUNCTIONS.getDayOfWeek,
      getMonthName: EXPRESSION_FUNCTIONS.getMonthName,
      addDays: EXPRESSION_FUNCTIONS.addDays,
      stringContains: EXPRESSION_FUNCTIONS.stringContains,
      defaultValue: EXPRESSION_FUNCTIONS.defaultValue,
      // Helper variables for convenience
      Math: Math,
      Date: Date,
      String: String,
      Number: Number,
      Boolean: Boolean
    };
    
    // Use cached compilation for better performance
    const contextKeys = Object.keys(safeContext);
    const compiledFunc = getCompiledExpression(expression, contextKeys);
    
    // Execute with safe context values
    const result = compiledFunc(...Object.values(safeContext));
    
    return result;
    
  } catch (error) {
    console.error('Error evaluating expression:', expression, error);
    throw new Error(`Expression evaluation failed: ${error.message}`);
  }
}

/**
 * Validate a transformation expression for security and syntax
 * @param {string} expression - JavaScript expression to validate
 * @returns {Object} Validation result with isValid flag and error message
 */
function validateTransformationExpression(expression) {
  try {
    // Input validation
    if (!expression || typeof expression !== 'string') {
      return {
        isValid: false,
        errorMessage: 'Expression must be a non-empty string'
      };
    }
    
    const trimmed = expression.trim();
    if (trimmed === '') {
      return {
        isValid: false,
        errorMessage: 'Expression cannot be empty'
      };
    }
    
    if (trimmed.length > 500) {
      return {
        isValid: false,
        errorMessage: 'Expression exceeds maximum length of 500 characters'
      };
    }
    
    // Security validation - check for dangerous patterns
    const dangerousPatterns = [
      /eval\s*\(/i,                    // eval function
      /Function\s*\(/i,                // Function constructor (user should not call this directly)
      /globalThis/i,                   // Global object access
      /window/i,                       // Browser window object
      /document/i,                     // DOM document object
      /process/i,                      // Node.js process object
      /require\s*\(/i,                 // Module loading
      /import\s+/i,                    // ES6 imports
      /export\s+/i,                    // ES6 exports
      /\.\s*constructor/i,             // Constructor access
      /\.\s*prototype/i,               // Prototype manipulation
      /setTimeout/i,                   // Async execution
      /setInterval/i,                  // Async execution
      /XMLHttpRequest/i,               // Network requests
      /fetch\s*\(/i,                   // Network requests
      /localStorage/i,                 // Browser storage
      /sessionStorage/i,               // Browser storage
      /SpreadsheetApp(?!\.[a-zA-Z_$][a-zA-Z0-9_$]*\s*\()/i, // Direct SpreadsheetApp access (should use provided functions)
      /DriveApp(?!\.[a-zA-Z_$][a-zA-Z0-9_$]*\s*\()/i        // Direct DriveApp access
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmed)) {
        return {
          isValid: false,
          errorMessage: `Expression contains restricted pattern: ${pattern.source}`
        };
      }
    }
    
    // Syntax validation - try to create function without executing
    try {
      // Create a dummy context for validation
      const validationContext = {
        record: {},
        calculateHours: function() { return 0; },
        formatDate: function() { return ''; },
        formatTime: function() { return ''; },
        getDayOfWeek: function() { return ''; },
        getMonthName: function() { return ''; },
        addDays: function() { return new Date(); },
        stringContains: function() { return false; },
        defaultValue: function() { return ''; },
        Math: Math,
        Date: Date,
        String: String,
        Number: Number,
        Boolean: Boolean
      };
      
      // Test function creation
      const testFunc = new Function(...Object.keys(validationContext), `return (${trimmed});`);
      
      // Test execution with safe dummy data
      testFunc(...Object.values(validationContext));
      
    } catch (syntaxError) {
      return {
        isValid: false,
        errorMessage: `Syntax error: ${syntaxError.message}`
      };
    }
    
    return {
      isValid: true,
      errorMessage: null
    };
    
  } catch (error) {
    console.error('Error validating expression:', error);
    return {
      isValid: false,
      errorMessage: `Validation error: ${error.message}`
    };
  }
}

// ============================================================================
// OUTPUT STRUCTURE ENGINE
// ============================================================================

/**
 * Determine the output structure configuration for a report
 * @param {Object} reportConfig - Report configuration object
 * @param {Array} data - Report data to analyze
 * @returns {Object} Output structure plan with metadata
 */
function determineOutputStructure(reportConfig, data) {
  try {
    const outputType = reportConfig.outputStructure || 'SINGLE_SHEET';
    const groupingField = reportConfig.groupingField || '';
    
    // Validate configuration
    const validTypes = ['SINGLE_SHEET', 'SHEET_PER_PROJECT', 'SHEET_PER_EMPLOYEE', 'FILE_PER_PROJECT', 'FILE_PER_EMPLOYEE'];
    if (!validTypes.includes(outputType)) {
      throw new Error(`Invalid output structure type: ${outputType}`);
    }
    
    // For multi-sheet/file outputs, grouping field is required
    if (outputType !== 'SINGLE_SHEET' && !groupingField) {
      throw new Error(`Grouping field is required for output type: ${outputType}`);
    }
    
    const result = {
      outputType: outputType,
      groupingField: groupingField,
      estimatedFileCount: 1,
      estimatedSheetCount: 1,
      groupInfo: {},
      recommendations: []
    };
    
    // Analyze data for grouping if needed
    if (outputType !== 'SINGLE_SHEET' && data && data.length > 0) {
      const groups = new Set();
      let totalRecords = 0;
      
      data.forEach(function(record) {
        const groupValue = record[groupingField];
        if (groupValue !== undefined && groupValue !== null && groupValue !== '') {
          groups.add(String(groupValue));
        }
        totalRecords++;
      });
      
      result.groupInfo = {
        totalGroups: groups.size,
        groupNames: Array.from(groups).sort(),
        totalRecords: totalRecords,
        averageRecordsPerGroup: totalRecords / Math.max(groups.size, 1)
      };
      
      // Calculate estimates
      if (outputType.includes('FILE_PER_')) {
        result.estimatedFileCount = groups.size;
        result.estimatedSheetCount = groups.size; // One sheet per file
      } else if (outputType.includes('SHEET_PER_')) {
        result.estimatedFileCount = 1;
        result.estimatedSheetCount = groups.size;
      }
      
      // Generate recommendations
      if (groups.size > 50) {
        result.recommendations.push('Large number of groups detected. Consider using SINGLE_SHEET for better performance.');
      }
      
      if (result.groupInfo.averageRecordsPerGroup < 2) {
        result.recommendations.push('Many groups have very few records. Consider different grouping strategy.');
      }
      
      if (outputType.includes('FILE_PER_') && groups.size > 20) {
        result.recommendations.push('Many files will be created. Consider using SHEET_PER_ instead.');
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('Error in determineOutputStructure:', error);
    throw error;
  }
}

/**
 * Create output files with proper organization based on structure configuration
 * @param {Array} data - Report data
 * @param {Object} structurePlan - Output structure plan from determineOutputStructure
 * @param {Object} reportConfig - Report configuration
 * @returns {Array} Array of created file information
 */
function createOutputFiles(data, structurePlan, reportConfig) {
  try {
    const createdFiles = [];
    const outputType = structurePlan.outputType;
    
    if (outputType === 'SINGLE_SHEET') {
      // Create single file with all data
      const fileName = generateFileName(reportConfig, null);
      const spreadsheet = SpreadsheetApp.create(fileName);
      const sheet = spreadsheet.getActiveSheet();
      sheet.setName(reportConfig.reportName || 'Report');
      
      // Write data to sheet
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        const values = [headers].concat(data.map(record => headers.map(header => record[header] || '')));
        sheet.getRange(1, 1, values.length, headers.length).setValues(values);
        
        // Format header row
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e8f0fe');
      }
      
      // Organize file into proper folder
      try {
        const timeperiod = reportConfig.timeperiod || readTime();
        const targetFolder = ensureReportFolder(null, reportConfig.reportName, timeperiod);
        const file = DriveApp.getFileById(spreadsheet.getId());
        targetFolder.addFile(file);
        DriveApp.getRootFolder().removeFile(file);
      } catch (error) {
        Logger.log(`Warning: Could not organize single file: ${error.message}`);
      }
      
      createdFiles.push({
        id: spreadsheet.getId(),
        name: fileName,
        url: spreadsheet.getUrl(),
        type: 'spreadsheet',
        recordCount: data.length
      });
      
    } else if (outputType.includes('FILE_PER_')) {
      // Create separate files for each group
      const groupedData = groupDataByField(data, structurePlan.groupingField);
      
      Object.keys(groupedData).forEach(function(groupValue) {
        const groupData = groupedData[groupValue];
        const fileName = generateFileName(reportConfig, groupValue);
        const spreadsheet = SpreadsheetApp.create(fileName);
        const sheet = spreadsheet.getActiveSheet();
        sheet.setName(groupValue);
        
        // Write group data to sheet
        if (groupData.length > 0) {
          const headers = Object.keys(groupData[0]);
          const values = [headers].concat(groupData.map(record => headers.map(header => record[header] || '')));
          sheet.getRange(1, 1, values.length, headers.length).setValues(values);
          
          // Format header row
          sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e8f0fe');
        }
        
        // Organize file into proper folder
        try {
          const timeperiod = reportConfig.timeperiod || readTime();
          const targetFolder = ensureReportFolder(null, reportConfig.reportName, timeperiod);
          const file = DriveApp.getFileById(spreadsheet.getId());
          targetFolder.addFile(file);
          DriveApp.getRootFolder().removeFile(file);
        } catch (error) {
          Logger.log(`Warning: Could not organize group file: ${error.message}`);
        }
        
        createdFiles.push({
          id: spreadsheet.getId(),
          name: fileName,
          url: spreadsheet.getUrl(),
          type: 'spreadsheet',
          group: groupValue,
          recordCount: groupData.length
        });
      });
      
    } else if (outputType.includes('SHEET_PER_')) {
      // Create single file with multiple sheets
      const fileName = generateFileName(reportConfig, null);
      const spreadsheet = SpreadsheetApp.create(fileName);
      const groupedData = groupDataByField(data, structurePlan.groupingField);
      
      // Remove the default sheet first
      const defaultSheet = spreadsheet.getActiveSheet();
      
      let isFirstSheet = true;
      Object.keys(groupedData).forEach(function(groupValue) {
        const groupData = groupedData[groupValue];
        let sheet;
        
        if (isFirstSheet) {
          sheet = defaultSheet;
          sheet.setName(groupValue);
          isFirstSheet = false;
        } else {
          sheet = spreadsheet.insertSheet(groupValue);
        }
        
        // Write group data to sheet
        if (groupData.length > 0) {
          const headers = Object.keys(groupData[0]);
          const values = [headers].concat(groupData.map(record => headers.map(header => record[header] || '')));
          sheet.getRange(1, 1, values.length, headers.length).setValues(values);
          
          // Format header row
          sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e8f0fe');
        }
      });
      
      // Organize file into proper folder
      try {
        const timeperiod = reportConfig.timeperiod || readTime();
        const targetFolder = ensureReportFolder(null, reportConfig.reportName, timeperiod);
        const file = DriveApp.getFileById(spreadsheet.getId());
        targetFolder.addFile(file);
        DriveApp.getRootFolder().removeFile(file);
      } catch (error) {
        Logger.log(`Warning: Could not organize multi-sheet file: ${error.message}`);
      }
      
      createdFiles.push({
        id: spreadsheet.getId(),
        name: fileName,
        url: spreadsheet.getUrl(),
        type: 'spreadsheet',
        sheetCount: Object.keys(groupedData).length,
        recordCount: data.length
      });
    }
    
    return createdFiles;
    
  } catch (error) {
    console.error('Error in createOutputFiles:', error);
    throw error;
  }
}

/**
 * Generate filename with pattern substitution
 * @param {Object} reportConfig - Report configuration
 * @param {string|null} groupValue - Group value for multi-file outputs
 * @returns {string} Generated filename
 */
function generateFileName(reportConfig, groupValue) {
  try {
    let fileName = reportConfig.reportName || 'Report';
    
    // Add group value if provided
    if (groupValue) {
      fileName += `_${groupValue}`;
    }
    
    // Add timestamp if configured
    if (reportConfig.includeTimestamp !== false) {
      const now = new Date();
      const timestamp = now.getFullYear() + '-' + 
                       String(now.getMonth() + 1).padStart(2, '0') + '-' +
                       String(now.getDate()).padStart(2, '0') + '_' +
                       String(now.getHours()).padStart(2, '0') + '-' +
                       String(now.getMinutes()).padStart(2, '0');
      fileName += `_${timestamp}`;
    }
    
    // Sanitize filename for Google Drive
    fileName = fileName.replace(/[<>:"/\\|?*]/g, '_');
    
    return fileName;
    
  } catch (error) {
    console.error('Error generating filename:', error);
    return 'Report_' + Date.now();
  }
}

/**
 * Helper function to group data by a specific field
 * @param {Array} data - Data to group
 * @param {string} field - Field to group by
 * @returns {Object} Grouped data object
 */
function groupDataByField(data, field) {
  const grouped = {};
  
  data.forEach(function(record) {
    const groupValue = record[field] || 'Unknown';
    if (!grouped[groupValue]) {
      grouped[groupValue] = [];
    }
    grouped[groupValue].push(record);
  });
  
  return grouped;
}

// ============================================================================
// BACKWARD COMPATIBILITY & MIGRATION UTILITIES
// ============================================================================

/**
 * Ensure backward compatibility for legacy column configurations
 * @param {Object} config - Configuration object to migrate
 * @returns {Object} Migrated configuration with enhanced features
 */
function ensureBackwardCompatibility(config) {
  try {
    // If columnDefinitions don't exist but columns do, migrate
    if (!config.columnDefinitions && config.columns) {
      config.columnDefinitions = config.columns.map(function(columnName) {
        return {
          displayName: columnName,
          expression: `record["${columnName}"]`, // Simple field access
          isCustom: false,
          validated: true,
          errorMessage: null
        };
      });
    }
    
    // Ensure output structure defaults
    if (!config.outputStructure) {
      config.outputStructure = 'SINGLE_SHEET';
    }
    
    // Ensure grouping field is set if needed
    if (config.outputStructure !== 'SINGLE_SHEET' && !config.groupingField) {
      // Try to infer from common column names
      const commonGroupingFields = ['Project Name', 'Member Name', 'Employee Name', 'Team', 'Department'];
      for (const field of commonGroupingFields) {
        if (config.columns && config.columns.indexOf(field) !== -1) {
          config.groupingField = field;
          break;
        }
      }
    }
    
    return config;
    
  } catch (error) {
    console.error('Error ensuring backward compatibility:', error);
    return config; // Return original if migration fails
  }
}

/**
 * Migrate legacy report configurations to enhanced format
 * @param {Array} legacyConfigs - Array of legacy configuration objects
 * @returns {Array} Array of migrated configuration objects
 */
function migrateReportConfigurations(legacyConfigs) {
  try {
    const migratedConfigs = [];
    
    legacyConfigs.forEach(function(config, index) {
      try {
        const migrated = ensureBackwardCompatibility(config);
        
        // Add migration metadata
        migrated._migrated = true;
        migrated._originalVersion = 'legacy';
        migrated._migratedAt = new Date().toISOString();
        
        migratedConfigs.push(migrated);
        
      } catch (error) {
        console.error(`Error migrating configuration ${index}:`, error);
        // Keep original configuration with error flag
        const errorConfig = Object.assign({}, config);
        errorConfig._migrationError = error.message;
        migratedConfigs.push(errorConfig);
      }
    });
    
    return migratedConfigs;
    
  } catch (error) {
    console.error('Error in migrateReportConfigurations:', error);
    return legacyConfigs; // Return originals if migration fails
  }
}

/**
 * Check if a configuration needs migration
 * @param {Object} config - Configuration to check
 * @returns {boolean} True if migration is needed
 */
function needsMigration(config) {
  // Check for legacy indicators
  return !config.columnDefinitions ||  // Missing new column definitions
         !config.outputStructure ||     // Missing output structure
         config._originalVersion;       // Explicitly marked as legacy
}

/**
 * Generate migration report for configurations
 * @param {Array} originalConfigs - Original configurations
 * @param {Array} migratedConfigs - Migrated configurations
 * @returns {Object} Migration report
 */
function generateMigrationReport(originalConfigs, migratedConfigs) {
  const report = {
    totalConfigurations: originalConfigs.length,
    migratedCount: 0,
    errorCount: 0,
    warningCount: 0,
    details: [],
    recommendations: []
  };
  
  migratedConfigs.forEach(function(config, index) {
    const detail = {
      configurationName: config.reportName || `Configuration ${index + 1}`,
      status: 'success'
    };
    
    if (config._migrationError) {
      detail.status = 'error';
      detail.error = config._migrationError;
      report.errorCount++;
    } else if (config._migrated) {
      detail.status = 'migrated';
      detail.changes = [];
      
      if (config.columnDefinitions) {
        detail.changes.push('Enhanced column definitions created');
      }
      if (config.outputStructure) {
        detail.changes.push(`Output structure set to ${config.outputStructure}`);
      }
      if (config.groupingField) {
        detail.changes.push(`Grouping field set to ${config.groupingField}`);
      }
      
      report.migratedCount++;
    }
    
    report.details.push(detail);
  });
  
  // Generate recommendations
  if (report.migratedCount > 0) {
    report.recommendations.push('Consider testing migrated configurations before production use');
    report.recommendations.push('Update documentation to reflect enhanced features');
  }
  
  if (report.errorCount > 0) {
    report.recommendations.push('Review configurations with migration errors manually');
  }
  
  return report;
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
      enabled: "TRUE",
      outputStructure: "SINGLE_SHEET",
      groupingField: ""
    },
    {
      name: "Enhanced Project Hours Report",
      reportName: "Project Hours Enhanced",
      description: "Hours by project with calculated totals and expressions",
      columns: "Project Name,Member Name,Hours Worked:calculateHours(Time In,Time Out),Formatted Date:formatDate(Date)",
      filters: "Hours>0",
      sortBy: "Project Name",
      sortOrder: "ASC",
      summaryType: "PROJECT_TOTALS",
      enabled: "TRUE",
      outputStructure: "SHEET_PER_PROJECT",
      groupingField: "Project Name"
    },
    {
      name: "Multi-File Employee Report",
      reportName: "Employee Report",
      description: "Separate files for each employee with custom calculations",
      columns: "Member Name,Date,Day of Week:getDayOfWeek(Date),Hours:calculateHours(Time In,Time Out)",
      filters: "",
      sortBy: "Date",
      sortOrder: "DESC",
      summaryType: "NONE",
      enabled: "TRUE",
      outputStructure: "FILE_PER_EMPLOYEE", 
      groupingField: "Member Name"
    },
    {
      name: "Legacy Compatibility Example",
      reportName: "Daily Activity",
      description: "Daily summary using legacy format (auto-migrated)",
      columns: "Date,Total Hours,Members Count",
      filters: "",
      sortBy: "Date",
      sortOrder: "DESC",
      summaryType: "DAILY_TOTALS",
      enabled: "TRUE"
      // Note: outputStructure and groupingField will be auto-added during migration
    }
  ];
}
