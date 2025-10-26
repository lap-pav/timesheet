// ============================================================================
// TIMESHEET AGGREGATION CONSTANTS AND CONFIGURATION
// ============================================================================

// Timesheet aggregation configuration
const AGGREGATION_CONFIG = {
  // Execution limits
  MAX_EXECUTION_TIME_MS: 300000, // 5 minutes (safety buffer for 6-minute limit)
  MAX_MEMORY_MB: 100,
  BATCH_SIZE: 20, // Process files in batches to manage memory
  
  // File naming patterns
  TIMESHEET_FILE_PATTERN: /^Timesheet_(\d{4}-\d{2})_(.+)$/i,
  MONTH_FOLDER_PATTERN: /^(\d{4}-\d{2})$/,
  
  // Expected column headers (case-insensitive matching)
  EXPECTED_HEADERS: {
    DATE: ['date', 'day'],
    FROM_TIME: ['from time', 'start time', 'from'],
    TO_TIME: ['to time', 'end time', 'to'],
    PROJECT: ['project', 'project name'],
    TASK_TYPE: ['task type', 'task', 'type', 'activity'],
    DESCRIPTION: ['description', 'desc', 'details'],
    TC_FROM_TIME: ['tc from time', 'tc start', 'timecard from'],
    TC_TO_TIME: ['tc to time', 'tc end', 'timecard to']
  },
  
  // Data validation
  TIME_FORMAT_PATTERNS: [
    /^\d{1,2}:\d{2}$/,        // H:MM or HH:MM
    /^\d{1,2}:\d{2}:\d{2}$/,  // H:MM:SS or HH:MM:SS
    /^\d{1,2}\.\d{2}$/,       // H.MM or HH.MM (decimal format)
    /^\d{1,2}:\d{2}\s*(AM|PM)$/i, // H:MM AM/PM
    /^\d{1,2}:\d{2}:\d{2}\s*(AM|PM)$/i // H:MM:SS AM/PM
  ],
  
  DATE_FORMAT_PATTERNS: [
    /^\d{4}-\d{2}-\d{2}$/,    // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/,  // MM/DD/YYYY
    /^\d{1,2}\/\d{1,2}\/\d{4}$/ // M/D/YYYY
  ],
  
  // Error handling
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  
  // Performance tracking
  CHECKPOINT_INTERVAL: 10 // Log progress every N files
};

// ============================================================================
// CONFIGURATION-DRIVEN REPORT EXPORT CONSTANTS
// ============================================================================

// Configuration export settings
const REPORT_CONFIG = {
  // Sheet names
  REPORT_CONFIG_SHEET_NAME: "Report Configs",
  
  // Column indices for Report Configs sheet (A=0, B=1, etc.)
  CONFIG_COLUMNS: {
    REPORT_NAME: 0,     // A: Report Name
    DESCRIPTION: 1,     // B: Description
    COLUMNS: 2,         // C: Columns (comma-separated)
    FILTERS: 3,         // D: Filters (key=value pairs)
    SORT_BY: 4,         // E: Sort By
    SORT_ORDER: 5,      // F: Sort Order (ASC/DESC)
    SUMMARY_TYPE: 6,    // G: Summary Type (SUM/COUNT/AVG/NONE)
    ENABLED: 7          // H: Enabled (TRUE/FALSE)
  },
  
  // Validation limits
  MAX_REPORT_NAME_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 200,
  
  // Valid enumeration values
  VALID_SORT_ORDERS: ['ASC', 'DESC'],
  VALID_SUMMARY_TYPES: ['NONE', 'MEMBER_TOTALS', 'DAILY_TOTALS', 'PROJECT_TOTALS'],
  
  // Column name mappings from aggregated data to display names
  COLUMN_MAPPINGS: {
    'Member Name': 'memberName',
    'PAV ID': 'pavId',
    'Date': 'date',
    'Start Time': 'startTime', 
    'End Time': 'endTime',
    'Hours': 'hours',
    'Total Hours': 'totalHours',
    'Project Name': 'project',
    'Task Description': 'description',
    'Status': 'status',
    'Department': 'department',
    'Role': 'role'
  },
  
  // Filter operators (order matters - longer operators first)
  FILTER_OPERATORS: ['>=', '<=', '!=', '=', '>', '<', 'contains'],
  
  // Export settings
  MAX_PROCESSING_TIME_MS: 300000, // 5 minutes maximum
  PROGRESS_UPDATE_INTERVAL_MS: 30000, // Show progress every 30 seconds
  BATCH_SIZE: 1000, // Process data in chunks
  
  // Sheet structure for generated reports
  REPORT_SHEETS: {
    DATA_SHEET: "Report Data",
    INFO_SHEET: "Report Info"
  }
};

// Error types for consistent error handling
const ERROR_TYPES = {
  FOLDER_NOT_FOUND: 'FOLDER_NOT_FOUND',
  MULTIPLE_FOLDERS: 'MULTIPLE_FOLDERS',
  FILE_ACCESS: 'FILE_ACCESS',
  DATA_CORRUPTION: 'DATA_CORRUPTION',
  INVALID_HEADER: 'INVALID_HEADER',
  INVALID_ENTRY: 'INVALID_ENTRY',
  RETRY_ATTEMPT: 'RETRY_ATTEMPT',
  MEMORY_CONSTRAINT: 'MEMORY_CONSTRAINT',
  SYSTEM_FAILURE: 'SYSTEM_FAILURE',
  TIMEOUT_WARNING: 'TIMEOUT_WARNING',
  
  // Configuration export specific errors
  CONFIG_SHEET_NOT_FOUND: 'CONFIG_SHEET_NOT_FOUND',
  CONFIG_VALIDATION_ERROR: 'CONFIG_VALIDATION_ERROR',
  CONFIG_DUPLICATE_NAME: 'CONFIG_DUPLICATE_NAME',
  REPORT_GENERATION_ERROR: 'REPORT_GENERATION_ERROR',
  EXPORT_ERROR: 'EXPORT_ERROR',
  FILTER_ERROR: 'FILTER_ERROR',
  COLUMN_NOT_FOUND: 'COLUMN_NOT_FOUND'
};

// Severity levels
const SEVERITY_LEVELS = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

// ============================================================================
// TIMESHEET AGGREGATION FUNCTIONS
// ============================================================================

/**
 * Discovers the Google Drive folder for a specific month
 * @param {string} yearMonth - Month in YYYY-MM format (e.g., "2025-09")
 * @returns {Object} Result object with folder and any errors
 */
function getMonthlyFolder(yearMonth) {
  const startTime = Date.now();
  const result = {
    folder: null,
    errors: [],
    metadata: {
      yearMonth: yearMonth,
      searchTimeMs: 0,
      foldersFound: 0
    }
  };
  
  try {
    // Validate input format
    if (!yearMonth || !AGGREGATION_CONFIG.MONTH_FOLDER_PATTERN.test(yearMonth)) {
      result.errors.push({
        type: ERROR_TYPES.INVALID_ENTRY,
        source: 'INPUT_VALIDATION',
        message: 'Invalid yearMonth format: ' + yearMonth + '. Expected YYYY-MM format.',
        severity: SEVERITY_LEVELS.ERROR,
        timestamp: new Date().toISOString()
      });
      return result;
    }
    
    // Search for folders matching the month name
    const folders = DriveApp.getFoldersByName(yearMonth);
    const foundFolders = [];
    
    while (folders.hasNext()) {
      foundFolders.push(folders.next());
    }
    
    result.metadata.foldersFound = foundFolders.length;
    result.metadata.searchTimeMs = Date.now() - startTime;
    
    if (foundFolders.length === 0) {
      result.errors.push({
        type: ERROR_TYPES.FOLDER_NOT_FOUND,
        source: 'FOLDER_DISCOVERY',
        message: 'No folder found with name \'' + yearMonth + '\'. Please ensure the monthly folder exists in Google Drive.',
        severity: SEVERITY_LEVELS.ERROR,
        timestamp: new Date().toISOString()
      });
      return result;
    }
    
    if (foundFolders.length > 1) {
      result.errors.push({
        type: ERROR_TYPES.MULTIPLE_FOLDERS,
        source: 'FOLDER_DISCOVERY',
        message: 'Found ' + foundFolders.length + ' folders named \'' + yearMonth + '\'. Using the first one found.',
        severity: SEVERITY_LEVELS.WARNING,
        timestamp: new Date().toISOString(),
        details: {
          folderIds: foundFolders.map(f => f.getId()),
          folderNames: foundFolders.map(f => f.getName())
        }
      });
    }
    
    // Use the first folder found
    result.folder = foundFolders[0];
    
    // Validate folder access
    try {
      result.folder.getName(); // Test access
      result.folder.getFiles(); // Test file enumeration capability
    } catch (accessError) {
      result.errors.push({
        type: ERROR_TYPES.FILE_ACCESS,
        source: 'FOLDER_ACCESS_TEST',
        message: 'Cannot access folder \'' + yearMonth + '\': ' + accessError.message,
        severity: SEVERITY_LEVELS.ERROR,
        timestamp: new Date().toISOString()
      });
      result.folder = null;
    }
    
  } catch (error) {
    result.errors.push({
      type: ERROR_TYPES.SYSTEM_FAILURE,
      source: 'DRIVE_API',
      message: 'Failed to search for folder: ' + error.message,
      severity: SEVERITY_LEVELS.CRITICAL,
      timestamp: new Date().toISOString()
    });
  }
  
  return result;
}

/**
 * Enumerates all timesheet files in a given folder
 * @param {DriveApp.Folder} folder - Google Drive folder to search
 * @returns {Object} Result object with files array and any errors
 */
function getTimesheetFiles(folder) {
  const startTime = Date.now();
  const result = {
    files: [],
    errors: [],
    metadata: {
      totalFiles: 0,
      validFiles: 0,
      invalidFiles: 0,
      enumerationTimeMs: 0
    }
  };
  
  try {
    if (!folder) {
      result.errors.push({
        type: ERROR_TYPES.INVALID_ENTRY,
        source: 'INPUT_VALIDATION',
        message: 'No folder provided for file enumeration',
        severity: SEVERITY_LEVELS.ERROR,
        timestamp: new Date().toISOString()
      });
      return result;
    }
    
    // Get all files in the folder
    const files = folder.getFiles();
    const timesheetFiles = [];
    
    while (files.hasNext()) {
      const file = files.next();
      result.metadata.totalFiles++;
      
      try {
        const fileName = file.getName();
        const fileMatch = fileName.match(AGGREGATION_CONFIG.TIMESHEET_FILE_PATTERN);
        
        if (fileMatch) {
          const [, monthYear, memberName] = fileMatch;
          
          // Validate file is accessible
          const fileId = file.getId();
          
          timesheetFiles.push({
            file: file,
            fileName: fileName,
            fileId: fileId,
            memberName: memberName,
            monthYear: monthYear,
            isValid: true
          });
          
          result.metadata.validFiles++;
        } else {
          // File doesn't match timesheet pattern, skip with info
          result.errors.push({
            type: ERROR_TYPES.INVALID_ENTRY,
            source: 'FILE_PATTERN_MATCH',
            message: 'File \'' + fileName + '\' does not match timesheet naming pattern',
            severity: SEVERITY_LEVELS.INFO,
            timestamp: new Date().toISOString(),
            fileName: fileName
          });
          result.metadata.invalidFiles++;
        }
        
      } catch (fileError) {
        result.metadata.invalidFiles++;
        result.errors.push({
          type: ERROR_TYPES.FILE_ACCESS,
          source: 'FILE_ENUMERATION',
          message: 'Cannot access file: ' + fileError.message,
          severity: SEVERITY_LEVELS.WARNING,
          timestamp: new Date().toISOString(),
          fileName: file.getName ? file.getName() : 'Unknown'
        });
      }
    }
    
    result.files = timesheetFiles;
    result.metadata.enumerationTimeMs = Date.now() - startTime;
    
    // Log progress
    console.log('Found ' + result.metadata.validFiles + ' valid timesheet files out of ' + result.metadata.totalFiles + ' total files');
    
  } catch (error) {
    result.errors.push({
      type: ERROR_TYPES.SYSTEM_FAILURE,
      source: 'FILE_ENUMERATION',
      message: 'Failed to enumerate files: ' + error.message,
      severity: SEVERITY_LEVELS.CRITICAL,
      timestamp: new Date().toISOString()
    });
  }
  
  return result;
}

/**
 * Reads timesheet data from a Google Spreadsheet file
 * @param {Object} timesheetFile - File object from getTimesheetFiles
 * @returns {Object} Result object with raw data and any errors
 */
function readTimesheetData(timesheetFile) {
  const startTime = Date.now();
  const result = {
    rawData: [],
    headers: [],
    memberName: timesheetFile.memberName,
    fileName: timesheetFile.fileName,
    errors: [],
    metadata: {
      totalRows: 0,
      dataRows: 0,
      readTimeMs: 0
    }
  };
  
  let retryCount = 0;
  const maxRetries = AGGREGATION_CONFIG.MAX_RETRY_ATTEMPTS;
  
  while (retryCount <= maxRetries) {
    try {
      // Open the spreadsheet
      const spreadsheet = SpreadsheetApp.openById(timesheetFile.fileId);
      const sheet = spreadsheet.getActiveSheet();
      
      // Get all data from the sheet using display values (formatted)
      const dataRange = sheet.getDataRange();
      const allData = dataRange.getDisplayValues();
      
      result.metadata.totalRows = allData.length;
      
      if (allData.length === 0) {
        result.errors.push({
          type: ERROR_TYPES.DATA_CORRUPTION,
          source: 'DATA_EXTRACTION',
          message: 'Spreadsheet is empty: ' + timesheetFile.fileName,
          severity: SEVERITY_LEVELS.ERROR,
          timestamp: new Date().toISOString(),
          fileName: timesheetFile.fileName
        });
        return result;
      }
      
      // Extract headers (first row)
      result.headers = allData[0].map(header => 
        typeof header === 'string' ? header.trim() : String(header).trim()
      );
      
      // Extract data rows (skip header)
      result.rawData = allData.slice(1);
      result.metadata.dataRows = result.rawData.length;
      result.metadata.readTimeMs = Date.now() - startTime;
      
      // Success - break out of retry loop
      break;
      
    } catch (error) {
      retryCount++;
      
      if (retryCount <= maxRetries) {
        // Log retry attempt
        result.errors.push({
          type: ERROR_TYPES.RETRY_ATTEMPT,
          source: 'FILE_READING',
          message: 'Retry ' + retryCount + '/' + maxRetries + ' for file: ' + timesheetFile.fileName + '. Error: ' + error.message,
          severity: SEVERITY_LEVELS.WARNING,
          timestamp: new Date().toISOString(),
          fileName: timesheetFile.fileName
        });
        
        // Wait before retry
        Utilities.sleep(AGGREGATION_CONFIG.RETRY_DELAY_MS);
      } else {
        // Final failure after all retries
        result.errors.push({
          type: ERROR_TYPES.FILE_ACCESS,
          source: 'FILE_READING',
          message: 'Failed to read file after ' + maxRetries + ' attempts: ' + error.message,
          severity: SEVERITY_LEVELS.ERROR,
          timestamp: new Date().toISOString(),
          fileName: timesheetFile.fileName,
          fileId: timesheetFile.fileId
        });
      }
    }
  }
  
  return result;
}

/**
 * Validates a single timesheet entry against expected format and rules
 * @param {Array} entry - Raw row data from spreadsheet
 * @param {string} memberName - Member name for context
 * @param {Array} headers - Column headers for mapping
 * @param {number} rowIndex - Row index for error reporting
 * @returns {Object} Validation result with isValid flag and errors
 */
