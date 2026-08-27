// ============================================================================
// TIMESHEET GENERATION MODULE
// ============================================================================

/**
 * Create a timesheet folder for the specified time period
 * @param {string} time - Time period in YYYY-MM format
 * @returns {Object} Google Drive folder object
 */
function createTimesheetFolder(time) {
  const folderName = `${time}`;
  //create folder in current spreadsheet folder
  const parentFolder = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId()).getParents().next();
  const memberTimesheetFolder = parentFolder.getFoldersByName(AGGREGATION_CONFIG.TIMESHEET_FOLDER).next();
  let folder;
  //check if folder already exists
  const folders = memberTimesheetFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = memberTimesheetFolder.createFolder(folderName);
  }
  return folder;
}

/**
 * Create a timesheet file for a specific member
 * @param {Object} folder - Google Drive folder object
 * @param {Array} member - Member data array
 * @param {string} time - Time period in YYYY-MM format
 */
function createTimesheetFile(folder, member, time) {
  //copy from template file
  const fileName = `Timesheet_${time}_${member[MEMBER_COLUMNS.NAME]}`;
  //check if file was existed in the folder
  const files = folder.getFilesByName(fileName);
  if (files.hasNext()) {
    return; //file already exists
  }
  
  const templateFile = DriveApp.getFileById(TEMPLATE_FILE_ID);
  const newFile = templateFile.makeCopy(fileName, folder);
  //move new file to folder
  newFile.moveTo(folder);
  //generate edit permission for member email
  if (member[MEMBER_COLUMNS.EMAIL]) {
    //add member as editor
    newFile.addEditor(member[MEMBER_COLUMNS.EMAIL]);
  }
}

/**
 * Change member's permission from editor to viewer for their timesheet file
 * @param {Object} folder - Google Drive folder object
 * @param {Array} member - Member data array
 * @param {string} time - Time period in YYYY-MM format
 * @returns {Object} Result with success status and message
 */
