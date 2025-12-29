// ============================================================================
// TIMESHEET AGGREGATION MODULE
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
    
    // Get the folder where this script is located
    let scriptFolder;
    try {
      // Get the current script file and its parent folder
      const scriptFile = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
      scriptFolder = scriptFile.getParents().next();
    } catch (scriptError) {
      // Cannot determine script location - fail cleanly
      result.errors.push({
        type: ERROR_TYPES.SYSTEM_FAILURE,
        source: 'SCRIPT_LOCATION',
        message: 'Could not determine script location: ' + scriptError.message + '. Unable to search for monthly folder.',
        severity: SEVERITY_LEVELS.ERROR,
        timestamp: new Date().toISOString()
      });
      result.metadata.searchTimeMs = Date.now() - startTime;
      return result;
    }
    
    // Search for folders matching the month name within the script's parent folder
    const subfolders = scriptFolder.getFolders();
    const foundFolders = [];
    
    while (subfolders.hasNext()) {
      const folder = subfolders.next();
      if (folder.getName() === yearMonth) {
        foundFolders.push(folder);
      }
    }
    
    result.metadata.foldersFound = foundFolders.length;
    result.metadata.searchTimeMs = Date.now() - startTime;
    
    if (foundFolders.length === 0) {
      result.errors.push({
        type: ERROR_TYPES.FOLDER_ACCESS,
        source: 'FOLDER_DISCOVERY',
        message: 'No folder found with name \'' + yearMonth + '\' in the script location. Please ensure the monthly folder exists in the same folder as the script.',
        severity: SEVERITY_LEVELS.ERROR,
        timestamp: new Date().toISOString()
      });
      return result;
    }
    
    if (foundFolders.length > 1) {
      result.errors.push({
        type: ERROR_TYPES.FOLDER_ACCESS,
        source: 'FOLDER_DISCOVERY',
        message: 'Found ' + foundFolders.length + ' folders named \'' + yearMonth + '\' in the script location. Using the first one found.',
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
 * @param {GoogleAppsScript.Drive.Folder} folder - Google Drive folder to search
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
          type: ERROR_TYPES.MISSING_DATA,
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
          type: ERROR_TYPES.FILE_ACCESS,
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
 * @param {number} rowIndex - Row index for error reporting
 * @returns {Object} Validation result with isValid flag and errors
 */
function validateTimesheetEntry(entry, memberName, rowIndex) {
  const result = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  try {
    // Check for empty entry - if so, silently skip (members can add empty rows for separation)
    if (!entry || entry.length === 0) {
      result.isValid = false;
      // Don't log an error for empty rows - they're allowed for visual separation
      return result;
    }
    
    // Check if all cells are empty - if so, silently skip (members can add empty rows for separation)
    const hasData = entry.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
    if (!hasData) {
      result.isValid = false;
      // Don't log an error for empty rows - they're allowed for visual separation
      return result;
    }
    
    // Map entry to expected columns
    const mappedEntry = mapEntryToColumns(entry);
    
    // Check if this is actually a meaningful entry (has any non-empty fields or OFF is TRUE)
    const regularFields = ['date', 'from_time', 'to_time', 'project', 'task_type', 'description', 'tc_from_time', 'tc_to_time'];
    const hasRegularData = regularFields.some(field => {
      const value = mappedEntry[field];
      return value && String(value).trim() !== '';
    });
    
    // Check if OFF field has any value selected (meaningful for time-off entries)
    const offFieldValue = String(mappedEntry.off).trim();
    const isOffDay = offFieldValue && offFieldValue !== '';
    
    const hasMeaningfulData = hasRegularData || isOffDay;
    
    if (!hasMeaningfulData) {
      // This is effectively an empty row, silently skip (members can add empty rows for separation)
      result.isValid = false;
      // Don't log an error for rows with no meaningful data - they're allowed for visual separation
      return result;
    }
    
    // Validate always-required fields
    const requiredFields = TIMESHEET_TEMPLATE_CONFIG.REQUIRED_FIELDS.map(function(field) {
      return AGGREGATION_CONFIG.FIELD_MAPPINGS[field];
    }).filter(Boolean);
    
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
    
    // Validate conditionally required fields (only required if not OFF day)
    if (!isOffDay && TIMESHEET_TEMPLATE_CONFIG.CONDITIONALLY_REQUIRED_FIELDS) {
      const conditionalFields = TIMESHEET_TEMPLATE_CONFIG.CONDITIONALLY_REQUIRED_FIELDS.map(function(field) {
        return AGGREGATION_CONFIG.FIELD_MAPPINGS[field];
      }).filter(Boolean);
      
      for (const field of conditionalFields) {
        const value = mappedEntry[field];
        if (!value || String(value).trim() === '') {
          result.isValid = false;
          result.errors.push({
            type: ERROR_TYPES.INVALID_ENTRY,
            source: 'CONDITIONAL_FIELD_VALIDATION',
            message: `Missing required field '${field}' in row ${rowIndex} (required unless OFF time)`,
            severity: SEVERITY_LEVELS.ERROR,
            timestamp: new Date().toISOString(),
            memberName: memberName,
            rowIndex: rowIndex,
            field: field
          });
        }
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
    
    // Validate TC time pair consistency (both TC times should be present together)
    const tcFromTime = mappedEntry.tc_from_time && String(mappedEntry.tc_from_time).trim();
    const tcToTime = mappedEntry.tc_to_time && String(mappedEntry.tc_to_time).trim();
    
    if ((tcFromTime && !tcToTime) || (!tcFromTime && tcToTime)) {
      result.isValid = false;
      result.errors.push({
        type: ERROR_TYPES.INVALID_ENTRY,
        source: 'TC_TIME_VALIDATION',
        message: `TC From Time and TC To Time must be provided together in row ${rowIndex}. Found: TC From Time='${tcFromTime || '(empty)'}', TC To Time='${tcToTime || '(empty)'}'`,
        severity: SEVERITY_LEVELS.ERROR,
        timestamp: new Date().toISOString(),
        memberName: memberName,
        rowIndex: rowIndex,
        field: tcFromTime ? 'tc_to_time' : 'tc_from_time'
      });
    }
    
    // Validate TC time logic (tc_from_time < tc_to_time) if both are present
    if (tcFromTime && tcToTime) {
      const tcFromMinutes = parseTimeToMinutes(tcFromTime);
      const tcToMinutes = parseTimeToMinutes(tcToTime);
      
      if (tcFromMinutes !== null && tcToMinutes !== null && tcFromMinutes >= tcToMinutes) {
        result.warnings.push({
          type: ERROR_TYPES.INVALID_ENTRY,
          source: 'TC_TIME_LOGIC_VALIDATION',
          message: `TC From time (${tcFromTime}) should be before TC To time (${tcToTime}) in row ${rowIndex}`,
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
 * Maps a raw entry array to expected column structure using fixed position-based mapping
 * @param {Array} entry - Raw row data
 * @returns {Object} Mapped entry object
 */
function mapEntryToColumns(entry) {
  const mapped = {
    date: '',
    from_time: '',
    to_time: '',
    project: '',
    task_type: '',
    description: '',
    tc_from_time: '',
    tc_to_time: '',
    off: ''
  };
  
  // Position-based mapping using fixed column order
  TIMESHEET_TEMPLATE_CONFIG.COLUMN_ORDER.forEach(function(fieldName, index) {
    if (index >= entry.length) return;
    
    const value = entry[index];
    const targetField = AGGREGATION_CONFIG.FIELD_MAPPINGS[fieldName];
    
    if (targetField) {
      mapped[targetField] = value || '';
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
 * Normalizes a timesheet entry to standard format
 * @param {Array} entry - Raw row data
 * @param {string} memberName - Member name
 * @param {number} rowIndex - Row index for error reporting
 * @returns {Object} Normalized entry object
 */
function normalizeTimesheetEntry(entry, memberName, rowIndex) {
  try {
    // Map entry to expected columns
    const mappedEntry = mapEntryToColumns(entry);
    
    // Normalize OFF flag (any selected value means time-off)
    const offValue = String(mappedEntry.off).trim();
    const isOffDay = offValue && offValue !== '';
    
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
      off: isOffDay,
      off_type: isOffDay ? offValue : '',
      
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
      const validation = validateTimesheetEntry(row, timesheetFile.memberName, rowIndex);
      
      // Add validation errors/warnings to result
      result.errors.push(...validation.errors);
      result.errors.push(...validation.warnings);
      
      if (validation.isValid) {
        // Normalize the valid entry
        const normalized = normalizeTimesheetEntry(row, timesheetFile.memberName, rowIndex);
        result.entries.push(normalized);
        result.metadata.validEntries++;
        result.metadata.normalizedEntries++;
      } else {
        result.metadata.invalidEntries++;
        console.log(`Error row data for ${timesheetFile.fileName} row ${rowIndex}:`, [row, timesheetFile.memberName, rowIndex]);
      }
    });
    
    result.metadata.processingTimeMs = Date.now() - startTime;
    
    // Log processing summary
    console.log(`Processed ${timesheetFile.fileName}: ${result.metadata.validEntries} valid entries, ${result.metadata.invalidEntries} invalid entries`);
    console.log(`Errors and warnings for ${timesheetFile.fileName}:`, result.errors);
    
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
      type: ERROR_TYPES.FORMAT_ERROR,
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
        type: ERROR_TYPES.FORMAT_ERROR,
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
        type: ERROR_TYPES.FOLDER_ACCESS,
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
// TEMPLATE ADAPTATION UTILITIES
// ============================================================================
// 🚨 FUNCTIONS TO HELP WITH TEMPLATE CHANGES 🚨

/**
 * Get all field names that should be expected in timesheet data
 * @returns {Array} Array of internal field names
 */
function getExpectedDataFields() {
  const allFields = [...TIMESHEET_TEMPLATE_CONFIG.REQUIRED_FIELDS, ...TIMESHEET_TEMPLATE_CONFIG.OPTIONAL_FIELDS, ...TIMESHEET_TEMPLATE_CONFIG.CONDITIONALLY_REQUIRED_FIELDS];
  return allFields.map(field => AGGREGATION_CONFIG.FIELD_MAPPINGS[field]).filter(Boolean);
}

/**
 * Check if a field is required in the current template
 * @param {string} fieldKey - Header field key (e.g., 'DATE', 'PROJECT')
 * @returns {boolean} True if field is required
 */
function isRequiredField(fieldKey) {
  return TIMESHEET_TEMPLATE_CONFIG.REQUIRED_FIELDS.includes(fieldKey);
}

/**
 * Validate data structure against current template requirements
 * @param {Object} data - Aggregated timesheet data
 * @returns {Object} Validation result with warnings about template compatibility
 */
function validateTemplateCompatibility(data) {
  const result = {
    isCompatible: true,
    warnings: [],
    missingFields: [],
    extraFields: []
  };
  
  if (!data.entries || data.entries.length === 0) {
    return result;
  }
  
  const sampleEntry = data.entries[0];
  const expectedFields = getExpectedDataFields();
  const actualFields = Object.keys(sampleEntry);
  
  // Check for missing expected fields
  expectedFields.forEach(field => {
    if (!actualFields.includes(field)) {
      result.missingFields.push(field);
      result.warnings.push(`Expected field '${field}' not found in data`);
    }
  });
  
  // Check for unexpected fields (might indicate template changes)
  actualFields.forEach(field => {
    if (!expectedFields.includes(field) && !['source_file', 'row_index', 'processed_at'].includes(field)) {
      result.extraFields.push(field);
      result.warnings.push(`Unexpected field '${field}' found in data - template may have changed`);
    }
  });
  
  result.isCompatible = result.missingFields.length === 0;
  
  return result;
}

/**
 * Generate template update guidance when template changes are detected
 * @param {Object} validationResult - Result from validateTemplateCompatibility
 * @returns {Array} Array of update instructions
 */
function generateTemplateUpdateGuidance(validationResult) {
  const guidance = [];
  
  if (validationResult.missingFields.length > 0) {
    guidance.push('MISSING FIELDS DETECTED:');
    guidance.push('1. Update AGGREGATION_CONFIG.EXPECTED_HEADERS in constants.js');
    guidance.push('2. Update AGGREGATION_CONFIG.FIELD_MAPPINGS in constants.js');
    guidance.push('3. Update TIMESHEET_TEMPLATE_CONFIG.REQUIRED_FIELDS or OPTIONAL_FIELDS');
    guidance.push(`   Missing: ${validationResult.missingFields.join(', ')}`);
  }
  
  if (validationResult.extraFields.length > 0) {
    guidance.push('NEW FIELDS DETECTED:');
    guidance.push('1. Check if these are new template fields:');
    guidance.push(`   Found: ${validationResult.extraFields.join(', ')}`);
    guidance.push('2. Add to EXPECTED_HEADERS if they should be processed');
    guidance.push('3. Add to FIELD_MAPPINGS with appropriate target names');
    guidance.push('4. Add to REQUIRED_FIELDS or OPTIONAL_FIELDS as appropriate');
  }
  
  if (guidance.length > 0) {
    guidance.unshift('🚨 TEMPLATE UPDATE REQUIRED 🚨');
    guidance.push('');
    guidance.push('After updating constants.js:');
    guidance.push('- Test with sample timesheet files');
    guidance.push('- Update TIMESHEET_TEMPLATE_CONFIG.TEMPLATE_VERSION');
    guidance.push('- Update TIMESHEET_TEMPLATE_CONFIG.TEMPLATE_LAST_UPDATED');
  }
  
  return guidance;
}

/**
 * 🔧 TEMPLATE DIAGNOSTIC FUNCTION
 * Run this function when template changes to check compatibility
 * Call from Apps Script editor: templateDiagnostic()
 */
function templateDiagnostic() {
  try {
    console.log('=== TIMESHEET TEMPLATE DIAGNOSTIC ===');
    console.log(`Template Version: ${TIMESHEET_TEMPLATE_CONFIG.TEMPLATE_VERSION}`);
    console.log(`Last Updated: ${TIMESHEET_TEMPLATE_CONFIG.TEMPLATE_LAST_UPDATED}`);
    console.log('');
    
    // Get current time and test with sample data
    const time = readTime();
    console.log(`Testing with time period: ${time}`);
    
    // Try to get folder
    const folderResult = getMonthlyFolder(time);
    if (!folderResult.folder) {
      console.log('❌ No monthly folder found for testing: ', folderResult.errors);
      console.log('Create a test folder and timesheet files first');
      return;
    }
    
    console.log(`✅ Found folder: ${folderResult.folder.getName()}`);
    
    // Try aggregation
    const aggregationResult = aggregateMonthlyTimesheets(time);
    if (!aggregationResult || !aggregationResult.entries) {
      console.log('❌ No data aggregated - check timesheet files');
      return;
    }
    
    console.log(`✅ Aggregated ${aggregationResult.entries.length} entries`);
    
    // Check template compatibility
    const compatibility = validateTemplateCompatibility(aggregationResult);
    
    if (compatibility.isCompatible) {
      console.log('✅ Template is compatible with current data');
    } else {
      console.log('⚠️ Template compatibility issues detected');
    }
    
    if (compatibility.warnings.length > 0) {
      console.log('');
      console.log('WARNINGS:');
      compatibility.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    // Show update guidance if needed
    const guidance = generateTemplateUpdateGuidance(compatibility);
    if (guidance.length > 0) {
      console.log('');
      guidance.forEach(line => console.log(line));
    }
    
    // Show current field mappings
    console.log('');
    console.log('CURRENT FIELD MAPPINGS:');
    Object.entries(AGGREGATION_CONFIG.FIELD_MAPPINGS).forEach(([key, value]) => {
      const required = isRequiredField(key) ? '[REQUIRED]' : '[OPTIONAL]';
      console.log(`  ${key} → ${value} ${required}`);
    });
    
    // Show sample data structure
    if (aggregationResult.entries.length > 0) {
      console.log('');
      console.log('SAMPLE DATA STRUCTURE:');
      console.log(JSON.stringify(aggregationResult.entries[0], null, 2));
    }
    
    return {
      compatible: compatibility.isCompatible,
      warnings: compatibility.warnings,
      guidance: guidance,
      sampleData: aggregationResult.entries[0]
    };
    
  } catch (error) {
    console.error('Template diagnostic error:', error.message);
    return {
      error: error.message,
      guidance: ['Check that timesheet files exist and are properly formatted']
    };
  }
}