function validateTimesheetEntry(entry, memberName, headers, rowIndex) {
  const result = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  try {
    // Check for empty entry
    if (!entry || entry.length === 0) {
      result.isValid = false;
      result.errors.push({
        type: ERROR_TYPES.INVALID_ENTRY,
        source: 'ENTRY_VALIDATION',
        message: `Empty row found at index ${rowIndex}`,
        severity: SEVERITY_LEVELS.WARNING,
        timestamp: new Date().toISOString(),
        memberName: memberName,
        rowIndex: rowIndex
      });
      return result;
    }
    
    // Check if all cells are empty
    const hasData = entry.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
    if (!hasData) {
      result.isValid = false;
      result.errors.push({
        type: ERROR_TYPES.INVALID_ENTRY,
        source: 'ENTRY_VALIDATION',
        message: `All cells empty in row ${rowIndex}`,
        severity: SEVERITY_LEVELS.WARNING,
        timestamp: new Date().toISOString(),
        memberName: memberName,
        rowIndex: rowIndex
      });
      return result;
    }
    
    // Map entry to expected columns
    const mappedEntry = mapEntryToColumns(entry, headers);
    
    // Validate required fields
    const requiredFields = ['date', 'from_time', 'to_time', 'project', 'task_type'];
    
    for (const field of requiredFields) {
      const value = mappedEntry[field];
      if (!value || String(value).trim() === '') {
        result.isValid = false;
        result.errors.push({
          type: ERROR_TYPES.INVALID_ENTRY,
          source: 'FIELD_VALIDATION',
          message: `Missing required field '${field}' in row ${rowIndex}`,
          severity: SEVERITY_LEVELS.ERROR,
          timestamp: new Date().toISOString(),
          memberName: memberName,
          rowIndex: rowIndex,
          field: field
        });
      }
    }
    
    // Validate date format
    if (mappedEntry.date) {
      const dateStr = String(mappedEntry.date).trim();
      const isValidDate = AGGREGATION_CONFIG.DATE_FORMAT_PATTERNS.some(pattern => 
        pattern.test(dateStr)
      );
      
      if (!isValidDate) {
        result.isValid = false;
        result.errors.push({
          type: ERROR_TYPES.INVALID_ENTRY,
          source: 'DATE_VALIDATION',
          message: `Invalid date format '${dateStr}' in row ${rowIndex}. Expected YYYY-MM-DD, MM/DD/YYYY, or M/D/YYYY`,
          severity: SEVERITY_LEVELS.ERROR,
          timestamp: new Date().toISOString(),
          memberName: memberName,
          rowIndex: rowIndex,
          field: 'date',
          value: dateStr
        });
      }
    }
    
    // Validate time formats
    const timeFields = ['from_time', 'to_time', 'tc_from_time', 'tc_to_time'];
    for (const timeField of timeFields) {
      const timeValue = mappedEntry[timeField];
      if (timeValue && String(timeValue).trim() !== '') {
        const timeStr = String(timeValue).trim();
        const isValidTime = AGGREGATION_CONFIG.TIME_FORMAT_PATTERNS.some(pattern => 
          pattern.test(timeStr)
        );
        
        if (!isValidTime) {
          if (timeField === 'from_time' || timeField === 'to_time') {
            result.isValid = false;
            result.errors.push({
              type: ERROR_TYPES.INVALID_ENTRY,
              source: 'TIME_VALIDATION',
              message: `Invalid time format '${timeStr}' in ${timeField} for row ${rowIndex}. Expected HH:MM, HH:MM:SS, or HH.MM`,
              severity: SEVERITY_LEVELS.ERROR,
              timestamp: new Date().toISOString(),
              memberName: memberName,
              rowIndex: rowIndex,
              field: timeField,
              value: timeStr
            });
          } else {
            // TC times are optional, just warn
            result.warnings.push({
              type: ERROR_TYPES.INVALID_ENTRY,
              source: 'TIME_VALIDATION',
              message: `Invalid time format '${timeStr}' in ${timeField} for row ${rowIndex}`,
              severity: SEVERITY_LEVELS.WARNING,
              timestamp: new Date().toISOString(),
              memberName: memberName,
              rowIndex: rowIndex,
              field: timeField,
              value: timeStr
            });
          }
        }
      }
    }
    
    // Validate time logic (from_time < to_time)
    if (mappedEntry.from_time && mappedEntry.to_time) {
      const fromTime = parseTimeToMinutes(String(mappedEntry.from_time).trim());
      const toTime = parseTimeToMinutes(String(mappedEntry.to_time).trim());
      
      if (fromTime !== null && toTime !== null && fromTime >= toTime) {
        result.warnings.push({
          type: ERROR_TYPES.INVALID_ENTRY,
          source: 'TIME_LOGIC_VALIDATION',
          message: `From time (${mappedEntry.from_time}) should be before to time (${mappedEntry.to_time}) in row ${rowIndex}`,
          severity: SEVERITY_LEVELS.WARNING,
          timestamp: new Date().toISOString(),
          memberName: memberName,
          rowIndex: rowIndex
        });
      }
    }
    
  } catch (error) {
    result.isValid = false;
    result.errors.push({
      type: ERROR_TYPES.SYSTEM_FAILURE,
      source: 'ENTRY_VALIDATION',
      message: `Validation error for row ${rowIndex}: ${error.message}`,
      severity: SEVERITY_LEVELS.ERROR,
      timestamp: new Date().toISOString(),
      memberName: memberName,
      rowIndex: rowIndex
    });
  }
  
  return result;
}

/**
 * Maps a raw entry array to expected column structure
 * @param {Array} entry - Raw row data
 * @param {Array} headers - Column headers
 * @returns {Object} Mapped entry object
 */
function mapEntryToColumns(entry, headers) {
  const mapped = {
    date: '',
    from_time: '',
    to_time: '',
    project: '',
    task_type: '',
    description: '',
    tc_from_time: '',
    tc_to_time: ''
  };
  
  // Map each header to expected fields
  headers.forEach(function(header, index) {
    if (index >= entry.length) return;
    
    const headerLower = String(header).toLowerCase().trim();
    const value = entry[index];
    
    // Map headers to standard fields
    for (const [fieldName, patterns] of Object.entries(AGGREGATION_CONFIG.EXPECTED_HEADERS)) {
      if (patterns.some(function(pattern) { return headerLower.includes(pattern.toLowerCase()); })) {
        const mappedFieldName = fieldName.toLowerCase().replace(/_/g, '_');
        if (fieldName === 'DATE') mapped.date = value;
        else if (fieldName === 'FROM_TIME') mapped.from_time = value;
        else if (fieldName === 'TO_TIME') mapped.to_time = value;
        else if (fieldName === 'PROJECT') mapped.project = value;
        else if (fieldName === 'TASK_TYPE') mapped.task_type = value;
        else if (fieldName === 'DESCRIPTION') mapped.description = value;
        else if (fieldName === 'TC_FROM_TIME') mapped.tc_from_time = value;
        else if (fieldName === 'TC_TO_TIME') mapped.tc_to_time = value;
        break;
      }
    }
  });
  
  return mapped;
}

/**
 * Parses time string to minutes for comparison
 * @param {string} timeStr - Time string in various formats (including display values)
 * @returns {number|null} Minutes since midnight, or null if invalid
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  
  let timeString = String(timeStr).trim();
  
  // Handle AM/PM format (from display values)
  const ampmMatch = timeString.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const ampm = ampmMatch[4].toUpperCase();
    
    // Convert to 24-hour format
    if (ampm === 'PM' && hours !== 12) {
      hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return hours * 60 + minutes;
  }
  
  // Handle HH:MM or HH:MM:SS format
  const timeMatch = timeString.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    return hours * 60 + minutes;
  }
  
  // Handle HH.MM format
  const decimalMatch = timeString.match(/^(\d{1,2})\.(\d{2})$/);
  if (decimalMatch) {
    const hours = parseInt(decimalMatch[1], 10);
    const minutes = parseInt(decimalMatch[2], 10);
    return hours * 60 + minutes;
  }
  
  return null;
}

/**
 * Normalizes a validated timesheet entry to standard format
 * @param {Array} entry - Raw row data from spreadsheet
 * @param {string} memberName - Member name for the entry
 * @param {Array} headers - Column headers for mapping
 * @param {number} rowIndex - Row index for context
 * @returns {Object} Normalized entry object
 */
function normalizeTimesheetEntry(entry, memberName, headers, rowIndex) {
  try {
    // Map entry to expected columns
    const mappedEntry = mapEntryToColumns(entry, headers);
    
    // Create normalized entry
    const normalized = {
      member: memberName,
      date: normalizeDate(mappedEntry.date),
      from_time: normalizeTime(mappedEntry.from_time),
      to_time: normalizeTime(mappedEntry.to_time),
      project: normalizeText(mappedEntry.project),
      task_type: normalizeText(mappedEntry.task_type),
      description: normalizeText(mappedEntry.description),
      tc_from_time: normalizeTime(mappedEntry.tc_from_time) || '',
      tc_to_time: normalizeTime(mappedEntry.tc_to_time) || '',
      
      // Metadata
      source_file: memberName,
      row_index: rowIndex,
      processed_at: new Date().toISOString()
    };
    
    return normalized;
    
  } catch (error) {
    console.error(`Error normalizing entry for ${memberName} row ${rowIndex}:`, error);
    
    // Return a basic normalized entry with error info
    return {
      member: memberName,
      date: '',
      from_time: '',
      to_time: '',
      project: '',
      task_type: '',
      description: `ERROR: ${error.message}`,
      tc_from_time: '',
      tc_to_time: '',
      source_file: memberName,
      row_index: rowIndex,
      processed_at: new Date().toISOString(),
      normalization_error: true
    };
  }
}

/**
 * Normalizes date to YYYY-MM-DD format
 * @param {*} dateValue - Date value in various formats
 * @returns {string} Normalized date string
 */
function normalizeDate(dateValue) {
  if (!dateValue) return '';
  
  let dateStr = String(dateValue).trim();
  
  // If it's already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Handle MM/DD/YYYY format
  const mmddyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyyMatch) {
    const month = mmddyyyyMatch[1].padStart(2, '0');
    const day = mmddyyyyMatch[2].padStart(2, '0');
    const year = mmddyyyyMatch[3];
    return `${year}-${month}-${day}`;
  }
  
  // Handle Date objects (from spreadsheet)
  if (dateValue instanceof Date) {
    const year = dateValue.getFullYear();
    const month = (dateValue.getMonth() + 1).toString().padStart(2, '0');
    const day = dateValue.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Try to parse as Date
  try {
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear();
      const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
      const day = parsedDate.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    // Fall through to return original
  }
  
  // Return original if can't normalize
  return dateStr;
}

/**
 * Normalizes time to HH:MM format (24-hour)
 * @param {*} timeValue - Time value in various formats (including display values)
 * @returns {string} Normalized time string
 */
function normalizeTime(timeValue) {
  if (!timeValue) return '';
  
  let timeStr = String(timeValue).trim();
  
  // Handle AM/PM format (from display values)
  const ampmMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const ampm = ampmMatch[4].toUpperCase();
    
    // Convert to 24-hour format
    if (ampm === 'PM' && hours !== 12) {
      hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return hours.toString().padStart(2, '0') + ':' + minutes;
  }
  
  // Handle HH:MM format (already normalized)
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [hours, minutes] = timeStr.split(':');
    return hours.padStart(2, '0') + ':' + minutes;
  }
  
  // Handle HH:MM:SS format
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(timeStr)) {
    const [hours, minutes] = timeStr.split(':');
    return hours.padStart(2, '0') + ':' + minutes;
  }
  
  // Handle HH.MM format
  const decimalMatch = timeStr.match(/^(\d{1,2})\.(\d{2})$/);
  if (decimalMatch) {
    const hours = decimalMatch[1].padStart(2, '0');
    const minutes = decimalMatch[2];
    return hours + ':' + minutes;
  }
  
  // Handle decimal hours (e.g., 8.5 = 8:30)
  const decimalHours = parseFloat(timeStr);
  if (!isNaN(decimalHours) && decimalHours >= 0 && decimalHours <= 24) {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0');
  }
  
  // Return original if can't normalize
  return timeStr;
}

/**
 * Normalizes text fields (trim, clean up)
 * @param {*} textValue - Text value to normalize
 * @returns {string} Normalized text string
 */
function normalizeText(textValue) {
  if (!textValue) return '';
  
  return String(textValue)
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .substring(0, 500); // Limit length to prevent memory issues
}

/**
 * Processes a single timesheet file from reading to normalized entries
 * @param {Object} timesheetFile - File object from getTimesheetFiles
 * @returns {Object} Processing result with entries and errors
 */
function processTimesheetFile(timesheetFile) {
  const startTime = Date.now();
  const result = {
    memberName: timesheetFile.memberName,
    fileName: timesheetFile.fileName,
    entries: [],
    errors: [],
    metadata: {
      processingTimeMs: 0,
      totalRows: 0,
      validEntries: 0,
      invalidEntries: 0,
      normalizedEntries: 0
    }
  };
  
  try {
    // Step 1: Read the file data
    const readResult = readTimesheetData(timesheetFile);
    result.errors.push(...readResult.errors);
    result.metadata.totalRows = readResult.metadata.totalRows;
    
    if (readResult.errors.some(error => error.severity === SEVERITY_LEVELS.ERROR || error.severity === SEVERITY_LEVELS.CRITICAL)) {
      // Critical errors prevent processing
      result.metadata.processingTimeMs = Date.now() - startTime;
      return result;
    }
    
    // Step 2: Validate headers
    const headerValidation = validateHeaders(readResult.headers, timesheetFile);
    result.errors.push(...headerValidation.errors);
    
    if (!headerValidation.isValid) {
      // Invalid headers prevent processing
      result.metadata.processingTimeMs = Date.now() - startTime;
      return result;
    }
    
    // Step 3: Process each data row
    readResult.rawData.forEach(function(row, index) {
      const rowIndex = index + 2; // +2 because: +1 for array index, +1 for header row
      
      // Validate the entry
      const validation = validateTimesheetEntry(row, timesheetFile.memberName, readResult.headers, rowIndex);
      
      // Add validation errors/warnings to result
      result.errors.push(...validation.errors);
      result.errors.push(...validation.warnings);
      
      if (validation.isValid) {
        // Normalize the valid entry
        const normalized = normalizeTimesheetEntry(row, timesheetFile.memberName, readResult.headers, rowIndex);
        result.entries.push(normalized);
        result.metadata.validEntries++;
        result.metadata.normalizedEntries++;
      } else {
        result.metadata.invalidEntries++;
      }
    });
    
    result.metadata.processingTimeMs = Date.now() - startTime;
    
    // Log processing summary
    console.log(`Processed ${timesheetFile.fileName}: ${result.metadata.validEntries} valid entries, ${result.metadata.invalidEntries} invalid entries`);
    
  } catch (error) {
    result.errors.push({
      type: ERROR_TYPES.SYSTEM_FAILURE,
      source: 'FILE_PROCESSING',
      message: `Failed to process file ${timesheetFile.fileName}: ${error.message}`,
      severity: SEVERITY_LEVELS.CRITICAL,
      timestamp: new Date().toISOString(),
      fileName: timesheetFile.fileName
    });
    result.metadata.processingTimeMs = Date.now() - startTime;
  }
  
  return result;
}

/**
 * Validates that spreadsheet headers contain expected columns
 * @param {Array} headers - Column headers from spreadsheet
 * @param {Object} timesheetFile - File context for error reporting
 * @returns {Object} Validation result
 */
function validateHeaders(headers, timesheetFile) {
  const result = {
    isValid: true,
    errors: [],
    mappedHeaders: {}
  };
  
  if (!headers || headers.length === 0) {
    result.isValid = false;
    result.errors.push({
      type: ERROR_TYPES.INVALID_HEADER,
      source: 'HEADER_VALIDATION',
      message: `No headers found in file: ${timesheetFile.fileName}`,
      severity: SEVERITY_LEVELS.ERROR,
      timestamp: new Date().toISOString(),
      fileName: timesheetFile.fileName
    });
    return result;
  }
  
  // Check for required headers
  const requiredFields = ['DATE', 'FROM_TIME', 'TO_TIME', 'PROJECT', 'TASK_TYPE'];
  const foundFields = [];
  
  for (const requiredField of requiredFields) {
    const patterns = AGGREGATION_CONFIG.EXPECTED_HEADERS[requiredField];
    let found = false;
    
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i]).toLowerCase().trim();
      if (patterns.some(pattern => header.includes(pattern.toLowerCase()))) {
        foundFields.push(requiredField);
        result.mappedHeaders[requiredField] = i;
        found = true;
        break;
      }
    }
    
    if (!found) {
      result.isValid = false;
      result.errors.push({
        type: ERROR_TYPES.INVALID_HEADER,
        source: 'HEADER_VALIDATION',
        message: `Missing required header for field '${requiredField}' in file: ${timesheetFile.fileName}. Expected one of: ${patterns.join(', ')}`,
        severity: SEVERITY_LEVELS.ERROR,
        timestamp: new Date().toISOString(),
        fileName: timesheetFile.fileName,
        requiredField: requiredField,
        expectedPatterns: patterns
      });
    }
  }
  
  // Log successful header mapping
  if (result.isValid) {
    console.log(`Header validation passed for ${timesheetFile.fileName}. Found: ${foundFields.join(', ')}`);
  }
  
  return result;
}

/**
 * Main aggregation function that orchestrates the entire timesheet aggregation process
 * @param {string} monthFolder - Month in YYYY-MM format (e.g., "2025-09")
 * @returns {Object} Complete aggregation result with entries, metadata, and errors
 */
