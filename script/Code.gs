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
  TIMEOUT_WARNING: 'TIMEOUT_WARNING'
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