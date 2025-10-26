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
        type: ERROR_TYPES.FOLDER_ACCESS,
        source: 'FOLDER_DISCOVERY',
        message: 'No folder found with name \'' + yearMonth + '\'. Please ensure the monthly folder exists in Google Drive.',
        severity: SEVERITY_LEVELS.ERROR,
        timestamp: new Date().toISOString()
      });
      return result;
    }
    
    if (foundFolders.length > 1) {
      result.errors.push({
        type: ERROR_TYPES.FOLDER_ACCESS,
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