function changeTimesheetPermissionToViewer(folder, member, time) {
  try {
    const fileName = `Timesheet_${time}_${member[MEMBER_COLUMNS.NAME]}`;
    const files = folder.getFilesByName(fileName);
    
    if (!files.hasNext()) {
      return {
        success: false,
        message: `File not found: ${fileName}`
      };
    }
    
    const file = files.next();
    const memberEmail = member[MEMBER_COLUMNS.EMAIL];
    
    if (!memberEmail) {
      return {
        success: false,
        message: `No email found for member: ${member[MEMBER_COLUMNS.NAME]}`
      };
    }
    
    // Remove editor permission
    file.removeEditor(memberEmail);
    
    // Add viewer permission
    file.addViewer(memberEmail);
    
    Logger.log(`Changed permission for ${memberEmail} from editor to viewer: ${fileName}`);
    
    return {
      success: true,
      message: `Successfully changed permission for ${member[MEMBER_COLUMNS.NAME]}`
    };
    
  } catch (error) {
    Logger.log(`Error changing permission for ${member[MEMBER_COLUMNS.NAME]}: ${error.message}`);
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Change all member timesheet permissions from editor to viewer for a specific time period
 * @param {string} time - Time period in YYYY-MM format
 * @returns {Object} Result with success counts and errors
 */
function changeAllTimesheetsToViewOnly(time) {
  try {
    Logger.log(`Starting permission change for time period: ${time}`);
    
    const result = {
      processed: 0,
      success: 0,
      failed: 0,
      errors: []
    };
    
    // Get members using the same method as generateTimesheetFiles
    const members = readMembers();
    
    if (!members || members.length === 0) {
      result.errors.push('No members found');
      return result;
    }
    
    // Get the folder using the same method as generateTimesheetFiles
    const folder = createTimesheetFolder(time);
    
    Logger.log(`Found ${members.length} members, processing folder: ${folder.getName()}`);
    
    // Process each member
    members.forEach(function(member) {
      result.processed++;
      
      const changeResult = changeTimesheetPermissionToViewer(folder, member, time);
      
      if (changeResult.success) {
        result.success++;
        Logger.log(`✓ ${changeResult.message}`);
      } else {
        result.failed++;
        result.errors.push(changeResult.message);
        Logger.log(`✗ ${changeResult.message}`);
      }
      
      // Add delay every 10 files to avoid quota issues
      if (result.processed % 10 === 0) {
        Utilities.sleep(1000);
      }
    });
    
    Logger.log('=== Permission Change Summary ===');
    Logger.log(`Total processed: ${result.processed}`);
    Logger.log(`Successfully changed: ${result.success}`);
    Logger.log(`Failed: ${result.failed}`);
    
    if (result.errors.length > 0) {
      Logger.log('Errors:');
      result.errors.forEach(function(error) {
        Logger.log(`  - ${error}`);
      });
    }
    
    return result;
    
  } catch (error) {
    Logger.log(`Error in changeAllTimesheetsToViewOnly: ${error.message}`);
    throw error;
  }
}

/**
 * Setup the master template file with dual-session layout for a specific month
 * This function should be called once to prepare the template before copying to members
 * @param {string} time - Time period in YYYY-MM format
 */
function setupMasterTemplate(time) {
  try {
    // Open the template file
    const spreadsheet = SpreadsheetApp.openById(TEMPLATE_FILE_ID);
    const sheet = spreadsheet.getActiveSheet();
    
    Logger.log(`Setting up master template for ${time}...`);
    
    // Setup dates with 2 rows per working day
    // Parse time period
    const [year, month] = time.split('-');
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    setupMonthlyDatesWithSessions(sheet, yearNum, monthNum);
    
    // Save changes
    SpreadsheetApp.flush();
    
    Logger.log(`Master template setup completed for ${time}`);
  } catch (error) {
    Logger.log(`Error in setupMasterTemplate: ${error.message}`);
    throw error;
  }
}

/**
 * Setup monthly dates with 2 rows per working day and weekend highlighting
 * @param {Object} sheet - Google Sheets sheet object
 * @param {number} year - Year number
 * @param {number} month - Month number (1-12)
 */
function setupMonthlyDatesWithSessions(sheet, year, month) {
  try {
    // Use the global template configuration from constants.js
    const columnOrder = TIMESHEET_TEMPLATE_CONFIG.COLUMN_ORDER;
    
    // Create column mapping based on COLUMN_ORDER (0-based index to 1-based column number)
    const TEMPLATE_CONFIG = {
      DATE_COLUMN: columnOrder.indexOf('DATE') + 1,
      FROM_TIME_COLUMN: columnOrder.indexOf('FROM_TIME') + 1,
      TO_TIME_COLUMN: columnOrder.indexOf('TO_TIME') + 1,
      PROJECT_COLUMN: columnOrder.indexOf('PROJECT') + 1,
      TASK_TYPE_COLUMN: columnOrder.indexOf('TASK_TYPE') + 1,
      DESCRIPTION_COLUMN: columnOrder.indexOf('DESCRIPTION') + 1,
      TC_FROM_TIME_COLUMN: columnOrder.indexOf('TC_FROM_TIME') + 1,
      TC_TO_TIME_COLUMN: columnOrder.indexOf('TC_TO_TIME') + 1,
      OFF_COLUMN: columnOrder.indexOf('OFF') + 1,
      DAILY_TOTAL_COLUMN: columnOrder.length + 1, // Next column after template columns (Column J)
      VALIDATION_COLUMN: columnOrder.length + 2 // Column K for validation
    };
    
    const DATA_START_ROW = 2; // Row where timesheet data starts
    
    // Get number of days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Weekend colors
    const WEEKEND_COLOR = '#c27ba0'; // Light magenta 1
    const WEEKDAY_COLOR = '#ffffff'; // White for weekdays
    
    // Clear existing data area (estimate max rows needed: 31 days × 2 sessions + summary rows)
    const maxRows = 70;
    const clearRange = sheet.getRange(DATA_START_ROW, 1, maxRows, 11); // Include validation column K
    clearRange.clear();
    clearRange.setBackground(WEEKDAY_COLOR);
    
    let currentRow = DATA_START_ROW;
    const dailySummaryRows = []; // Track summary row positions for each day
    
    // Generate column letters using TEMPLATE_CONFIG
    const dateColumnLetter = getColumnLetter(TEMPLATE_CONFIG.DATE_COLUMN);
    const fromTimeColumnLetter = getColumnLetter(TEMPLATE_CONFIG.FROM_TIME_COLUMN);
    const toTimeColumnLetter = getColumnLetter(TEMPLATE_CONFIG.TO_TIME_COLUMN);

    // Process each day in the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      
      // Format date for display
      const formattedDate = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
      
      if (isWeekend) {
        // Weekend: Single row with gray background
        const dateCell = sheet.getRange(currentRow, TEMPLATE_CONFIG.DATE_COLUMN);
        dateCell.setValue(formattedDate);
        
        // Highlight entire weekend row
        const weekendRange = sheet.getRange(currentRow, 1, 1, 11); // Columns A-K
        weekendRange.setBackground(WEEKEND_COLOR);
        weekendRange.setFontColor('#666666'); // Darker text
        
        currentRow++;
        
      } else {
        // Weekday: 2 rows (morning and afternoon sessions)
        
        // Morning session (Row 1)
        const morningDateCell = sheet.getRange(currentRow, TEMPLATE_CONFIG.DATE_COLUMN);
        morningDateCell.setValue(formattedDate);
        
        // Afternoon session (Row 2) - same date
        const afternoonDateCell = sheet.getRange(currentRow + 1, TEMPLATE_CONFIG.DATE_COLUMN);
        afternoonDateCell.setValue(formattedDate);
        
        // Leave time columns empty for user input
        // (FROM_TIME, TO_TIME, TC_FROM_TIME, TC_TO_TIME will be filled by user)
        
        // Add daily summary on the second row using your SUMIFS formula
        const dailySummaryCell = sheet.getRange(currentRow + 1, TEMPLATE_CONFIG.DAILY_TOTAL_COLUMN);
        
        const dailyTotalFormula = `=(SUMIFS($${toTimeColumnLetter}:$${toTimeColumnLetter},$${dateColumnLetter}:$${dateColumnLetter},$${dateColumnLetter}${currentRow + 1},$${fromTimeColumnLetter}:$${fromTimeColumnLetter},"<>",$${toTimeColumnLetter}:$${toTimeColumnLetter},"<>") - SUMIFS($${fromTimeColumnLetter}:$${fromTimeColumnLetter},$${dateColumnLetter}:$${dateColumnLetter},$${dateColumnLetter}${currentRow + 1},$${fromTimeColumnLetter}:$${fromTimeColumnLetter},"<>",$${toTimeColumnLetter}:$${toTimeColumnLetter},"<>")) * 24`;
        
        dailySummaryCell.setFormula(dailyTotalFormula);
        dailySummaryCell.setFontWeight('bold');
        dailySummaryCell.setBackground('#e8f0fe'); // Light blue for daily totals
        
        // Store summary row position for monthly total calculation
        dailySummaryRows.push(currentRow + 1);
        
        currentRow += 2; // Move to next day (skip 2 rows)
      }
    }
    
    const totalFormula = `=(SUMIFS($${toTimeColumnLetter}:$${toTimeColumnLetter},$${fromTimeColumnLetter}:$${fromTimeColumnLetter},"<>",$${toTimeColumnLetter}:$${toTimeColumnLetter},"<>") - SUMIFS($${fromTimeColumnLetter}:$${fromTimeColumnLetter},$${fromTimeColumnLetter}:$${fromTimeColumnLetter},"<>",$${toTimeColumnLetter}:$${toTimeColumnLetter},"<>")) * 24`;
    // Add monthly total at the end
    setupMonthlyTotalFormula(sheet, dailySummaryRows, currentRow + 1, totalFormula);
    
    // Add validation formula to all data rows (Column K)
    setupValidationColumn(sheet, DATA_START_ROW, currentRow - 1, TEMPLATE_CONFIG);
    
    Logger.log(`Setup ${daysInMonth} dates with 2 sessions per working day for ${year}-${String(month).padStart(2, '0')}`);
    
  } catch (error) {
    Logger.log(`Error in setupMonthlyDatesWithSessions: ${error.message}`);
    throw error;
  }
}

/**
 * Setup monthly total formula using daily summary rows
 * @param {Object} sheet - Google Sheets sheet object
 * @param {Array} dailySummaryRows - Array of row numbers where daily summaries are located
 * @param {number} totalRow - Row number for monthly total
 * @param {string} formula - Formula string for calculating monthly total
 */
function setupMonthlyTotalFormula(sheet, dailySummaryRows, totalRow, formula) {
  try {
    // Use the same column configuration as setupMonthlyDatesWithSessions
    const columnOrder = TIMESHEET_TEMPLATE_CONFIG.COLUMN_ORDER;
    const DAILY_TOTAL_COLUMN = columnOrder.length + 1; // Next column after template columns
    
    if (dailySummaryRows.length === 0) {
      Logger.log('No daily summary rows to create monthly total from');
      return;
    }
    
    const monthlyTotalCell = sheet.getRange(totalRow, DAILY_TOTAL_COLUMN);
    
    monthlyTotalCell.setFormula(formula);
    monthlyTotalCell.setFontWeight('bold');
    monthlyTotalCell.setBackground('#d4edda'); // Light green for monthly total
    
    Logger.log(`Setup monthly total formula at row ${totalRow} using ${dailySummaryRows.length} daily summaries`);
    
  } catch (error) {
    Logger.log(`Error in setupMonthlyTotalFormula: ${error.message}`);
    throw error;
  }
}

/**
 * Setup validation formula in Column K for all data rows
 * @param {Object} sheet - Google Sheets sheet object
 * @param {number} startRow - First data row
 * @param {number} endRow - Last data row
 * @param {Object} config - Template configuration with column mappings
 */
function setupValidationColumn(sheet, startRow, endRow, config) {
  try {
    if (endRow < startRow) return;
    
    // Get column letters
    const colA = getColumnLetter(config.DATE_COLUMN);
    const colB = getColumnLetter(config.FROM_TIME_COLUMN);
    const colC = getColumnLetter(config.TO_TIME_COLUMN);
    const colI = getColumnLetter(config.OFF_COLUMN);
    const colJ = getColumnLetter(config.DAILY_TOTAL_COLUMN);
    const colK = getColumnLetter(config.VALIDATION_COLUMN);
    
    // Validation formula with relative row references (will auto-adjust for each row)
    // Using R[0]C notation would be ideal, but let's use a formula that references the current row
    const validationFormula = `=IF(OR(${colA}${startRow}="", ${colB}${startRow}="", ${colC}${startRow}=""), "", IF(COUNTIFS($${colA}:$${colA}, ${colA}${startRow}, $${colB}:$${colB}, "<"&${colC}${startRow}, $${colC}:$${colC}, ">"&${colB}${startRow}) > 1, "Lỗi: Trùng/Đè giờ", IF(ROUND(SUMIFS($${colJ}:$${colJ}, $${colA}:$${colA}, ${colA}${startRow}), 4) <> 8, IF(SUMIFS($${colJ}:$${colJ}, $${colA}:$${colA}, ${colA}${startRow}) < 8, "Lỗi: Thiếu giờ (<8h)", IF (${colI}${startRow} <> "", "OK", "Lỗi: Thừa giờ (>8h)")), "OK")))`;
    
    // Set formula in first cell
    const validationRange = sheet.getRange(startRow, config.VALIDATION_COLUMN, endRow - startRow + 1, 1);
    validationRange.setFormula(validationFormula);
    
    Logger.log(`Applied validation formula to ${colK}${startRow}:${colK}${endRow}`);
    
  } catch (error) {
    Logger.log(`Error in setupValidationColumn: ${error.message}`);
    throw error;
  }
}

/**
 * Convert column number to letter (1=A, 2=B, etc.)
 * @param {number} columnNumber - Column number (1-based)
 * @returns {string} Column letter
 */
function getColumnLetter(columnNumber) {
  let result = '';
  let num = columnNumber;
  
  while (num > 0) {
    num--;
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26);
  }
  
  return result;
}

