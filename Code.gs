/**
 * Timesheet Management System for Google Sheets
 * Main Google Apps Script file for handling timesheet operations
 */

/**
 * Initialize the timesheet spreadsheet with proper headers and formatting
 */
function initializeTimesheet() {
  const sheet = SpreadsheetApp.getActiveSheet();
  
  // Set up headers
  const headers = [
    'Date', 'Start Time', 'End Time', 'Break Duration (mins)', 
    'Total Hours', 'Project/Task', 'Description', 'Status'
  ];
  
  // Clear existing content and set headers
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('white');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  
  // Set column widths
  sheet.setColumnWidth(1, 100); // Date
  sheet.setColumnWidth(2, 100); // Start Time
  sheet.setColumnWidth(3, 100); // End Time
  sheet.setColumnWidth(4, 120); // Break Duration
  sheet.setColumnWidth(5, 100); // Total Hours
  sheet.setColumnWidth(6, 150); // Project/Task
  sheet.setColumnWidth(7, 200); // Description
  sheet.setColumnWidth(8, 100); // Status
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  Logger.log('Timesheet initialized successfully');
}

/**
 * Add a new timesheet entry
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @param {number} breakDuration - Break duration in minutes
 * @param {string} project - Project or task name
 * @param {string} description - Work description
 */
function addTimesheetEntry(date, startTime, endTime, breakDuration, project, description) {
  const sheet = SpreadsheetApp.getActiveSheet();
  
  // Validate inputs
  if (!date || !startTime || !endTime) {
    throw new Error('Date, start time, and end time are required');
  }
  
  // Calculate total hours
  const totalHours = calculateTotalHours(startTime, endTime, breakDuration || 0);
  
  // Find next empty row
  const lastRow = sheet.getLastRow();
  const newRow = lastRow + 1;
  
  // Add entry data
  const entryData = [
    date,
    startTime,
    endTime,
    breakDuration || 0,
    totalHours,
    project || '',
    description || '',
    'Active'
  ];
  
  sheet.getRange(newRow, 1, 1, entryData.length).setValues([entryData]);
  
  // Format the new row
  formatTimesheetRow(sheet, newRow);
  
  Logger.log(`Added timesheet entry for ${date}`);
  return newRow;
}

/**
 * Calculate total working hours
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @param {number} breakDuration - Break duration in minutes
 * @return {number} Total working hours
 */
function calculateTotalHours(startTime, endTime, breakDuration) {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  
  // Handle overnight shifts
  let totalMinutes = end - start;
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60; // Add 24 hours for overnight shift
  }
  
  // Subtract break duration
  totalMinutes -= breakDuration;
  
  return Math.round((totalMinutes / 60) * 100) / 100; // Round to 2 decimal places
}

/**
 * Parse time string to minutes since midnight
 * @param {string} timeStr - Time in HH:MM format
 * @return {number} Minutes since midnight
 */
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format a timesheet row with proper styling
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet object
 * @param {number} row - Row number to format
 */
function formatTimesheetRow(sheet, row) {
  const range = sheet.getRange(row, 1, 1, 8);
  
  // Alternate row colors for better readability
  if (row % 2 === 0) {
    range.setBackground('#f8f9fa');
  }
  
  // Format date column
  sheet.getRange(row, 1).setNumberFormat('yyyy-mm-dd');
  
  // Format time columns
  sheet.getRange(row, 2, 1, 2).setNumberFormat('hh:mm');
  
  // Format total hours column
  sheet.getRange(row, 5).setNumberFormat('0.00');
  
  // Center align status column
  sheet.getRange(row, 8).setHorizontalAlignment('center');
}

/**
 * Get total hours for a specific date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @return {number} Total hours worked in the date range
 */
function getTotalHoursInRange(startDate, endDate) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  let totalHours = 0;
  
  // Skip header row (index 0)
  for (let i = 1; i < values.length; i++) {
    const rowDate = values[i][0];
    const hours = values[i][4];
    
    if (rowDate >= new Date(startDate) && rowDate <= new Date(endDate)) {
      totalHours += parseFloat(hours) || 0;
    }
  }
  
  return Math.round(totalHours * 100) / 100;
}

/**
 * Generate a summary report for the current month
 * @return {object} Summary object with total hours, days worked, etc.
 */
function generateMonthlySummary() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const startDate = Utilities.formatDate(firstDay, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const endDate = Utilities.formatDate(lastDay, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  const totalHours = getTotalHoursInRange(startDate, endDate);
  const daysWorked = getDaysWorkedInRange(startDate, endDate);
  
  const summary = {
    month: Utilities.formatDate(now, Session.getScriptTimeZone(), 'MMMM yyyy'),
    totalHours: totalHours,
    daysWorked: daysWorked,
    averageHoursPerDay: daysWorked > 0 ? Math.round((totalHours / daysWorked) * 100) / 100 : 0
  };
  
  Logger.log('Monthly summary:', summary);
  return summary;
}

/**
 * Get number of days worked in a date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @return {number} Number of unique days worked
 */
function getDaysWorkedInRange(startDate, endDate) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  const uniqueDates = new Set();
  
  // Skip header row (index 0)
  for (let i = 1; i < values.length; i++) {
    const rowDate = values[i][0];
    
    if (rowDate >= new Date(startDate) && rowDate <= new Date(endDate)) {
      uniqueDates.add(Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'yyyy-MM-dd'));
    }
  }
  
  return uniqueDates.size;
}