function aggregateMonthlyTimesheets(monthFolder) {
  const startTime = Date.now();
  const result = {
    entries: [],
    metadata: {
      processedAt: new Date().toISOString(),
      monthFolder: monthFolder,
      totalFiles: 0,
      successfulFiles: 0,
      totalEntries: 0,
      processingTimeMs: 0,
      systemHealthy: true,
      batchProcessing: {
        batchSize: AGGREGATION_CONFIG.BATCH_SIZE,
        totalBatches: 0
      },
      performanceMetrics: {
        totalProcessingTimeMs: 0,
        fileDiscoveryTimeMs: 0,
        dataExtractionTimeMs: 0,
        dataValidationTimeMs: 0,
        aggregationTimeMs: 0
      }
    },
    errors: []
  };
  
  try {
    console.log(`Starting timesheet aggregation for month: ${monthFolder}`);
    
    // Step 1: Discover monthly folder
    const folderResult = getMonthlyFolder(monthFolder);
    result.errors.push(...folderResult.errors);
    result.metadata.performanceMetrics.fileDiscoveryTimeMs = folderResult.metadata.searchTimeMs;
    
    if (!folderResult.folder) {
      result.metadata.systemHealthy = false;
      result.metadata.processingTimeMs = Date.now() - startTime;
      return result;
    }
    
    // Step 2: Enumerate timesheet files
    const filesResult = getTimesheetFiles(folderResult.folder);
    result.errors.push(...filesResult.errors);
    result.metadata.totalFiles = filesResult.metadata.validFiles;
    
    if (filesResult.files.length === 0) {
      result.errors.push({
        type: ERROR_TYPES.FOLDER_NOT_FOUND,
        source: 'FILE_ENUMERATION',
        message: `No valid timesheet files found in folder '${monthFolder}'`,
        severity: SEVERITY_LEVELS.WARNING,
        timestamp: new Date().toISOString()
      });
      result.metadata.processingTimeMs = Date.now() - startTime;
      return result;
    }
    
    // Step 3: Process files in batches to manage memory and execution time
    const files = filesResult.files;
    const batchSize = AGGREGATION_CONFIG.BATCH_SIZE;
    const totalBatches = Math.ceil(files.length / batchSize);
    result.metadata.batchProcessing.totalBatches = totalBatches;
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, files.length);
      const batch = files.slice(batchStart, batchEnd);
      
      console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} files)`);
      
      // Check execution time to avoid timeout
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;
      
      if (elapsedTime > AGGREGATION_CONFIG.MAX_EXECUTION_TIME_MS) {
        result.errors.push({
          type: ERROR_TYPES.TIMEOUT_WARNING,
          source: 'EXECUTION_CONTROL',
          message: `Approaching execution time limit. Processed ${batchIndex * batchSize} files out of ${files.length}`,
          severity: SEVERITY_LEVELS.WARNING,
          timestamp: new Date().toISOString()
        });
        break;
      }
      
      // Process batch
      for (const file of batch) {
        try {
          const processingResult = processTimesheetFile(file);
          
          // Collect results
          result.entries.push(...processingResult.entries);
          result.errors.push(...processingResult.errors);
          
          // Update metadata
          if (processingResult.entries.length > 0) {
            result.metadata.successfulFiles++;
          }
          result.metadata.totalEntries += processingResult.entries.length;
          
          // Progress reporting
          if ((result.metadata.successfulFiles % AGGREGATION_CONFIG.CHECKPOINT_INTERVAL) === 0) {
            console.log(`Progress: ${result.metadata.successfulFiles}/${result.metadata.totalFiles} files processed`);
          }
          
        } catch (fileError) {
          result.errors.push({
            type: ERROR_TYPES.SYSTEM_FAILURE,
            source: 'BATCH_PROCESSING',
            message: `Failed to process file ${file.fileName}: ${fileError.message}`,
            severity: SEVERITY_LEVELS.ERROR,
            timestamp: new Date().toISOString(),
            fileName: file.fileName
          });
        }
      }
    }
    
    // Step 4: Post-processing and optimization
    result.entries = removeDuplicateEntries(result.entries);
    
    // Step 5: Generate final metadata
    result.metadata.processingTimeMs = Date.now() - startTime;
    result.metadata.performanceMetrics.totalProcessingTimeMs = result.metadata.processingTimeMs;
    
    // Generate error summary
    result.metadata.errorSummary = generateErrorSummary(result.errors);
    
    // Performance metrics
    result.metadata.throughputMetrics = {
      filesPerSecond: result.metadata.totalFiles / (result.metadata.processingTimeMs / 1000),
      entriesPerSecond: result.metadata.totalEntries / (result.metadata.processingTimeMs / 1000)
    };
    
    console.log(`Aggregation complete: ${result.metadata.totalEntries} entries from ${result.metadata.successfulFiles} files in ${result.metadata.processingTimeMs}ms`);
    
  } catch (error) {
    result.metadata.systemHealthy = false;
    result.errors.push({
      type: ERROR_TYPES.SYSTEM_FAILURE,
      source: 'MAIN_AGGREGATION',
      message: `Critical failure in aggregation process: ${error.message}`,
      severity: SEVERITY_LEVELS.CRITICAL,
      timestamp: new Date().toISOString()
    });
    result.metadata.processingTimeMs = Date.now() - startTime;
  }
  
  return result;
}

/**
 * Removes duplicate entries from the aggregated dataset
 * @param {Array} entries - Array of normalized entries
 * @returns {Array} Deduplicated entries
 */
function removeDuplicateEntries(entries) {
  const seen = new Set();
  const deduplicated = [];
  
  for (const entry of entries) {
    // Create a hash key from critical fields
    const hashKey = `${entry.member}|${entry.date}|${entry.from_time}|${entry.to_time}|${entry.project}|${entry.task_type}`;
    
    if (!seen.has(hashKey)) {
      seen.add(hashKey);
      deduplicated.push(entry);
    }
  }
  
  return deduplicated;
}

/**
 * Generates error summary statistics
 * @param {Array} errors - Array of error objects
 * @returns {Object} Error summary
 */
function generateErrorSummary(errors) {
  const summary = {
    totalErrors: errors.length,
    errorsByType: {},
    errorsBySeverity: {},
    criticalErrors: 0
  };
  
  for (const error of errors) {
    // Count by type
    summary.errorsByType[error.type] = (summary.errorsByType[error.type] || 0) + 1;
    
    // Count by severity
    summary.errorsBySeverity[error.severity] = (summary.errorsBySeverity[error.severity] || 0) + 1;
    
    // Count critical errors
    if (error.severity === SEVERITY_LEVELS.CRITICAL) {
      summary.criticalErrors++;
    }
  }
  
  return summary;
}

// ============================================================================
// GOOGLE DRIVE API INTEGRATION
// ============================================================================

/**
 * Enhanced Google Drive API integration with comprehensive error handling
 * Provides robust file and folder operations with retry logic and detailed error reporting
 */
const DriveAPIIntegration = {
  
  /**
   * Enhanced folder search with advanced filtering and error handling
   * @param {string} folderName - Name of folder to search for
   * @param {Object} options - Search options
   * @returns {Object} Search result with folders and detailed error information
   */
  searchFolders: function(folderName, options = {}) {
    const startTime = Date.now();
    const result = {
      folders: [],
      errors: [],
      metadata: {
        searchQuery: folderName,
        searchTimeMs: 0,
        totalFound: 0,
        accessibleFolders: 0
      }
    };
    
    try {
      // Build search query with options
      let searchQuery = `title contains '${folderName}' and mimeType = 'application/vnd.google-apps.folder'`;
      
      if (options.exactMatch) {
        searchQuery = `title = '${folderName}' and mimeType = 'application/vnd.google-apps.folder'`;
      }
      
      if (options.parentFolderId) {
        searchQuery += ` and '${options.parentFolderId}' in parents`;
      }
      
      // Perform search with retry logic
      let attempts = 0;
      const maxAttempts = AGGREGATION_CONFIG.MAX_RETRY_ATTEMPTS;
      
      while (attempts < maxAttempts) {
        try {
          const folders = DriveApp.getFoldersByName(folderName);
          const foundFolders = [];
          
          while (folders.hasNext()) {
            const folder = folders.next();
            
            // Test folder accessibility
            try {
              folder.getName(); // Test basic access
              folder.getFiles(); // Test enumeration capability
              
              foundFolders.push({
                folder: folder,
                id: folder.getId(),
                name: folder.getName(),
                url: folder.getUrl(),
                lastModified: folder.getLastUpdated(),
                isAccessible: true
              });
              
              result.metadata.accessibleFolders++;
              
            } catch (accessError) {
              foundFolders.push({
                folder: null,
                id: folder.getId(),
                name: folder.getName(),
                url: null,
                isAccessible: false,
                accessError: accessError.message
              });
              
              result.errors.push({
                type: ERROR_TYPES.FILE_ACCESS,
                source: 'DRIVE_API_FOLDER_ACCESS',
                message: `Cannot access folder '${folder.getName()}': ${accessError.message}`,
                severity: SEVERITY_LEVELS.WARNING,
                timestamp: new Date().toISOString(),
                folderId: folder.getId()
              });
            }
          }
          
          result.folders = foundFolders;
          result.metadata.totalFound = foundFolders.length;
          break; // Success, exit retry loop
          
        } catch (searchError) {
          attempts++;
          
          if (attempts < maxAttempts) {
            result.errors.push({
              type: ERROR_TYPES.RETRY_ATTEMPT,
              source: 'DRIVE_API_FOLDER_SEARCH',
              message: `Search attempt ${attempts}/${maxAttempts} failed: ${searchError.message}`,
              severity: SEVERITY_LEVELS.WARNING,
              timestamp: new Date().toISOString()
            });
            
            Utilities.sleep(AGGREGATION_CONFIG.RETRY_DELAY_MS);
          } else {
            throw searchError; // Final attempt failed
          }
        }
      }
      
      result.metadata.searchTimeMs = Date.now() - startTime;
      
    } catch (error) {
      result.errors.push({
        type: ERROR_TYPES.SYSTEM_FAILURE,
        source: 'DRIVE_API_FOLDER_SEARCH',
        message: `Drive API folder search failed: ${error.message}`,
        severity: SEVERITY_LEVELS.CRITICAL,
        timestamp: new Date().toISOString()
      });
      result.metadata.searchTimeMs = Date.now() - startTime;
    }
    
    return result;
  },
  
  /**
   * Enhanced file enumeration with filtering and batch processing
   * @param {DriveApp.Folder} folder - Folder to enumerate
   * @param {Object} options - Enumeration options
   * @returns {Object} Enumeration result with files and metadata
   */
  enumerateFiles: function(folder, options = {}) {
    const startTime = Date.now();
    const result = {
      files: [],
      errors: [],
      metadata: {
        totalFiles: 0,
        processedFiles: 0,
        skippedFiles: 0,
        enumerationTimeMs: 0,
        batchInfo: {
          batchSize: options.batchSize || 50,
          totalBatches: 0,
          currentBatch: 0
        }
      }
    };
    
    try {
      if (!folder) {
        result.errors.push({
          type: ERROR_TYPES.INVALID_ENTRY,
          source: 'DRIVE_API_FILE_ENUMERATION',
          message: 'No folder provided for file enumeration',
          severity: SEVERITY_LEVELS.ERROR,
          timestamp: new Date().toISOString()
        });
        return result;
      }
      
      // Get all files with error handling
      const files = folder.getFiles();
      const filesList = [];
      
      // Collect all files first
      while (files.hasNext()) {
        try {
          const file = files.next();
          filesList.push(file);
          result.metadata.totalFiles++;
        } catch (fileError) {
          result.errors.push({
            type: ERROR_TYPES.FILE_ACCESS,
            source: 'DRIVE_API_FILE_ENUMERATION',
            message: `Error accessing file: ${fileError.message}`,
            severity: SEVERITY_LEVELS.WARNING,
            timestamp: new Date().toISOString()
          });
          result.metadata.skippedFiles++;
        }
      }
      
      // Process files in batches
      const batchSize = result.metadata.batchInfo.batchSize;
      result.metadata.batchInfo.totalBatches = Math.ceil(filesList.length / batchSize);
      
      for (let i = 0; i < filesList.length; i += batchSize) {
        result.metadata.batchInfo.currentBatch = Math.floor(i / batchSize) + 1;
        const batch = filesList.slice(i, i + batchSize);
        
        for (const file of batch) {
          try {
            const fileInfo = {
              file: file,
              id: file.getId(),
              name: file.getName(),
              mimeType: file.getBlob().getContentType(),
              size: file.getSize(),
              lastModified: file.getLastUpdated(),
              url: file.getUrl(),
              isAccessible: true
            };
            
            // Apply filters if specified
            if (options.namePattern && !options.namePattern.test(fileInfo.name)) {
              result.metadata.skippedFiles++;
              continue;
            }
            
            if (options.mimeTypeFilter && !options.mimeTypeFilter.includes(fileInfo.mimeType)) {
              result.metadata.skippedFiles++;
              continue;
            }
            
            result.files.push(fileInfo);
            result.metadata.processedFiles++;
            
          } catch (fileInfoError) {
            result.errors.push({
              type: ERROR_TYPES.FILE_ACCESS,
              source: 'DRIVE_API_FILE_INFO',
              message: `Cannot get file information: ${fileInfoError.message}`,
              severity: SEVERITY_LEVELS.WARNING,
              timestamp: new Date().toISOString(),
              fileName: file.getName ? file.getName() : 'Unknown'
            });
            result.metadata.skippedFiles++;
          }
        }
        
        // Progress checkpoint
        if (result.metadata.batchInfo.currentBatch % 5 === 0) {
          console.log(`File enumeration progress: batch ${result.metadata.batchInfo.currentBatch}/${result.metadata.batchInfo.totalBatches}`);
        }
      }
      
      result.metadata.enumerationTimeMs = Date.now() - startTime;
      
    } catch (error) {
      result.errors.push({
        type: ERROR_TYPES.SYSTEM_FAILURE,
        source: 'DRIVE_API_FILE_ENUMERATION',
        message: `File enumeration failed: ${error.message}`,
        severity: SEVERITY_LEVELS.CRITICAL,
        timestamp: new Date().toISOString()
      });
      result.metadata.enumerationTimeMs = Date.now() - startTime;
    }
    
    return result;
  },
  
  /**
   * Test Drive API connectivity and permissions
   * @returns {Object} Connectivity test result
   */
  testConnectivity: function() {
    const result = {
      isConnected: false,
      permissions: {
        canListFiles: false,
        canReadFiles: false,
        canAccessFolders: false
      },
      errors: []
    };
    
    try {
      // Test basic Drive access
      const rootFolder = DriveApp.getRootFolder();
      result.permissions.canAccessFolders = true;
      
      // Test file listing
      const files = rootFolder.getFiles();
      result.permissions.canListFiles = true;
      
      // Test file reading (if any files exist)
      if (files.hasNext()) {
        const testFile = files.next();
        testFile.getName(); // Test basic file access
        result.permissions.canReadFiles = true;
      }
      
      result.isConnected = true;
      
    } catch (error) {
      result.errors.push({
        type: ERROR_TYPES.SYSTEM_FAILURE,
        source: 'DRIVE_API_CONNECTIVITY',
        message: `Drive API connectivity test failed: ${error.message}`,
        severity: SEVERITY_LEVELS.CRITICAL,
        timestamp: new Date().toISOString()
      });
    }
    
    return result;
  }
};

// ============================================================================
// GOOGLE SHEETS API INTEGRATION
// ============================================================================

/**
 * Enhanced Google Sheets API integration with intelligent column detection
 * Provides robust spreadsheet operations with advanced header mapping and data extraction
 */
const SheetsAPIIntegration = {
  
  /**
   * Intelligent column detection and header mapping
   * @param {Array} headers - Raw header array from spreadsheet
   * @param {Object} options - Detection options
   * @returns {Object} Column mapping result
   */
  detectColumns: function(headers, options = {}) {
    const result = {
      columnMap: {},
      unmappedColumns: [],
      confidence: 0,
      errors: [],
      metadata: {
        totalColumns: headers.length,
        mappedColumns: 0,
        confidenceScore: 0
      }
    };
    
    try {
      if (!headers || headers.length === 0) {
        result.errors.push({
          type: ERROR_TYPES.INVALID_HEADER,
          source: 'SHEETS_API_COLUMN_DETECTION',
          message: 'No headers provided for column detection',
          severity: SEVERITY_LEVELS.ERROR,
          timestamp: new Date().toISOString()
        });
        return result;
      }
      
      // Normalize headers for matching
      const normalizedHeaders = headers.map((header, index) => ({
        original: header,
        normalized: String(header).toLowerCase().trim().replace(/[^a-z0-9\s]/g, ''),
        index: index
      }));
      
      // Advanced pattern matching for each expected field
      const fieldMatchers = {
        date: {
          patterns: ['date', 'day', 'datum', 'fecha', 'data'],
          secondaryPatterns: ['when', 'time', 'period'],
          weight: 10
        },
        from_time: {
          patterns: ['from time', 'start time', 'from', 'start', 'begin'],
          secondaryPatterns: ['in', 'clock in', 'arrival'],
          weight: 9
        },
        to_time: {
          patterns: ['to time', 'end time', 'to', 'end', 'finish'],
          secondaryPatterns: ['out', 'clock out', 'departure'],
          weight: 9
        },
        project: {
          patterns: ['project', 'proj', 'client', 'customer'],
          secondaryPatterns: ['work', 'assignment', 'job'],
          weight: 8
        },
        task_type: {
          patterns: ['task type', 'task', 'type', 'activity', 'category'],
          secondaryPatterns: ['kind', 'classification', 'work type'],
          weight: 7
        },
        description: {
          patterns: ['description', 'desc', 'details', 'notes'],
          secondaryPatterns: ['comment', 'remarks', 'summary'],
          weight: 6
        },
        tc_from_time: {
          patterns: ['tc from time', 'timecard from', 'tc start', 'tc in'],
          secondaryPatterns: ['corrected from', 'adjusted start'],
          weight: 5
        },
        tc_to_time: {
          patterns: ['tc to time', 'timecard to', 'tc end', 'tc out'],
          secondaryPatterns: ['corrected to', 'adjusted end'],
          weight: 5
        }
      };
      
      // Score each header against each field
      for (const [fieldName, matcher] of Object.entries(fieldMatchers)) {
        let bestMatch = null;
        let bestScore = 0;
        
        for (const headerInfo of normalizedHeaders) {
          let score = 0;
          
          // Primary pattern matching
          for (const pattern of matcher.patterns) {
            if (headerInfo.normalized.includes(pattern)) {
              score += matcher.weight;
            }
            // Exact match bonus
            if (headerInfo.normalized === pattern) {
              score += matcher.weight * 0.5;
            }
          }
          
          // Secondary pattern matching (lower weight)
          for (const pattern of matcher.secondaryPatterns) {
            if (headerInfo.normalized.includes(pattern)) {
              score += matcher.weight * 0.3;
            }
          }
          
          // Position-based scoring (date typically first, times next, etc.)
          const expectedPositions = {
            date: [0, 1],
            from_time: [1, 2, 3],
            to_time: [2, 3, 4],
            project: [3, 4, 5, 6],
            task_type: [4, 5, 6, 7],
            description: [5, 6, 7, 8, 9]
          };
          
          if (expectedPositions[fieldName] && expectedPositions[fieldName].includes(headerInfo.index)) {
            score += 1;
          }
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = headerInfo;
          }
        }
        
        // Accept match if score is above threshold
        const threshold = matcher.weight * 0.6;
        if (bestMatch && bestScore >= threshold) {
          result.columnMap[fieldName] = {
            index: bestMatch.index,
            header: bestMatch.original,
            confidence: Math.min(bestScore / matcher.weight, 1.0)
          };
          result.metadata.mappedColumns++;
        }
      }
      
      // Identify unmapped columns
      const mappedIndices = Object.values(result.columnMap).map(col => col.index);
      result.unmappedColumns = normalizedHeaders
        .filter(header => !mappedIndices.includes(header.index))
        .map(header => ({
          index: header.index,
          header: header.original
        }));
      
      // Calculate overall confidence
      const totalPossibleScore = Object.values(fieldMatchers).reduce((sum, matcher) => sum + matcher.weight, 0);
      const actualScore = Object.values(result.columnMap).reduce((sum, col) => sum + col.confidence * 10, 0);
      result.metadata.confidenceScore = Math.min(actualScore / totalPossibleScore, 1.0);
      result.confidence = result.metadata.confidenceScore;
      
      // Generate warnings for low confidence mappings
      for (const [fieldName, mapping] of Object.entries(result.columnMap)) {
        if (mapping.confidence < 0.7) {
          result.errors.push({
            type: ERROR_TYPES.INVALID_HEADER,
            source: 'SHEETS_API_COLUMN_DETECTION',
            message: `Low confidence mapping for ${fieldName}: "${mapping.header}" (confidence: ${Math.round(mapping.confidence * 100)}%)`,
            severity: SEVERITY_LEVELS.WARNING,
            timestamp: new Date().toISOString(),
            fieldName: fieldName,
            mappedHeader: mapping.header,
            confidence: mapping.confidence
          });
        }
      }
      
    } catch (error) {
      result.errors.push({
        type: ERROR_TYPES.SYSTEM_FAILURE,
        source: 'SHEETS_API_COLUMN_DETECTION',
        message: `Column detection failed: ${error.message}`,
        severity: SEVERITY_LEVELS.CRITICAL,
        timestamp: new Date().toISOString()
      });
    }
    
    return result;
  },
  
  /**
   * Enhanced spreadsheet data extraction with intelligent parsing
   * @param {string} fileId - Google Sheets file ID
   * @param {Object} options - Extraction options
   * @returns {Object} Data extraction result
   */
  extractData: function(fileId, options = {}) {
    const startTime = Date.now();
    const result = {
      data: [],
      headers: [],
      columnMap: {},
      metadata: {
        totalRows: 0,
        dataRows: 0,
        extractionTimeMs: 0,
        sheetName: '',
        fileId: fileId
      },
      errors: []
    };
    
    let retryCount = 0;
    const maxRetries = AGGREGATION_CONFIG.MAX_RETRY_ATTEMPTS;
    
    while (retryCount <= maxRetries) {
      try {
        // Open spreadsheet with error handling
        const spreadsheet = SpreadsheetApp.openById(fileId);
        
        // Select sheet (active sheet or specified sheet)
        let sheet;
        if (options.sheetName) {
          sheet = spreadsheet.getSheetByName(options.sheetName);
          if (!sheet) {
            throw new Error(`Sheet '${options.sheetName}' not found`);
          }
        } else {
          sheet = spreadsheet.getActiveSheet();
        }
        
        result.metadata.sheetName = sheet.getName();
        
        // Get data range with optimization
        const dataRange = sheet.getDataRange();
        const numRows = dataRange.getNumRows();
        const numCols = dataRange.getNumColumns();
        
        if (numRows === 0) {
          result.errors.push({
            type: ERROR_TYPES.DATA_CORRUPTION,
            source: 'SHEETS_API_DATA_EXTRACTION',
            message: `Spreadsheet is empty: ${fileId}`,
            severity: SEVERITY_LEVELS.WARNING,
            timestamp: new Date().toISOString(),
            fileId: fileId
          });
          return result;
        }
        
        // Extract data efficiently using display values (formatted)
        const allData = dataRange.getDisplayValues();
        result.metadata.totalRows = allData.length;
        
        // Extract headers
        if (allData.length > 0) {
          result.headers = allData[0].map(header => 
            typeof header === 'string' ? header.trim() : String(header).trim()
          );
          
          // Intelligent column detection
          const columnDetection = this.detectColumns(result.headers, options);
          result.columnMap = columnDetection.columnMap;
          result.errors.push(...columnDetection.errors);
          
          // Extract data rows
          result.data = allData.slice(1);
          result.metadata.dataRows = result.data.length;
        }
        
        result.metadata.extractionTimeMs = Date.now() - startTime;
        break; // Success, exit retry loop
        
      } catch (error) {
        retryCount++;
        
        if (retryCount <= maxRetries) {
          result.errors.push({
            type: ERROR_TYPES.RETRY_ATTEMPT,
            source: 'SHEETS_API_DATA_EXTRACTION',
            message: `Data extraction attempt ${retryCount}/${maxRetries} failed: ${error.message}`,
            severity: SEVERITY_LEVELS.WARNING,
            timestamp: new Date().toISOString(),
            fileId: fileId
          });
          
          Utilities.sleep(AGGREGATION_CONFIG.RETRY_DELAY_MS);
        } else {
          result.errors.push({
            type: ERROR_TYPES.FILE_ACCESS,
            source: 'SHEETS_API_DATA_EXTRACTION',
            message: `Failed to extract data after ${maxRetries} attempts: ${error.message}`,
            severity: SEVERITY_LEVELS.ERROR,
            timestamp: new Date().toISOString(),
            fileId: fileId
          });
          result.metadata.extractionTimeMs = Date.now() - startTime;
        }
      }
    }
    
    return result;
  },
  
  /**
   * Test Sheets API connectivity and permissions
   * @returns {Object} Connectivity test result
   */
  testConnectivity: function() {
    const result = {
      isConnected: false,
      permissions: {
        canOpenSpreadsheets: false,
        canReadData: false,
        canAccessMultipleSheets: false
      },
      errors: []
    };
    
    try {
      // Test basic Sheets access
      const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      if (activeSpreadsheet) {
        result.permissions.canOpenSpreadsheets = true;
        
        // Test data reading
        const sheet = activeSpreadsheet.getActiveSheet();
        const range = sheet.getRange(1, 1);
        range.getValue(); // Test basic data access
        result.permissions.canReadData = true;
        
        // Test multiple sheet access
        const sheets = activeSpreadsheet.getSheets();
        if (sheets.length > 0) {
          result.permissions.canAccessMultipleSheets = true;
        }
        
        result.isConnected = true;
      }
      
    } catch (error) {
      result.errors.push({
        type: ERROR_TYPES.SYSTEM_FAILURE,
        source: 'SHEETS_API_CONNECTIVITY',
        message: `Sheets API connectivity test failed: ${error.message}`,
        severity: SEVERITY_LEVELS.CRITICAL,
        timestamp: new Date().toISOString()
      });
    }
    
    return result;
  }
};

// ============================================================================
// COMPREHENSIVE ERROR LOGGING AND REPORTING SYSTEM
// ============================================================================

/**
 * Advanced error logging and reporting system for Google Apps Script
 * Provides structured logging, error aggregation, and detailed reporting
 */
const ErrorReportingSystem = {
  
  // Error storage (in-memory for Google Apps Script session)
  errorLog: [],
  sessionId: null,
  
  /**
   * Initialize the error reporting system
   */
  initialize: function() {
    this.sessionId = Utilities.getUuid();
    this.errorLog = [];
    console.log(`Error reporting system initialized. Session ID: ${this.sessionId}`);
  },
  
  /**
   * Log a structured error with contextual information
   * @param {Object} error - Error object with type, source, message, etc.
   * @param {Object} context - Additional context information
   */
  logError: function(error, context = {}) {
    try {
      const enrichedError = {
        ...error,
        sessionId: this.sessionId,
        context: context,
        timestamp: error.timestamp || new Date().toISOString(),
        stackTrace: this.getStackTrace(),
        memoryUsage: this.getMemoryUsage(),
        executionTime: Date.now() - (context.startTime || Date.now())
      };
      
      this.errorLog.push(enrichedError);
      
      // Console logging based on severity
      switch (error.severity) {
        case SEVERITY_LEVELS.CRITICAL:
          console.error(`[CRITICAL] ${error.type}: ${error.message}`, enrichedError);
          break;
        case SEVERITY_LEVELS.ERROR:
          console.error(`[ERROR] ${error.type}: ${error.message}`);
          break;
        case SEVERITY_LEVELS.WARNING:
          console.warn(`[WARNING] ${error.type}: ${error.message}`);
          break;
        case SEVERITY_LEVELS.INFO:
        default:
          console.log(`[INFO] ${error.type}: ${error.message}`);
          break;
      }
      
      // Immediate notification for critical errors
      if (error.severity === SEVERITY_LEVELS.CRITICAL) {
        this.notifyCriticalError(enrichedError);
      }
      
    } catch (loggingError) {
      console.error('Error in error logging system:', loggingError);
    }
  },
  
  /**
   * Generate comprehensive error report
   * @param {Object} options - Report generation options
   * @returns {Object} Detailed error report
   */
  generateReport: function(options = {}) {
    const report = {
      sessionId: this.sessionId,
      generatedAt: new Date().toISOString(),
      summary: {
        totalErrors: this.errorLog.length,
        criticalErrors: 0,
        errors: 0,
        warnings: 0,
        infoMessages: 0
      },
      errorsByType: {},
      errorsBySource: {},
      errorsBySeverity: {},
      timeline: [],
      recommendations: [],
      systemHealth: {
        overallStatus: 'HEALTHY',
        issues: []
      }
    };
    
    try {
      // Analyze errors
      for (const error of this.errorLog) {
        // Count by severity
        switch (error.severity) {
          case SEVERITY_LEVELS.CRITICAL:
            report.summary.criticalErrors++;
            break;
          case SEVERITY_LEVELS.ERROR:
            report.summary.errors++;
            break;
          case SEVERITY_LEVELS.WARNING:
            report.summary.warnings++;
            break;
          case SEVERITY_LEVELS.INFO:
          default:
            report.summary.infoMessages++;
            break;
        }
        
        // Count by type
        report.errorsByType[error.type] = (report.errorsByType[error.type] || 0) + 1;
        
        // Count by source
        report.errorsBySource[error.source] = (report.errorsBySource[error.source] || 0) + 1;
        
        // Count by severity
        report.errorsBySeverity[error.severity] = (report.errorsBySeverity[error.severity] || 0) + 1;
        
        // Add to timeline
        report.timeline.push({
          timestamp: error.timestamp,
          type: error.type,
          severity: error.severity,
          message: error.message,
          source: error.source
        });
      }
      
      // Sort timeline by timestamp
      report.timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // System health assessment
      if (report.summary.criticalErrors > 0) {
        report.systemHealth.overallStatus = 'CRITICAL';
        report.systemHealth.issues.push(`${report.summary.criticalErrors} critical errors detected`);
      } else if (report.summary.errors > 5) {
        report.systemHealth.overallStatus = 'DEGRADED';
        report.systemHealth.issues.push(`High error count: ${report.summary.errors} errors`);
      } else if (report.summary.warnings > 10) {
        report.systemHealth.overallStatus = 'WARNING';
        report.systemHealth.issues.push(`High warning count: ${report.summary.warnings} warnings`);
      }
      
      // Generate recommendations
      report.recommendations = this.generateRecommendations(report);
      
    } catch (reportError) {
      console.error('Error generating error report:', reportError);
      report.reportGenerationError = reportError.message;
    }
    
    return report;
  },
  
  /**
   * Generate actionable recommendations based on error patterns
   * @param {Object} report - Error report data
   * @returns {Array} Array of recommendation objects
   */
  generateRecommendations: function(report) {
    const recommendations = [];
    
    try {
      // File access issues
      if (report.errorsByType[ERROR_TYPES.FILE_ACCESS] > 2) {
        recommendations.push({
          priority: 'HIGH',
          category: 'PERMISSIONS',
          title: 'File Access Issues Detected',
          description: `${report.errorsByType[ERROR_TYPES.FILE_ACCESS]} file access errors found. Check Google Drive permissions and file sharing settings.`,
          action: 'Review file permissions and ensure the script has access to all required files and folders.'
        });
      }
      
      // Timeout warnings
      if (report.errorsByType[ERROR_TYPES.TIMEOUT_WARNING] > 0) {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'PERFORMANCE',
          title: 'Execution Time Concerns',
          description: 'Execution timeout warnings detected. Consider optimizing batch processing.',
          action: 'Reduce batch size or implement progressive processing for large datasets.'
        });
      }
      
      // Memory constraints
      if (report.errorsByType[ERROR_TYPES.MEMORY_CONSTRAINT] > 0) {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'PERFORMANCE',
          title: 'Memory Usage Optimization',
          description: 'Memory constraint warnings detected.',
          action: 'Implement more aggressive memory management and reduce data retention during processing.'
        });
      }
      
      // Data validation issues
      if (report.errorsByType[ERROR_TYPES.INVALID_ENTRY] > 10) {
        recommendations.push({
          priority: 'LOW',
          category: 'DATA_QUALITY',
          title: 'Data Quality Issues',
          description: `${report.errorsByType[ERROR_TYPES.INVALID_ENTRY]} data validation errors found.`,
          action: 'Review data entry guidelines and consider implementing stricter validation in source spreadsheets.'
        });
      }
      
      // System failures
      if (report.errorsByType[ERROR_TYPES.SYSTEM_FAILURE] > 0) {
        recommendations.push({
          priority: 'CRITICAL',
          category: 'SYSTEM',
          title: 'System Reliability Issues',
          description: 'System failures detected that may indicate underlying issues.',
          action: 'Review system logs and consider implementing additional error recovery mechanisms.'
        });
      }
      
    } catch (error) {
      console.error('Error generating recommendations:', error);
    }
    
    return recommendations;
  },
  
  /**
   * Get current stack trace for debugging
   * @returns {string} Stack trace string
   */
  getStackTrace: function() {
    try {
      throw new Error('Stack trace');
    } catch (e) {
      return e.stack || 'Stack trace not available';
    }
  },
  
  /**
   * Get memory usage information (approximation for Google Apps Script)
   * @returns {Object} Memory usage information
   */
  getMemoryUsage: function() {
    try {
      // Google Apps Script doesn't provide direct memory access,
      // so we approximate based on error log size and other factors
      const approximateMemoryMB = Math.round((this.errorLog.length * 0.001) + (JSON.stringify(this.errorLog).length / 1024 / 1024));
      
      return {
        approximateUsageMB: approximateMemoryMB,
        errorLogSize: this.errorLog.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        approximateUsageMB: 'Unknown',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },
  
  /**
   * Handle critical error notifications
   * @param {Object} error - Critical error object
   */
  notifyCriticalError: function(error) {
    try {
      // In Google Apps Script, we can use the UI to show critical errors
      const message = `CRITICAL ERROR: ${error.type}\n${error.message}\n\nSession: ${error.sessionId}\nTime: ${error.timestamp}`;
      
      // Try to show UI alert if available
      try {
        SpreadsheetApp.getUi().alert('Critical Error', message, SpreadsheetApp.getUi().ButtonSet.OK);
      } catch (uiError) {
        console.error('Cannot show UI alert:', uiError);
      }
      
      // Log to console with enhanced formatting
      console.error('='.repeat(80));
      console.error('CRITICAL ERROR DETECTED');
      console.error('='.repeat(80));
      console.error(`Type: ${error.type}`);
      console.error(`Source: ${error.source}`);
      console.error(`Message: ${error.message}`);
      console.error(`Session ID: ${error.sessionId}`);
      console.error(`Timestamp: ${error.timestamp}`);
      console.error('='.repeat(80));
      
    } catch (notificationError) {
      console.error('Error in critical error notification:', notificationError);
    }
  },
  
  /**
   * Export error log for external analysis
   * @param {string} format - Export format ('json' or 'csv')
   * @returns {string} Formatted error log
   */
  exportErrorLog: function(format = 'json') {
    try {
      if (format === 'json') {
        return JSON.stringify({
          sessionId: this.sessionId,
          exportedAt: new Date().toISOString(),
          errorLog: this.errorLog,
          summary: this.generateReport().summary
        }, null, 2);
      } else if (format === 'csv') {
        let csv = 'Timestamp,Type,Severity,Source,Message,Context\n';
        for (const error of this.errorLog) {
          const row = [
            error.timestamp,
            error.type,
            error.severity,
            error.source,
            `"${error.message.replace(/"/g, '""')}"`,
            `"${JSON.stringify(error.context).replace(/"/g, '""')}"`
          ].join(',');
          csv += row + '\n';
        }
        return csv;
      }
    } catch (error) {
      console.error('Error exporting error log:', error);
      return `Error exporting log: ${error.message}`;
    }
  },
  
  /**
   * Clear error log (use with caution)
   */
  clearLog: function() {
    const previousCount = this.errorLog.length;
    this.errorLog = [];
    console.log(`Error log cleared. Previous error count: ${previousCount}`);
  }
};

