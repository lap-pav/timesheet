/**
 * Utility functions for timesheet management
 */

/**
 * Validate timesheet entry data
 * @param {object} entry - Entry object with date, startTime, endTime, etc.
 * @return {object} Validation result with isValid and errors
 */
function validateTimesheetEntry(entry) {
  const errors = [];
  
  // Check required fields
  if (!entry.date) errors.push('Date is required');
  if (!entry.startTime) errors.push('Start time is required');
  if (!entry.endTime) errors.push('End time is required');
  
  // Validate date format
  if (entry.date && !isValidDate(entry.date)) {
    errors.push('Invalid date format. Use YYYY-MM-DD');
  }
  
  // Validate time format
  if (entry.startTime && !isValidTime(entry.startTime)) {
    errors.push('Invalid start time format. Use HH:MM');
  }
  
  if (entry.endTime && !isValidTime(entry.endTime)) {
    errors.push('Invalid end time format. Use HH:MM');
  }
  
  // Validate break duration
  if (entry.breakDuration && (isNaN(entry.breakDuration) || entry.breakDuration < 0)) {
    errors.push('Break duration must be a positive number');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Check if a date string is valid
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @return {boolean} True if valid
 */
function isValidDate(dateStr) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Check if a time string is valid
 * @param {string} timeStr - Time string in HH:MM format
 * @return {boolean} True if valid
 */
function isValidTime(timeStr) {
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(timeStr);
}

/**
 * Format hours to HH:MM format
 * @param {number} hours - Hours as decimal number
 * @return {string} Time in HH:MM format
 */
function formatHoursToTime(hours) {
  const totalMinutes = Math.round(hours * 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Get current date in YYYY-MM-DD format
 * @return {string} Current date
 */
function getCurrentDate() {
  const now = new Date();
  return Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/**
 * Get current time in HH:MM format
 * @return {string} Current time
 */
function getCurrentTime() {
  const now = new Date();
  return Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm');
}

/**
 * Create a backup of the current timesheet
 * @return {string} URL of the backup spreadsheet
 */
function createBackup() {
  const originalSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss');
  const backupName = `${originalSpreadsheet.getName()}_Backup_${timestamp}`;
  
  const backup = originalSpreadsheet.copy(backupName);
  
  Logger.log(`Backup created: ${backupName}`);
  return backup.getUrl();
}

/**
 * Export timesheet data to CSV format
 * @param {string} startDate - Start date in YYYY-MM-DD format (optional)
 * @param {string} endDate - End date in YYYY-MM-DD format (optional)
 * @return {string} CSV formatted data
 */
function exportToCSV(startDate, endDate) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  let csvData = [];
  
  // Add headers
  csvData.push(values[0]);
  
  // Filter and add data rows
  for (let i = 1; i < values.length; i++) {
    const rowDate = values[i][0];
    
    // If date range is specified, filter rows
    if (startDate && endDate) {
      if (rowDate >= new Date(startDate) && rowDate <= new Date(endDate)) {
        csvData.push(values[i]);
      }
    } else {
      csvData.push(values[i]);
    }
  }
  
  // Convert to CSV format
  const csvString = csvData.map(row => 
    row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  
  return csvString;
}

/**
 * Send email report with timesheet summary
 * @param {string} emailAddress - Recipient email address
 * @param {string} startDate - Start date for report
 * @param {string} endDate - End date for report
 */
function sendEmailReport(emailAddress, startDate, endDate) {
  const totalHours = getTotalHoursInRange(startDate, endDate);
  const daysWorked = getDaysWorkedInRange(startDate, endDate);
  
  const subject = `Timesheet Report: ${startDate} to ${endDate}`;
  const body = `
    Timesheet Summary Report
    
    Period: ${startDate} to ${endDate}
    Total Hours Worked: ${totalHours}
    Days Worked: ${daysWorked}
    Average Hours per Day: ${daysWorked > 0 ? Math.round((totalHours / daysWorked) * 100) / 100 : 0}
    
    This report was generated automatically from your timesheet.
  `;
  
  try {
    GmailApp.sendEmail(emailAddress, subject, body);
    Logger.log(`Email report sent to ${emailAddress}`);
  } catch (error) {
    Logger.log(`Failed to send email: ${error.message}`);
    throw error;
  }
}

/**
 * Auto-fill common project names based on description
 * @param {string} description - Work description
 * @return {string} Suggested project name
 */
function suggestProject(description) {
  const projectKeywords = {
    'Development': ['coding', 'programming', 'development', 'debugging', 'code review'],
    'Meetings': ['meeting', 'call', 'standup', 'sync', 'discussion'],
    'Documentation': ['documentation', 'docs', 'writing', 'wiki', 'readme'],
    'Testing': ['testing', 'qa', 'quality assurance', 'bug', 'test'],
    'Research': ['research', 'investigation', 'analysis', 'study'],
    'Training': ['training', 'learning', 'course', 'tutorial', 'workshop']
  };
  
  const lowerDescription = description.toLowerCase();
  
  for (const [project, keywords] of Object.entries(projectKeywords)) {
    if (keywords.some(keyword => lowerDescription.includes(keyword))) {
      return project;
    }
  }
  
  return '';
}