// ============================================================================
// PROGRESS TRACKING FOR LONG-RUNNING OPERATIONS
// ============================================================================

/**
 * Advanced progress tracking system for Google Apps Script operations
 * Provides real-time progress monitoring, ETA calculation, and performance metrics
 */
const ProgressTracker = {
  
  // Active operation tracking
  operations: {},
  
  /**
   * Start tracking a new operation
   * @param {string} operationId - Unique identifier for the operation
   * @param {Object} config - Operation configuration
   * @returns {string} Operation ID
   */
  startOperation: function(operationId, config = {}) {
    const operation = {
      id: operationId,
      name: config.name || operationId,
      startTime: Date.now(),
      totalItems: config.totalItems || 0,
      completedItems: 0,
      currentItem: '',
      stages: config.stages || ['Processing'],
      currentStage: 0,
      status: 'RUNNING',
      errors: [],
      warnings: [],
      checkpoints: [],
      metadata: {
        batchSize: config.batchSize || 1,
        estimatedDuration: config.estimatedDuration || null
      }
    };
    
    this.operations[operationId] = operation;
    
    console.log(`Started operation: ${operation.name} (ID: ${operationId})`);
    return operationId;
  },
  
  /**
   * Update progress for an operation
   * @param {string} operationId - Operation identifier
   * @param {Object} update - Progress update data
   */
  updateProgress: function(operationId, update = {}) {
    const operation = this.operations[operationId];
    if (!operation) {
      console.error(`Operation ${operationId} not found`);
      return;
    }
    
    try {
      // Update completed items
      if (update.completedItems !== undefined) {
        operation.completedItems = update.completedItems;
      } else if (update.increment) {
        operation.completedItems += update.increment;
      }
      
      // Update current item
      if (update.currentItem) {
        operation.currentItem = update.currentItem;
      }
      
      // Update stage
      if (update.currentStage !== undefined) {
        operation.currentStage = Math.min(update.currentStage, operation.stages.length - 1);
      }
      
      // Add errors
      if (update.errors) {
        operation.errors.push(...(Array.isArray(update.errors) ? update.errors : [update.errors]));
      }
      
      // Add warnings
      if (update.warnings) {
        operation.warnings.push(...(Array.isArray(update.warnings) ? update.warnings : [update.warnings]));
      }
      
      // Create checkpoint
      const checkpoint = {
        timestamp: Date.now(),
        completedItems: operation.completedItems,
        currentStage: operation.currentStage,
        currentItem: operation.currentItem,
        elapsedTimeMs: Date.now() - operation.startTime,
        memoryUsage: this.getMemoryUsage()
      };
      
      operation.checkpoints.push(checkpoint);
      
      // Calculate progress metrics
      const progress = this.calculateProgress(operation);
      
      // Log progress at intervals
      if (this.shouldLogProgress(operation)) {
        this.logProgress(operation, progress);
      }
      
      // Check for completion
      if (operation.completedItems >= operation.totalItems && operation.totalItems > 0) {
        this.completeOperation(operationId);
      }
      
    } catch (error) {
      console.error(`Error updating progress for ${operationId}:`, error);
      ErrorReportingSystem.logError({
        type: ERROR_TYPES.SYSTEM_FAILURE,
        source: 'PROGRESS_TRACKER',
        message: `Progress update failed: ${error.message}`,
        severity: SEVERITY_LEVELS.WARNING,
        timestamp: new Date().toISOString()
      }, { operationId: operationId });
    }
  },
  
  /**
   * Calculate comprehensive progress metrics
   * @param {Object} operation - Operation object
   * @returns {Object} Progress metrics
   */
  calculateProgress: function(operation) {
    const now = Date.now();
    const elapsedTimeMs = now - operation.startTime;
    const elapsedSeconds = elapsedTimeMs / 1000;
    
    const metrics = {
      percentage: operation.totalItems > 0 ? (operation.completedItems / operation.totalItems) * 100 : 0,
      elapsedTimeMs: elapsedTimeMs,
      elapsedTimeFormatted: this.formatDuration(elapsedTimeMs),
      itemsPerSecond: elapsedSeconds > 0 ? operation.completedItems / elapsedSeconds : 0,
      estimatedTotalTimeMs: null,
      estimatedRemainingTimeMs: null,
      estimatedCompletionTime: null,
      currentStage: operation.stages[operation.currentStage] || 'Unknown',
      stageProgress: `${operation.currentStage + 1}/${operation.stages.length}`
    };
    
    // Calculate ETA if we have enough data
    if (operation.completedItems > 0 && operation.totalItems > 0) {
      const remainingItems = operation.totalItems - operation.completedItems;
      metrics.estimatedTotalTimeMs = (elapsedTimeMs / operation.completedItems) * operation.totalItems;
      metrics.estimatedRemainingTimeMs = (elapsedTimeMs / operation.completedItems) * remainingItems;
      metrics.estimatedCompletionTime = new Date(now + metrics.estimatedRemainingTimeMs).toISOString();
    }
    
    return metrics;
  },
  
  /**
   * Check if progress should be logged based on intervals
   * @param {Object} operation - Operation object
   * @returns {boolean} Whether to log progress
   */
  shouldLogProgress: function(operation) {
    const checkpointInterval = AGGREGATION_CONFIG.CHECKPOINT_INTERVAL || 10;
    
    // Log at percentage intervals
    const percentage = operation.totalItems > 0 ? (operation.completedItems / operation.totalItems) * 100 : 0;
    const lastLoggedPercentage = operation.lastLoggedPercentage || 0;
    
    if (percentage - lastLoggedPercentage >= 10) {
      operation.lastLoggedPercentage = Math.floor(percentage / 10) * 10;
      return true;
    }
    
    // Log at item intervals
    if (operation.completedItems > 0 && operation.completedItems % checkpointInterval === 0) {
      return true;
    }
    
    // Log stage changes
    if (operation.currentStage !== operation.lastLoggedStage) {
      operation.lastLoggedStage = operation.currentStage;
      return true;
    }
    
    return false;
  },
  
  /**
   * Log progress information to console
   * @param {Object} operation - Operation object
   * @param {Object} progress - Progress metrics
   */
  logProgress: function(operation, progress) {
    const message = [
      `[${operation.name}]`,
      `${operation.completedItems}/${operation.totalItems}`,
      `(${Math.round(progress.percentage)}%)`,
      `Stage: ${progress.currentStage}`,
      `Elapsed: ${progress.elapsedTimeFormatted}`,
      progress.estimatedRemainingTimeMs ? `ETA: ${this.formatDuration(progress.estimatedRemainingTimeMs)}` : '',
      progress.itemsPerSecond > 0 ? `Rate: ${Math.round(progress.itemsPerSecond * 100) / 100}/s` : ''
    ].filter(Boolean).join(' | ');
    
    console.log(message);
    
    // Current item if specified
    if (operation.currentItem) {
      console.log(`  Current: ${operation.currentItem}`);
    }
  },
  
  /**
   * Complete an operation
   * @param {string} operationId - Operation identifier
   */
  completeOperation: function(operationId) {
    const operation = this.operations[operationId];
    if (!operation) {
      console.error(`Operation ${operationId} not found`);
      return;
    }
    
    operation.status = 'COMPLETED';
    operation.endTime = Date.now();
    operation.totalDurationMs = operation.endTime - operation.startTime;
    
    const finalMetrics = this.calculateProgress(operation);
    
    console.log(`=== Operation Completed: ${operation.name} ===`);
    console.log(`Total Duration: ${this.formatDuration(operation.totalDurationMs)}`);
    console.log(`Items Processed: ${operation.completedItems}/${operation.totalItems}`);
    console.log(`Average Rate: ${Math.round(finalMetrics.itemsPerSecond * 100) / 100} items/second`);
    console.log(`Errors: ${operation.errors.length}, Warnings: ${operation.warnings.length}`);
    console.log(`Status: ${operation.status}`);
    console.log('='.repeat(50));
  },
  
  /**
   * Fail an operation with error details
   * @param {string} operationId - Operation identifier
   * @param {Object} error - Error information
   */
  failOperation: function(operationId, error) {
    const operation = this.operations[operationId];
    if (!operation) {
      console.error(`Operation ${operationId} not found`);
      return;
    }
    
    operation.status = 'FAILED';
    operation.endTime = Date.now();
    operation.totalDurationMs = operation.endTime - operation.startTime;
    operation.failureReason = error;
    
    console.error(`=== Operation Failed: ${operation.name} ===`);
    console.error(`Duration: ${this.formatDuration(operation.totalDurationMs)}`);
    console.error(`Items Processed: ${operation.completedItems}/${operation.totalItems}`);
    console.error(`Failure Reason: ${error.message || error}`);
    console.error('='.repeat(50));
    
    ErrorReportingSystem.logError({
      type: ERROR_TYPES.SYSTEM_FAILURE,
      source: 'PROGRESS_TRACKER',
      message: `Operation failed: ${error.message || error}`,
      severity: SEVERITY_LEVELS.ERROR,
      timestamp: new Date().toISOString()
    }, { operationId: operationId, operation: operation });
  },
  
  /**
   * Get status of an operation
   * @param {string} operationId - Operation identifier
   * @returns {Object} Operation status
   */
  getOperationStatus: function(operationId) {
    const operation = this.operations[operationId];
    if (!operation) {
      return null;
    }
    
    const progress = this.calculateProgress(operation);
    
    return {
      id: operation.id,
      name: operation.name,
      status: operation.status,
      progress: progress,
      errors: operation.errors.length,
      warnings: operation.warnings.length,
      startTime: new Date(operation.startTime).toISOString(),
      endTime: operation.endTime ? new Date(operation.endTime).toISOString() : null
    };
  },
  
  /**
   * Get memory usage (approximation for Google Apps Script)
   * @returns {Object} Memory usage information
   */
  getMemoryUsage: function() {
    try {
      const operationCount = Object.keys(this.operations).length;
      const checkpointCount = Object.values(this.operations).reduce((sum, op) => sum + op.checkpoints.length, 0);
      
      return {
        approximateUsageMB: Math.round((operationCount * 0.1 + checkpointCount * 0.001) * 100) / 100,
        operationCount: operationCount,
        checkpointCount: checkpointCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        approximateUsageMB: 'Unknown',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },
  
  /**
   * Format duration in milliseconds to human-readable string
   * @param {number} durationMs - Duration in milliseconds
   * @returns {string} Formatted duration string
   */
  formatDuration: function(durationMs) {
    if (!durationMs || durationMs < 0) return '0s';
    
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  },
  
  /**
   * Clean up completed operations (optional memory management)
   * @param {number} maxAge - Maximum age in milliseconds
   */
  cleanupOperations: function(maxAge = 3600000) { // Default 1 hour
    const now = Date.now();
    const toRemove = [];
    
    for (const [id, operation] of Object.entries(this.operations)) {
      if (operation.status !== 'RUNNING' && (now - operation.startTime) > maxAge) {
        toRemove.push(id);
      }
    }
    
    toRemove.forEach(function(id) {
      delete this.operations[id];
    }.bind(this));
    
    if (toRemove.length > 0) {
      console.log(`Cleaned up ${toRemove.length} old operations`);
    }
  }
};

// ============================================================================
// MEMORY MANAGEMENT AND BATCH PROCESSING OPTIMIZATION
// ============================================================================

/**
 * Advanced memory management and batch processing system for Google Apps Script
 * Provides intelligent memory monitoring, batch optimization, and resource management
 */
const MemoryManager = {
  
  // Memory tracking
  memoryCheckpoints: [],
  maxMemoryUsage: 0,
  memoryWarningThreshold: 80, // MB
  memoryPressureThreshold: 90, // MB
  
  /**
   * Initialize memory management system
   */
  initialize: function() {
    this.memoryCheckpoints = [];
    this.maxMemoryUsage = 0;
    console.log('Memory management system initialized');
  },
  
  /**
   * Monitor memory usage and create checkpoint
   * @param {string} context - Context description
   * @returns {Object} Memory status
   */
  checkMemoryUsage: function(context = 'General') {
    const checkpoint = {
      timestamp: Date.now(),
      context: context,
      approximateUsageMB: this.estimateMemoryUsage(),
      availableMemoryMB: this.estimateAvailableMemory()
    };
    
    this.memoryCheckpoints.push(checkpoint);
    
    // Update max usage
    if (checkpoint.approximateUsageMB > this.maxMemoryUsage) {
      this.maxMemoryUsage = checkpoint.approximateUsageMB;
    }
    
    // Check for memory pressure
    const memoryStatus = this.assessMemoryStatus(checkpoint);
    
    // Log warnings if needed
    if (memoryStatus.level === 'WARNING') {
      console.warn(`Memory usage warning: ${checkpoint.approximateUsageMB}MB (${context})`);
    } else if (memoryStatus.level === 'CRITICAL') {
      console.error(`Critical memory usage: ${checkpoint.approximateUsageMB}MB (${context})`);
      
      ErrorReportingSystem.logError({
        type: ERROR_TYPES.MEMORY_CONSTRAINT,
        source: 'MEMORY_MANAGER',
        message: `Critical memory usage detected: ${checkpoint.approximateUsageMB}MB`,
        severity: SEVERITY_LEVELS.WARNING,
        timestamp: new Date().toISOString()
      }, { context: context, memoryUsage: checkpoint.approximateUsageMB });
    }
    
    return memoryStatus;
  },
  
  /**
   * Estimate memory usage (approximation for Google Apps Script)
   * @returns {number} Estimated memory usage in MB
   */
  estimateMemoryUsage: function() {
    try {
      // Approximate memory usage based on various factors
      let estimatedMB = 0;
      
      // Base script memory
      estimatedMB += 5;
      
      // Error reporting system
      if (ErrorReportingSystem.errorLog) {
        estimatedMB += Math.round(ErrorReportingSystem.errorLog.length * 0.001);
      }
      
      // Progress tracking
      if (ProgressTracker.operations) {
        const operationCount = Object.keys(ProgressTracker.operations).length;
        const checkpointCount = Object.values(ProgressTracker.operations)
          .reduce((sum, op) => sum + (op.checkpoints ? op.checkpoints.length : 0), 0);
        estimatedMB += Math.round((operationCount * 0.1 + checkpointCount * 0.001));
      }
      
      // Memory checkpoints
      estimatedMB += Math.round(this.memoryCheckpoints.length * 0.0005);
      
      // Conservative estimate for variables and temporary objects
      estimatedMB += 10;
      
      return Math.max(estimatedMB, 1);
      
    } catch (error) {
      console.error('Error estimating memory usage:', error);
      return 50; // Conservative fallback
    }
  },
  
  /**
   * Estimate available memory (Google Apps Script has approximately 100MB limit)
   * @returns {number} Estimated available memory in MB
   */
  estimateAvailableMemory: function() {
    const totalMemoryLimit = 100; // Google Apps Script limit
    const currentUsage = this.estimateMemoryUsage();
    return Math.max(totalMemoryLimit - currentUsage, 0);
  },
  
  /**
   * Assess memory status and recommend actions
   * @param {Object} checkpoint - Memory checkpoint
   * @returns {Object} Memory status assessment
   */
  assessMemoryStatus: function(checkpoint) {
    const usage = checkpoint.approximateUsageMB;
    const available = checkpoint.availableMemoryMB;
    const usagePercentage = (usage / 100) * 100;
    
    let level = 'NORMAL';
    let recommendation = null;
    
    if (usage >= this.memoryPressureThreshold) {
      level = 'CRITICAL';
      recommendation = 'Immediate memory cleanup required. Reduce batch size and clear temporary data.';
    } else if (usage >= this.memoryWarningThreshold) {
      level = 'WARNING';
      recommendation = 'Consider reducing batch size and clearing unused variables.';
    } else if (usagePercentage > 60) {
      level = 'CAUTION';
      recommendation = 'Monitor memory usage closely.';
    }
    
    return {
      level: level,
      usageMB: usage,
      availableMB: available,
      usagePercentage: Math.round(usagePercentage),
      recommendation: recommendation,
      timestamp: checkpoint.timestamp
    };
  },
  
  /**
   * Optimize batch size based on memory constraints
   * @param {number} defaultBatchSize - Default batch size
   * @param {number} itemSizeEstimate - Estimated memory per item in KB
   * @returns {number} Optimized batch size
   */
  optimizeBatchSize: function(defaultBatchSize, itemSizeEstimate = 1) {
    const memoryStatus = this.checkMemoryUsage('Batch Size Optimization');
    const availableMemoryKB = memoryStatus.availableMB * 1024;
    
    // Reserve 20MB for safety
    const usableMemoryKB = Math.max(availableMemoryKB - (20 * 1024), 1024);
    
    // Calculate max items that fit in available memory
    const maxItemsByMemory = Math.floor(usableMemoryKB / itemSizeEstimate);
    
    // Choose the smaller of memory-based limit or default
    let optimizedBatchSize = Math.min(defaultBatchSize, maxItemsByMemory);
    
    // Apply memory pressure adjustments
    if (memoryStatus.level === 'CRITICAL') {
      optimizedBatchSize = Math.min(optimizedBatchSize, 5);
    } else if (memoryStatus.level === 'WARNING') {
      optimizedBatchSize = Math.min(optimizedBatchSize, Math.floor(defaultBatchSize * 0.5));
    } else if (memoryStatus.level === 'CAUTION') {
      optimizedBatchSize = Math.min(optimizedBatchSize, Math.floor(defaultBatchSize * 0.75));
    }
    
    // Ensure minimum batch size
    optimizedBatchSize = Math.max(optimizedBatchSize, 1);
    
    if (optimizedBatchSize !== defaultBatchSize) {
      console.log(`Batch size optimized: ${defaultBatchSize} → ${optimizedBatchSize} (Memory: ${memoryStatus.level})`);
    }
    
    return optimizedBatchSize;
  },
  
  /**
   * Perform memory cleanup operations
   * @param {Object} options - Cleanup options
   */
  performCleanup: function(options = {}) {
    const beforeCleanup = this.estimateMemoryUsage();
    let cleanupActions = [];
    
    try {
      // Clear old memory checkpoints
      if (this.memoryCheckpoints.length > 50) {
        const removed = this.memoryCheckpoints.length - 50;
        this.memoryCheckpoints = this.memoryCheckpoints.slice(-50);
        cleanupActions.push(`Removed ${removed} old memory checkpoints`);
      }
      
      // Clean up error log if too large
      if (ErrorReportingSystem.errorLog && ErrorReportingSystem.errorLog.length > 100) {
        const removed = ErrorReportingSystem.errorLog.length - 100;
        ErrorReportingSystem.errorLog = ErrorReportingSystem.errorLog.slice(-100);
        cleanupActions.push(`Trimmed error log by ${removed} entries`);
      }
      
      // Clean up progress tracker operations
      if (ProgressTracker.operations) {
        ProgressTracker.cleanupOperations(1800000); // 30 minutes
        cleanupActions.push('Cleaned up old progress tracking operations');
      }
      
      // Force garbage collection hint (Google Apps Script specific)
      if (options.forceGC) {
        // Create and destroy temporary objects to hint at garbage collection
        const temp = [];
        for (let i = 0; i < 1000; i++) {
          temp.push({ data: 'temporary' });
        }
        temp.length = 0;
        cleanupActions.push('Requested garbage collection');
      }
      
      const afterCleanup = this.estimateMemoryUsage();
      const savedMB = beforeCleanup - afterCleanup;
      
      console.log(`Memory cleanup completed. Saved ~${savedMB}MB (${beforeCleanup}MB → ${afterCleanup}MB)`);
      if (cleanupActions.length > 0) {
        console.log(`Actions: ${cleanupActions.join(', ')}`);
      }
      
    } catch (error) {
      console.error('Error during memory cleanup:', error);
      ErrorReportingSystem.logError({
        type: ERROR_TYPES.SYSTEM_FAILURE,
        source: 'MEMORY_MANAGER',
        message: `Memory cleanup failed: ${error.message}`,
        severity: SEVERITY_LEVELS.WARNING,
        timestamp: new Date().toISOString()
      });
    }
  },
  
  /**
   * Smart batch processor with memory management
   * @param {Array} items - Items to process
   * @param {Function} processor - Processing function
   * @param {Object} options - Processing options
   * @returns {Object} Processing result
   */
  processBatch: function(items, processor, options = {}) {
    const result = {
      processedItems: [],
      errors: [],
      metadata: {
        totalItems: items.length,
        processedCount: 0,
        batchCount: 0,
        startTime: Date.now(),
        endTime: null,
        memoryStats: {
          initialUsage: this.estimateMemoryUsage(),
          peakUsage: 0,
          finalUsage: 0
        }
      }
    };
    
    try {
      const defaultBatchSize = options.batchSize || AGGREGATION_CONFIG.BATCH_SIZE;
      let currentBatchSize = this.optimizeBatchSize(defaultBatchSize, options.itemSizeEstimate);
      
      for (let i = 0; i < items.length; i += currentBatchSize) {
        const batchStartTime = Date.now();
        const batch = items.slice(i, i + currentBatchSize);
        result.metadata.batchCount++;
        
        // Check memory before processing batch
        const memoryStatus = this.checkMemoryUsage(`Batch ${result.metadata.batchCount}`);
        result.metadata.memoryStats.peakUsage = Math.max(
          result.metadata.memoryStats.peakUsage,
          memoryStatus.usageMB
        );
        
        // Adjust batch size if under memory pressure
        if (memoryStatus.level === 'CRITICAL' || memoryStatus.level === 'WARNING') {
          currentBatchSize = this.optimizeBatchSize(currentBatchSize, options.itemSizeEstimate);
        }
        
        // Process batch items
        for (const item of batch) {
          try {
            const processedItem = processor(item, {
              batchIndex: result.metadata.batchCount,
              itemIndex: result.metadata.processedCount,
              totalItems: items.length
            });
            
            if (processedItem) {
              result.processedItems.push(processedItem);
            }
            result.metadata.processedCount++;
            
          } catch (itemError) {
            result.errors.push({
              type: ERROR_TYPES.SYSTEM_FAILURE,
              source: 'BATCH_PROCESSOR',
              message: `Item processing failed: ${itemError.message}`,
              severity: SEVERITY_LEVELS.ERROR,
              timestamp: new Date().toISOString(),
              itemIndex: result.metadata.processedCount
            });
          }
        }
        
        // Memory cleanup between batches if needed
        if (memoryStatus.level === 'WARNING' || memoryStatus.level === 'CRITICAL') {
          this.performCleanup({ forceGC: memoryStatus.level === 'CRITICAL' });
        }
        
        // Progress logging
        if (options.progressCallback) {
          options.progressCallback({
            completed: result.metadata.processedCount,
            total: items.length,
            batchTime: Date.now() - batchStartTime,
            memoryUsage: memoryStatus.usageMB
          });
        }
      }
      
      result.metadata.endTime = Date.now();
      result.metadata.memoryStats.finalUsage = this.estimateMemoryUsage();
      
    } catch (error) {
      result.errors.push({
        type: ERROR_TYPES.SYSTEM_FAILURE,
        source: 'BATCH_PROCESSOR',
        message: `Batch processing failed: ${error.message}`,
        severity: SEVERITY_LEVELS.CRITICAL,
        timestamp: new Date().toISOString()
      });
    }
    
    return result;
  },
  
  /**
   * Generate memory usage report
   * @returns {Object} Memory usage report
   */
  generateMemoryReport: function() {
    const currentUsage = this.estimateMemoryUsage();
    const available = this.estimateAvailableMemory();
    
    return {
      current: {
        usageMB: currentUsage,
        availableMB: available,
        usagePercentage: Math.round((currentUsage / 100) * 100)
      },
      peak: {
        usageMB: this.maxMemoryUsage,
        usagePercentage: Math.round((this.maxMemoryUsage / 100) * 100)
      },
      checkpoints: this.memoryCheckpoints.length,
      lastCheckpoint: this.memoryCheckpoints.length > 0 ? 
        this.memoryCheckpoints[this.memoryCheckpoints.length - 1] : null,
      recommendations: this.generateMemoryRecommendations(currentUsage)
    };
  },
  
  /**
   * Generate memory optimization recommendations
   * @param {number} currentUsage - Current memory usage in MB
   * @returns {Array} Array of recommendations
   */
  generateMemoryRecommendations: function(currentUsage) {
    const recommendations = [];
    
    if (currentUsage > this.memoryPressureThreshold) {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'Immediate cleanup required',
        description: 'Reduce batch sizes and clear temporary data immediately'
      });
    } else if (currentUsage > this.memoryWarningThreshold) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Optimize memory usage',
        description: 'Consider reducing batch sizes and performing regular cleanup'
      });
    } else if (currentUsage > 50) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Monitor memory usage',
        description: 'Keep tracking memory usage and be prepared to optimize'
      });
    }
    
    return recommendations;
  }
};

// ============================================================================
// EXISTING TIMESHEET GENERATION CONSTANTS
// ============================================================================

const TEMPLATE_FILE_ID = "1VK1fZU9QCTobVN2vUJ-FPcjf5BhAr75zUfPWzlXyHH4";

const MEMBER_SHEET_NAME = "Members";
const MAIN_SHEET_NAME = "Main";

const MEMBER_COLUMNS = {
  NO: 0,
  PAV_ID: 1,
  NAME: 2,
  POSITION: 3,
  COMPANY: 4,
  EMAIL: 5,
  IN_ACTIVE: 6,
}

function onOpen() {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('Custom Menu')
      .addItem('Generate Timesheet Files', 'generateTimesheetFiles')
      .addItem('Aggregate Monthly Timesheets', 'aggregateMonthlyTimesheetsUI')
      .addSeparator()
      .addItem('Export Configurable Report', 'exportConfigurableReportUI')
      .addToUi();
}

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

function readTime() {
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MAIN_SHEET_NAME);
  const year = mainSheet.getRange("B1").getValue();
  const month = mainSheet.getRange("B2").getValue();
  const paddedMonth = month.toString().padStart(2, '0');
  return `${year}-${paddedMonth}`;
}

function readMembers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MEMBER_SHEET_NAME);
  var data = sheet.getDataRange().getDisplayValues();
  // filter data with In-active = false, find column index of In-active
  data.shift(); // remove header row
  data = data.filter(function(row) { return !row[MEMBER_COLUMNS.IN_ACTIVE]; });

  return data;
}

function createTimesheetFolder(time) {
  const folderName = `${time}`;
  //create folder in current spreadsheet folder
  const parentFolder = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId()).getParents().next();
  let folder;
  //check if folder already exists
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = parentFolder.createFolder(folderName);
  }
  return folder;
}

function createTimesheetFile(folder, member, time) {
  //copy from template file
  const fileName = `Timesheet_${time}_${member[MEMBER_COLUMNS.NAME]}`;
  //check if file was existed
  
  const templateFile = DriveApp.getFileById(TEMPLATE_FILE_ID);
  const newFile = templateFile.makeCopy(fileName, folder);
  //move new file to folder
  newFile.moveTo(folder);
}

// ============================================================================
// CONFIGURATION-DRIVEN REPORT EXPORT FUNCTIONS
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

// ============================================================================
// CONFIGURATION VALIDATION HELPERS (Enhanced User-Friendly Error Messages)
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
    
    // Check if sheet exists
    if (!sheet) {
      return {
        isValid: false,
        errors: ['Configuration sheet "Report Configs" not found. Please create this sheet first.'],
        setupGuidance: [
          '1. Right-click on the sheet tabs at the bottom',
          '2. Select "Insert sheet"', 
          '3. Name the new sheet "Report Configs"',
          '4. Add the following column headers in row 1:',
          '   A: Report Name, B: Description, C: Columns, D: Filters, E: Sort By, F: Sort Order, G: Summary Type, H: Enabled'
        ]
      };
    }
    
    // Check if sheet has data
    const data = sheet.getDataRange().getDisplayValues();
    if (data.length === 0) {
      return {
        isValid: false,
        errors: ['Configuration sheet is completely empty.'],
        setupGuidance: [
          'Please add a header row with the following columns:',
          'A: Report Name, B: Description, C: Columns, D: Filters, E: Sort By, F: Sort Order, G: Summary Type, H: Enabled',
          '',
          'Then add at least one configuration row below the headers.'
        ]
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
      const actual = headerRow[i].trim().toLowerCase();
      const expected = expectedHeaders[i].toLowerCase();
      
      if (actual !== expected && actual !== expected.replace(/\s+/g, '')) {
        headerWarnings.push(`Column ${String.fromCharCode(65 + i)} header "${headerRow[i]}" should probably be "${expectedHeaders[i]}"`);
      }
    }
    
    if (headerWarnings.length > 0) {
      warnings.push(...headerWarnings);
      warnings.push('Headers don\'t match expected format. This may cause validation errors.');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      setupGuidance: errors.length > 0 ? [
        'Expected column headers (in order):',
        'A: Report Name - Unique name for your report',
        'B: Description - Brief description of what the report shows', 
        'C: Columns - Comma-separated list of columns to include',
        'D: Filters - Optional: column=value pairs (e.g., active=true,hours>0)',
        'E: Sort By - Column name to sort by (must be in Columns list)',
        'F: Sort Order - ASC or DESC',
        'G: Summary Type - NONE, MEMBER_TOTALS, DAILY_TOTALS, or PROJECT_TOTALS',
        'H: Enabled - TRUE or FALSE'
      ] : []
    };
    
  } catch (error) {
    return {
      isValid: false,
      errors: [`Error checking configuration sheet: ${error.message}`],
      setupGuidance: ['Please check if the "Report Configs" sheet is properly formatted.']
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
      if (context.fieldName === 'reportName') {
        return `Report Name${rowInfo}: "${context.value}" is invalid. Report names must be unique, non-empty, and under 50 characters.`;
      }
      if (context.fieldName === 'columns') {
        const validColumns = Object.keys(REPORT_CONFIG.COLUMN_MAPPINGS).join(', ');
        return `Columns${rowInfo}: Invalid column names. Available columns are: ${validColumns}`;
      }
      if (context.fieldName === 'filters') {
        return `Filters${rowInfo}: Invalid filter format. Use: column=value,column>value (e.g., active=true,hours>0)`;
      }
      if (context.fieldName === 'sortOrder') {
        return `Sort Order${rowInfo}: Must be exactly "ASC" or "DESC" (case-sensitive).`;
      }
      if (context.fieldName === 'summaryType') {
        return `Summary Type${rowInfo}: Must be one of: NONE, MEMBER_TOTALS, DAILY_TOTALS, PROJECT_TOTALS (case-sensitive).`;
      }
      if (context.fieldName === 'enabled') {
        return `Enabled${rowInfo}: Must be exactly "TRUE" or "FALSE" (case-sensitive).`;
      }
      return `Configuration error${rowInfo}${fieldInfo}: ${context.details || 'Invalid value'}`;
      
    case ERROR_TYPES.FILTER_ERROR:
      return `Filter Error${rowInfo}: ${context.details || 'Invalid filter expression. Use format: column=value,column>value'}`;
      
    case ERROR_TYPES.REPORT_GENERATION_ERROR:
      return `Report Generation Error: ${context.details || 'Unable to generate report with current configuration'}`;
      
    case ERROR_TYPES.EXPORT_ERROR:
      return `Export Error: ${context.details || 'Unable to export report to Google Sheets'}`;
      
    default:
      return `Error${rowInfo}${fieldInfo}: ${context.details || 'An unexpected error occurred'}`;
  }
}

/**
 * Create helpful configuration examples for users
 * @returns {Array} Array of example configuration objects with explanations
 */
function createConfigurationExamples() {
  return [
    {
      title: 'Basic Weekly Summary Report',
      explanation: 'Shows all timesheet data grouped by member for the current period',
      config: {
        reportName: 'Weekly Team Summary',
        description: 'Summary of all team member hours for the week',
        columns: 'Member Name,Total Hours,Date',
        filters: '',
        sortBy: 'Member Name',
        sortOrder: 'ASC',
        summaryType: 'NONE',
        enabled: 'TRUE'
      }
    },
    {
      title: 'Active Members Only with Hour Filtering',
      explanation: 'Shows only active members who logged more than 0 hours',
      config: {
        reportName: 'Active Members Report',
        description: 'Active team members with recorded hours',
        columns: 'Member Name,Total Hours,Status',
        filters: 'active=true,hours>0',
        sortBy: 'Total Hours',
        sortOrder: 'DESC',
        summaryType: 'MEMBER_TOTALS',
        enabled: 'TRUE'
      }
    },
    {
      title: 'Project-Based Summary',
      explanation: 'Groups timesheet data by project for project managers',
      config: {
        reportName: 'Project Hours Summary',
        description: 'Total hours spent on each project',
        columns: 'Project Name,Total Hours,Member Count',
        filters: '',
        sortBy: 'Total Hours',
        sortOrder: 'DESC',
        summaryType: 'PROJECT_TOTALS',
        enabled: 'TRUE'
      }
    }
  ];
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
    message += `Example ${index + 1}: ${example.title}\n`;
    message += `Purpose: ${example.explanation}\n`;
    message += `Configuration values:\n`;
    Object.entries(example.config).forEach(([key, value]) => {
      message += `  ${key}: ${value}\n`;
    });
    message += '\n';
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
 * Generate a configurable report from aggregated timesheet data
 * @param {Array} aggregatedData - Array of aggregated timesheet objects
 * @param {Object} configuration - Report configuration object
 * @returns {Object} Result object with success status, report data, and errors
 */
function generateConfigurableReport(aggregatedData, configuration) {
  try {
    // Input validation
    if (!Array.isArray(aggregatedData)) {
      return {
        success: false,
        reportData: [],
        metadata: {},
        errors: ['Aggregated data must be an array']
      };
    }
    
    if (!configuration || typeof configuration !== 'object') {
      return {
        success: false,
        reportData: [],
        metadata: {},
        errors: ['Configuration must be a valid object']
      };
    }
    
    if (!configuration.columns || !Array.isArray(configuration.columns)) {
      return {
        success: false,
        reportData: [],
        metadata: {},
        errors: ['Configuration must include a valid columns array']
      };
    }
    
    // Memory management for large datasets
    const BATCH_SIZE = 1000; // Process data in chunks to avoid memory issues
    const MAX_MEMORY_RECORDS = 10000; // Warning threshold for large datasets
    
    if (aggregatedData.length > MAX_MEMORY_RECORDS) {
      Logger.log(`Warning: Processing large dataset with ${aggregatedData.length} records. This may take longer than usual.`);
    }
    
    // Filter data based on configuration filters (with batching for large datasets)
    let filteredData;
    if (aggregatedData.length > BATCH_SIZE) {
      filteredData = applyFiltersBatched(aggregatedData, configuration.filters || {}, BATCH_SIZE);
    } else {
      filteredData = applyFilters(aggregatedData, configuration.filters || {});
    }
    
    if (filteredData.length === 0) {
      return {
        success: true,
        reportData: [],
        metadata: {
          reportName: configuration.reportName,
          description: configuration.description,
          totalRecords: 0,
          generatedAt: new Date().toISOString(),
          columns: configuration.columns,
          appliedFilters: configuration.filters || {}
        },
        errors: []
      };
    }
    
    // Transform data to include only requested columns (with batching)
    let transformedData;
    if (filteredData.length > BATCH_SIZE) {
      transformedData = transformDataColumnsBatched(filteredData, configuration.columns, BATCH_SIZE);
    } else {
      transformedData = transformDataColumns(filteredData, configuration.columns);
    }
    
    // Sort data if sort configuration is provided
    if (configuration.sortBy) {
      sortReportData(transformedData, configuration.sortBy, configuration.sortOrder || 'ASC');
    }
    
    // Apply summary aggregation if requested
    let finalData = transformedData;
    if (configuration.summaryType && configuration.summaryType !== 'NONE') {
      finalData = applySummaryAggregation(transformedData, configuration.summaryType);
    }
    
    // Generate metadata
    const metadata = {
      reportName: configuration.reportName,
      description: configuration.description,
      totalRecords: finalData.length,
      originalRecords: aggregatedData.length,
      filteredRecords: filteredData.length,
      generatedAt: new Date().toISOString(),
      columns: configuration.columns,
      appliedFilters: configuration.filters || {},
      sortBy: configuration.sortBy || null,
      sortOrder: configuration.sortOrder || 'ASC',
      summaryType: configuration.summaryType || 'NONE',
      processingInfo: {
        usedBatching: aggregatedData.length > BATCH_SIZE,
        batchSize: BATCH_SIZE,
        isLargeDataset: aggregatedData.length > MAX_MEMORY_RECORDS
      }
    };
    
    return {
      success: true,
      reportData: finalData,
      metadata: metadata,
      errors: []
    };
    
  } catch (error) {
    Logger.log('Error generating configurable report: ' + error.message);
    return {
      success: false,
      reportData: [],
      metadata: {},
      errors: [`System error generating report: ${error.message}`]
    };
  }
}

/**
 * Apply filters to data using batched processing for large datasets
 * @param {Array} data - Data to filter
 * @param {Object} filters - Filter configuration object
 * @param {number} batchSize - Size of each processing batch
 * @returns {Array} Filtered data
 */
function applyFiltersBatched(data, filters, batchSize) {
  if (!filters || Object.keys(filters).length === 0) {
    return data;
  }
  
  const filteredResults = [];
  
  // Process data in batches to manage memory
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const filteredBatch = applyFilters(batch, filters);
    filteredResults.push(...filteredBatch);
    
    // Force garbage collection hint for large datasets
    if (i % (batchSize * 5) === 0 && data.length > 5000) {
      Logger.log(`Processed ${i + batch.length}/${data.length} records...`);
    }
  }
  
  return filteredResults;
}

/**
 * Transform data columns using batched processing for large datasets
 * @param {Array} data - Data to transform
 * @param {Array} columns - Column names to include
 * @param {number} batchSize - Size of each processing batch
 * @returns {Array} Transformed data
 */
function transformDataColumnsBatched(data, columns, batchSize) {
  const transformedResults = [];
  
  // Process data in batches to manage memory
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const transformedBatch = transformDataColumns(batch, columns);
    transformedResults.push(...transformedBatch);
    
    // Memory management logging for large datasets
    if (i % (batchSize * 5) === 0 && data.length > 5000) {
      Logger.log(`Transformed ${i + batch.length}/${data.length} records...`);
    }
  }
  
  return transformedResults;
}

/**
 * Apply filters to the aggregated data
 * @param {Array} data - Data to filter
 * @param {Object} filters - Filter configuration object
 * @returns {Array} Filtered data
 */
function applyFilters(data, filters) {
  if (!filters || Object.keys(filters).length === 0) {
    return data;
  }
  
  return data.filter(function(record) {
    for (const filterKey in filters) {
      if (!filters.hasOwnProperty(filterKey)) continue;
      
      const filter = filters[filterKey];
      const operator = filter.operator;
      const filterValue = filter.value;
      
      // Get the actual data field using column mapping
      const dataField = REPORT_CONFIG.COLUMN_MAPPINGS[filterKey];
      if (!dataField) {
        // Skip invalid filter keys
        continue;
      }
      
      const recordValue = getNestedValue(record, dataField);
      
      // Apply filter based on operator
      if (!applyFilterCondition(recordValue, operator, filterValue)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Apply a single filter condition
 * @param {any} recordValue - Value from the record
 * @param {string} operator - Filter operator
 * @param {string} filterValue - Filter value
 * @returns {boolean} Whether the condition passes
 */
function applyFilterCondition(recordValue, operator, filterValue) {
  // Convert values for comparison
  const strRecordValue = String(recordValue || '').toLowerCase();
  const strFilterValue = String(filterValue).toLowerCase();
  
  switch (operator) {
    case '=':
      return strRecordValue === strFilterValue;
    case '!=':
      return strRecordValue !== strFilterValue;
    case '>':
      return parseFloat(recordValue) > parseFloat(filterValue);
    case '<':
      return parseFloat(recordValue) < parseFloat(filterValue);
    case '>=':
      return parseFloat(recordValue) >= parseFloat(filterValue);
    case '<=':
      return parseFloat(recordValue) <= parseFloat(filterValue);
    case 'contains':
      return strRecordValue.indexOf(strFilterValue) !== -1;
    default:
      return true;
  }
}

/**
 * Transform data to include only specified columns
 * @param {Array} data - Data to transform
 * @param {Array} columns - Column names to include
 * @returns {Array} Transformed data
 */
function transformDataColumns(data, columns) {
  return data.map(function(record) {
    const transformedRecord = {};
    
    for (let i = 0; i < columns.length; i++) {
      const columnName = columns[i];
      const dataField = REPORT_CONFIG.COLUMN_MAPPINGS[columnName];
      
      if (dataField) {
        transformedRecord[columnName] = getNestedValue(record, dataField);
      } else {
        transformedRecord[columnName] = null;
      }
    }
    
    return transformedRecord;
  });
}

/**
 * Sort report data by specified column and order
 * @param {Array} data - Data to sort (modified in place)
 * @param {string} sortBy - Column to sort by
 * @param {string} sortOrder - 'ASC' or 'DESC'
 */
function sortReportData(data, sortBy, sortOrder) {
  data.sort(function(a, b) {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortOrder === 'ASC' ? 1 : -1;
    if (bValue == null) return sortOrder === 'ASC' ? -1 : 1;
    
    // Try numeric comparison first
    const aNum = parseFloat(aValue);
    const bNum = parseFloat(bValue);
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
      const numComparison = aNum - bNum;
      return sortOrder === 'ASC' ? numComparison : -numComparison;
    }
    
    // String comparison
    const strComparison = String(aValue).localeCompare(String(bValue));
    return sortOrder === 'ASC' ? strComparison : -strComparison;
  });
}

/**
 * Apply summary aggregation to the data
 * @param {Array} data - Data to aggregate
 * @param {string} summaryType - Type of summary ('MEMBER_TOTALS', 'DAILY_TOTALS', 'PROJECT_TOTALS')
 * @returns {Array} Aggregated data
 */
function applySummaryAggregation(data, summaryType) {
  switch (summaryType) {
    case 'MEMBER_TOTALS':
      return aggregateByMember(data);
    case 'DAILY_TOTALS':
      return aggregateByDaily(data);
    case 'PROJECT_TOTALS':
      return aggregateByProject(data);
    default:
      return data;
  }
}

/**
 * Aggregate data by member
 * @param {Array} data - Data to aggregate
 * @returns {Array} Aggregated data by member
 */
function aggregateByMember(data) {
  const memberTotals = {};
  
  for (let i = 0; i < data.length; i++) {
    const record = data[i];
    const memberName = record['Member Name'] || record.memberName || 'Unknown Member';
    
    if (!memberTotals[memberName]) {
      memberTotals[memberName] = {
        'Member Name': memberName,
        'Total Hours': 0,
        'Record Count': 0
      };
      
      // Copy non-aggregatable fields from first occurrence
      for (const key in record) {
        if (record.hasOwnProperty(key) && 
            key !== 'Hours' && 
            key !== 'Total Hours' &&
            key !== 'Date' &&
            key !== 'Record Count') {
          memberTotals[memberName][key] = record[key];
        }
      }
    }
    
    // Aggregate numeric values
    const hours = parseFloat(record['Hours'] || record['Total Hours'] || record.hours || record.totalHours || 0);
    memberTotals[memberName]['Total Hours'] += hours;
    memberTotals[memberName]['Record Count'] += 1;
  }
  
  return Object.values(memberTotals);
}

/**
 * Aggregate data by daily totals
 * @param {Array} data - Data to aggregate
 * @returns {Array} Aggregated data by date
 */
function aggregateByDaily(data) {
  const dailyTotals = {};
  
  for (let i = 0; i < data.length; i++) {
    const record = data[i];
    const date = record['Date'] || record.date || 'Unknown Date';
    
    if (!dailyTotals[date]) {
      dailyTotals[date] = {
        'Date': date,
        'Total Hours': 0,
        'Member Count': 0,
        'Record Count': 0
      };
    }
    
    const hours = parseFloat(record['Hours'] || record['Total Hours'] || record.hours || record.totalHours || 0);
    dailyTotals[date]['Total Hours'] += hours;
    dailyTotals[date]['Record Count'] += 1;
  }
  
  // Count unique members per day
  const membersByDate = {};
  for (let i = 0; i < data.length; i++) {
    const record = data[i];
    const date = record['Date'] || record.date || 'Unknown Date';
    const memberName = record['Member Name'] || record.memberName || 'Unknown Member';
    
    if (!membersByDate[date]) {
      membersByDate[date] = new Set();
    }
    membersByDate[date].add(memberName);
  }
  
  for (const date in dailyTotals) {
    if (dailyTotals.hasOwnProperty(date)) {
      dailyTotals[date]['Member Count'] = membersByDate[date] ? membersByDate[date].size : 0;
    }
  }
  
  return Object.values(dailyTotals);
}

/**
 * Aggregate data by project totals  
 * @param {Array} data - Data to aggregate
 * @returns {Array} Aggregated data by project
 */
function aggregateByProject(data) {
  const projectTotals = {};
  
  for (let i = 0; i < data.length; i++) {
    const record = data[i];
    const projectName = record['Project Name'] || record.project || record.projectName || 'Unknown Project';
    
    if (!projectTotals[projectName]) {
      projectTotals[projectName] = {
        'Project Name': projectName,
        'Total Hours': 0,
        'Member Count': 0,
        'Record Count': 0
      };
    }
    
    const hours = parseFloat(record['Hours'] || record['Total Hours'] || record.hours || record.totalHours || 0);
    projectTotals[projectName]['Total Hours'] += hours;
    projectTotals[projectName]['Record Count'] += 1;
  }
  
  // Count unique members per project
  const membersByProject = {};
  for (let i = 0; i < data.length; i++) {
    const record = data[i];
    const projectName = record['Project Name'] || record.project || record.projectName || 'Unknown Project';
    const memberName = record['Member Name'] || record.memberName || 'Unknown Member';
    
    if (!membersByProject[projectName]) {
      membersByProject[projectName] = new Set();
    }
    membersByProject[projectName].add(memberName);
  }
  
  for (const projectName in projectTotals) {
    if (projectTotals.hasOwnProperty(projectName)) {
      projectTotals[projectName]['Member Count'] = membersByProject[projectName] ? membersByProject[projectName].size : 0;
    }
  }
  
  return Object.values(projectTotals);
}

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Object to get value from
 * @param {string} path - Dot notation path
 * @returns {any} Value at the path
 */
function getNestedValue(obj, path) {
  if (!obj || !path) return null;
  
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length; i++) {
    if (current == null || typeof current !== 'object') {
      return null;
    }
    current = current[keys[i]];
  }
  
  return current;
}

/**
 * Export report data to a Google Sheets file
 * @param {Array} reportData - Array of report data objects
 * @param {Object} metadataOrConfig - Report metadata object or configuration object
 * @param {string|Object} outputLocationOrFolder - 'new_file', 'current_sheet', or folder object
 * @returns {Object} Result object with success status, file info, and errors
 */
function exportReportToGoogleSheets(reportData, metadataOrConfig, outputLocationOrFolder) {
  try {
    // Handle both new signature (metadata, outputLocation) and legacy signature (config, folder)
    let metadata, outputLocation;
    
    if (typeof outputLocationOrFolder === 'string') {
      // New signature: (reportData, metadata, outputLocation)
      metadata = metadataOrConfig;
      outputLocation = outputLocationOrFolder;
    } else {
      // Legacy signature: (reportData, config, folder) - convert to new format
      const config = metadataOrConfig;
      metadata = {
        reportName: config.reportName,
        description: config.description,
        totalRecords: Array.isArray(reportData) ? reportData.length : 0,
        generatedAt: new Date().toISOString(),
        columns: config.columns || [],
        appliedFilters: config.filters || {},
        sortBy: config.sortBy || null,
        sortOrder: config.sortOrder || 'ASC',
        summaryType: config.summaryType || 'NONE'
      };
      outputLocation = 'new_file'; // Default for legacy calls
    }
    
    // Input validation
    if (!Array.isArray(reportData)) {
      return {
        success: false,
        fileId: null,
        fileName: null,
        sheetName: null,
        errors: ['Report data must be an array']
      };
    }
    
    if (!metadata || typeof metadata !== 'object') {
      return {
        success: false,
        fileId: null,
        fileName: null,
        sheetName: null,
        errors: ['Metadata must be a valid object']
      };
    }
    
    if (!outputLocation || (outputLocation !== 'new_file' && outputLocation !== 'current_sheet')) {
      outputLocation = 'new_file'; // Default fallback
    }
    
    // Handle empty data case
    if (reportData.length === 0) {
      return exportEmptyReport(metadata, outputLocation);
    }
    
    // Prepare data for export
    const exportData = prepareExportData(reportData, metadata);
    
    // Export based on location preference
    if (outputLocation === 'new_file') {
      return exportToNewFile(exportData, metadata);
    } else {
      return exportToCurrentSheet(exportData, metadata);
    }
    
  } catch (error) {
    console.error('Error exporting report to Google Sheets:', error);
    return {
      success: false,
      fileId: null,
      fileName: null,
      sheetName: null,
      errors: [`System error during export: ${error.message}`]
    };
  }
}

/**
 * Export empty report with metadata only
 * @param {Object} metadata - Report metadata
 * @param {string} outputLocation - Export location
 * @returns {Object} Export result
 */
function exportEmptyReport(metadata, outputLocation) {
  const emptyData = [
    ['Report Name', metadata.reportName],
    ['Description', metadata.description],
    ['Generated At', metadata.generatedAt],
    ['Total Records', '0'],
    ['Status', 'No data matches the specified criteria'],
    [''],
    ['Column Headers', metadata.columns ? metadata.columns.join(', ') : 'None specified']
  ];
  
  if (outputLocation === 'new_file') {
    return createNewFileWithData(emptyData, metadata.reportName + ' (Empty)', 'Empty Report');
  } else {
    return addToCurrentSheet(emptyData, metadata.reportName + ' (Empty)');
  }
}

/**
 * Prepare data for export including headers and metadata
 * @param {Array} reportData - Report data to export
 * @param {Object} metadata - Report metadata
 * @returns {Array} 2D array ready for sheet export
 */
function prepareExportData(reportData, metadata) {
  const exportData = [];
  
  // Add metadata header section
  exportData.push(['Report Name', metadata.reportName]);
  exportData.push(['Description', metadata.description]);
  exportData.push(['Generated At', metadata.generatedAt]);
  exportData.push(['Total Records', metadata.totalRecords.toString()]);
  
  if (metadata.originalRecords !== undefined) {
    exportData.push(['Original Records', metadata.originalRecords.toString()]);
    exportData.push(['Filtered Records', metadata.filteredRecords.toString()]);
  }
  
  if (metadata.sortBy) {
    exportData.push(['Sorted By', `${metadata.sortBy} (${metadata.sortOrder})`]);
  }
  
  if (metadata.summaryType && metadata.summaryType !== 'NONE') {
    exportData.push(['Summary Type', metadata.summaryType]);
  }
  
  if (metadata.appliedFilters && Object.keys(metadata.appliedFilters).length > 0) {
    const filterStrings = [];
    for (const key in metadata.appliedFilters) {
      if (metadata.appliedFilters.hasOwnProperty(key)) {
        const filter = metadata.appliedFilters[key];
        filterStrings.push(`${key} ${filter.operator} ${filter.value}`);
      }
    }
    exportData.push(['Applied Filters', filterStrings.join(', ')]);
  }
  
  // Add separator
  exportData.push(['']);
  
  // Add data section
  if (reportData.length > 0) {
    // Extract column headers from first record
    const headers = Object.keys(reportData[0]);
    exportData.push(headers);
    
    // Add data rows
    for (let i = 0; i < reportData.length; i++) {
      const record = reportData[i];
      const row = [];
      for (let j = 0; j < headers.length; j++) {
        const value = record[headers[j]];
        row.push(value != null ? value.toString() : '');
      }
      exportData.push(row);
    }
  }
  
  return exportData;
}

/**
 * Export data to a new Google Sheets file
 * @param {Array} exportData - 2D array of data to export
 * @param {Object} metadata - Report metadata
 * @returns {Object} Export result with file information
 */
function exportToNewFile(exportData, metadata) {
  try {
    // Create new spreadsheet
    const fileName = `${metadata.reportName}_${formatDateForFilename(new Date())}`;
    const newSpreadsheet = SpreadsheetApp.create(fileName);
    const sheet = newSpreadsheet.getActiveSheet();
    
    // Rename the default sheet
    sheet.setName(metadata.reportName);
    
    // Write data to sheet with batch processing for large datasets
    if (exportData.length > 0) {
      const WRITE_BATCH_SIZE = 1000; // Google Sheets API limit considerations
      
      if (exportData.length > WRITE_BATCH_SIZE) {
        // Large dataset - write in batches
        const maxColumns = getMaxColumns(exportData);
        let currentRow = 1;
        
        for (let i = 0; i < exportData.length; i += WRITE_BATCH_SIZE) {
          const batch = exportData.slice(i, i + WRITE_BATCH_SIZE);
          const range = sheet.getRange(currentRow, 1, batch.length, maxColumns);
          range.setValues(batch);
          currentRow += batch.length;
          
          // Progress logging for very large exports
          if (exportData.length > 5000 && i % (WRITE_BATCH_SIZE * 3) === 0) {
            Logger.log(`Exported ${i + batch.length}/${exportData.length} rows to Google Sheets...`);
          }
        }
      } else {
        // Small dataset - write all at once
        const range = sheet.getRange(1, 1, exportData.length, getMaxColumns(exportData));
        range.setValues(exportData);
      }
      
      // Format the sheet
      formatReportSheet(sheet, exportData, metadata);
    }
    
    // Move file to same folder as current spreadsheet (if possible)
    try {
      const currentFile = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
      const parentFolders = currentFile.getParents();
      if (parentFolders.hasNext()) {
        const parentFolder = parentFolders.next();
        const newFile = DriveApp.getFileById(newSpreadsheet.getId());
        newFile.moveTo(parentFolder);
      }
    } catch (moveError) {
      Logger.log('Could not move file to parent folder: ' + moveError.message);
      // This is not a critical error, file will remain in root
    }
    
    return {
      success: true,
      fileId: newSpreadsheet.getId(),
      fileName: fileName,
      sheetName: metadata.reportName,
      errors: []
    };
    
  } catch (error) {
    console.error('Error creating new file:', error);
    return {
      success: false,
      fileId: null,
      fileName: null,
      sheetName: null,
      errors: [`Failed to create new file: ${error.message}`]
    };
  }
}

/**
 * Export data to current spreadsheet as new sheet
 * @param {Array} exportData - 2D array of data to export
 * @param {Object} metadata - Report metadata
 * @returns {Object} Export result with sheet information
 */
function exportToCurrentSheet(exportData, metadata) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // Generate unique sheet name
    let sheetName = metadata.reportName;
    let counter = 1;
    while (spreadsheet.getSheetByName(sheetName)) {
      sheetName = `${metadata.reportName}_${counter}`;
      counter++;
    }
    
    // Create new sheet
    const sheet = spreadsheet.insertSheet(sheetName);
    
    // Write data to sheet with batch processing for large datasets
    if (exportData.length > 0) {
      const WRITE_BATCH_SIZE = 1000; // Google Sheets API limit considerations
      
      if (exportData.length > WRITE_BATCH_SIZE) {
        // Large dataset - write in batches
        const maxColumns = getMaxColumns(exportData);
        let currentRow = 1;
        
        for (let i = 0; i < exportData.length; i += WRITE_BATCH_SIZE) {
          const batch = exportData.slice(i, i + WRITE_BATCH_SIZE);
          const range = sheet.getRange(currentRow, 1, batch.length, maxColumns);
          range.setValues(batch);
          currentRow += batch.length;
          
          // Progress logging for very large exports
          if (exportData.length > 5000 && i % (WRITE_BATCH_SIZE * 3) === 0) {
            Logger.log(`Exported ${i + batch.length}/${exportData.length} rows to sheet "${sheetName}"...`);
          }
        }
      } else {
        // Small dataset - write all at once
        const range = sheet.getRange(1, 1, exportData.length, getMaxColumns(exportData));
        range.setValues(exportData);
      }
      
      // Format the sheet
      formatReportSheet(sheet, exportData, metadata);
    }
    
    return {
      success: true,
      fileId: spreadsheet.getId(),
      fileName: spreadsheet.getName(),
      sheetName: sheetName,
      errors: []
    };
    
  } catch (error) {
    console.error('Error adding sheet to current file:', error);
    return {
      success: false,
      fileId: null,
      fileName: null,
      sheetName: null,
      errors: [`Failed to add sheet to current file: ${error.message}`]
    };
  }
}

/**
 * Create new file with simple data (for empty reports)
 * @param {Array} data - Simple 2D data array
 * @param {string} fileName - Name for the new file
 * @param {string} sheetName - Name for the sheet
 * @returns {Object} Export result
 */
function createNewFileWithData(data, fileName, sheetName) {
  try {
    const newSpreadsheet = SpreadsheetApp.create(fileName);
    const sheet = newSpreadsheet.getActiveSheet();
    sheet.setName(sheetName);
    
    if (data.length > 0) {
      const range = sheet.getRange(1, 1, data.length, getMaxColumns(data));
      range.setValues(data);
      
      // Basic formatting
      const headerRange = sheet.getRange(1, 1, 1, getMaxColumns(data));
      headerRange.setFontWeight('bold');
    }
    
    return {
      success: true,
      fileId: newSpreadsheet.getId(),
      fileName: fileName,
      sheetName: sheetName,
      errors: []
    };
    
  } catch (error) {
    return {
      success: false,
      fileId: null,
      fileName: null,
      sheetName: null,
      errors: [`Failed to create file: ${error.message}`]
    };
  }
}

/**
 * Add data to current sheet (for empty reports)
 * @param {Array} data - Simple 2D data array
 * @param {string} sheetName - Name for the new sheet
 * @returns {Object} Export result
 */
function addToCurrentSheet(data, sheetName) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // Generate unique sheet name
    let finalSheetName = sheetName;
    let counter = 1;
    while (spreadsheet.getSheetByName(finalSheetName)) {
      finalSheetName = `${sheetName}_${counter}`;
      counter++;
    }
    
    const sheet = spreadsheet.insertSheet(finalSheetName);
    
    if (data.length > 0) {
      const range = sheet.getRange(1, 1, data.length, getMaxColumns(data));
      range.setValues(data);
      
      // Basic formatting
      const headerRange = sheet.getRange(1, 1, 1, getMaxColumns(data));
      headerRange.setFontWeight('bold');
    }
    
    return {
      success: true,
      fileId: spreadsheet.getId(),
      fileName: spreadsheet.getName(),
      sheetName: finalSheetName,
      errors: []
    };
    
  } catch (error) {
    return {
      success: false,
      fileId: null,
      fileName: null,
      sheetName: null,
      errors: [`Failed to add sheet: ${error.message}`]
    };
  }
}

/**
 * Format the report sheet with styling and formatting
 * @param {Sheet} sheet - Google Sheets sheet object
 * @param {Array} exportData - The exported data
 * @param {Object} metadata - Report metadata
 */
function formatReportSheet(sheet, exportData, metadata) {
  try {
    // Find the data header row (after metadata section)
    let dataHeaderRowIndex = -1;
    for (let i = 0; i < exportData.length; i++) {
      if (exportData[i].length > 0 && exportData[i][0] === '') {
        // Found separator row, data headers should be next
        if (i + 1 < exportData.length) {
          dataHeaderRowIndex = i + 2; // Convert to 1-based indexing
          break;
        }
      }
    }
    
    // Format metadata section (first part)
    const metadataEndRow = dataHeaderRowIndex > 0 ? dataHeaderRowIndex - 2 : exportData.length;
    if (metadataEndRow > 0) {
      const metadataRange = sheet.getRange(1, 1, metadataEndRow, 2);
      metadataRange.setFontWeight('bold');
      metadataRange.setBackground('#f0f0f0');
    }
    
    // Format data headers if they exist
    if (dataHeaderRowIndex > 0 && dataHeaderRowIndex <= exportData.length) {
      const headerRange = sheet.getRange(dataHeaderRowIndex, 1, 1, exportData[dataHeaderRowIndex - 1].length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4a90e2');
      headerRange.setFontColor('#ffffff');
    }
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, Math.min(getMaxColumns(exportData), 26)); // Limit to 26 columns for performance
    
    // Freeze the metadata and header rows
    if (dataHeaderRowIndex > 0) {
      sheet.setFrozenRows(dataHeaderRowIndex);
    }
    
  } catch (formatError) {
    Logger.log('Warning: Could not apply formatting: ' + formatError.message);
    // Formatting is not critical, continue without it
  }
}

/**
 * Get maximum number of columns in a 2D array
 * @param {Array} data - 2D array
 * @returns {number} Maximum column count
 */
function getMaxColumns(data) {
  let maxCols = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i].length > maxCols) {
      maxCols = data[i].length;
    }
  }
  return Math.max(maxCols, 1);
}

/**
 * Format date for filename (YYYY-MM-DD_HH-MM)
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDateForFilename(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}_${hours}-${minutes}`;
}

// ============================================================================
// UI FUNCTIONS FOR CONFIGURATION-DRIVEN REPORT EXPORT
// ============================================================================

/**
 * UI function to export configurable reports
 * Shows configuration selection and handles the export process
 */
function exportConfigurableReportUI() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // Get available configurations
    ui.alert('Initializing...', 'Loading report configurations...', ui.ButtonSet.OK);
    const configResult = readReportConfigurations();
    
    if (!configResult.success || configResult.configurations.length === 0) {
      ui.alert(
        'No Report Configurations',
        'No valid report configurations found. Please set up configurations in the "Report Configs" sheet first.',
        ui.ButtonSet.OK
      );
      return;
    }
    
    // Show configuration selection dialog
    const selectedConfig = selectReportConfigurationUI(configResult.configurations);
    if (!selectedConfig) {
      return; // User cancelled
    }
    
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
    
    // Generate report with progress tracking
    const reportStartTime = new Date().getTime();
    ui.alert('Generating Report...', `Creating "${selectedConfig.reportName}" report with specified filters and formatting...`, ui.ButtonSet.OK);
    
    const reportResult = generateConfigurableReport(aggregatedData.entries, selectedConfig);
    
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
    
    // Export to Google Sheets with progress tracking
    const exportStartTime = new Date().getTime();
    ui.alert('Exporting...', `Creating Google Sheets file for "${selectedConfig.reportName}" with ${reportResult.reportData.length} records...`, ui.ButtonSet.OK);
    
    const exportResult = exportReportToGoogleSheets(reportResult.reportData, reportResult.metadata, 'new_file');
    
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
