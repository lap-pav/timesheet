// ============================================================================
// TIMESHEET APPLICATION CONSTANTS AND CONFIGURATION
// ============================================================================

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
    REPORT_NAME: 0,       // A: Report Name
    DESCRIPTION: 1,       // B: Description
    COLUMNS: 2,           // C: Columns (comma-separated or Name:expression format)
    FILTERS: 3,           // D: Filters (key=value pairs)
    SORT_BY: 4,           // E: Sort By
    SORT_ORDER: 5,        // F: Sort Order (ASC/DESC)
    SUMMARY_TYPE: 6,      // G: Summary Type (SUM/COUNT/AVG/NONE)
    ENABLED: 7,           // H: Enabled (TRUE/FALSE)
    OUTPUT_STRUCTURE: 8,  // I: Output Structure (SINGLE_SHEET, SHEET_PER_PROJECT, etc.)
    GROUPING_FIELD: 9     // J: Grouping Field (for multi-sheet/file outputs)
  },
  
  // Validation limits
  MAX_REPORT_NAME_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 200,
  
  // Valid enumeration values
  VALID_SORT_ORDERS: ['ASC', 'DESC'],
  VALID_SUMMARY_TYPES: ['NONE', 'MEMBER_TOTALS', 'DAILY_TOTALS', 'PROJECT_TOTALS'],
  VALID_OUTPUT_STRUCTURES: ['SINGLE_SHEET', 'SHEET_PER_PROJECT', 'SHEET_PER_EMPLOYEE', 'FILE_PER_PROJECT', 'FILE_PER_EMPLOYEE'],
  
  // Column name mappings from aggregated data to display names
  // Includes common variations and synonyms for flexibility
  COLUMN_MAPPINGS: {
    // Member/Employee variations
    'Member Name': 'member',
    'Employee': 'member',
    'Employee Name': 'member',
    'Worker': 'member',
    'Person': 'member',
    'Name': 'member',
    
    // Date variations
    'Date': 'date',
    'Day': 'date',
    'Work Date': 'date',
    
    // Time variations
    'Start Time': 'from_time',
    'From Time': 'from_time',
    'Begin Time': 'from_time',
    'Start': 'from_time',
    'End Time': 'to_time',
    'To Time': 'to_time',
    'Finish Time': 'to_time',
    'End': 'to_time',
    
    // Project variations
    'Project Name': 'project',
    'Project': 'project',
    'Client': 'project',
    'Client Name': 'project',
    'Account': 'project',
    
    // Task variations
    'Task Type': 'task_type',
    'Task': 'task_type',
    'Activity': 'task_type',
    'Work Type': 'task_type',
    'Type': 'task_type',
    
    // Description variations
    'Task Description': 'description',
    'Description': 'description',
    'Details': 'description',
    'Notes': 'description',
    'Comments': 'description',
    
    // Time card variations
    'TC Start Time': 'tc_from_time',
    'TC End Time': 'tc_to_time',
    'TimeCard Start': 'tc_from_time',
    'TimeCard End': 'tc_to_time',
    
    // System fields
    'Source File': 'source_file',
    'Row Index': 'row_index',
    'Processed At': 'processed_at'
  },
  
  // Filter operators (order matters - longer operators first)
  FILTER_OPERATORS: ['>=', '<=', '!=', '=', '>', '<', 'contains'],
  
  // Export settings
  MAX_PROCESSING_TIME_MS: 300000, // 5 minutes maximum
  DEFAULT_BATCH_SIZE: 50,
  
  // Google Sheets limits
  MAX_COLUMNS: 18278,
  MAX_ROWS: 2000000,
  MAX_CELLS: 5000000,
  
  // Report organization settings
  REPORT_FOLDER_CONFIG: {
    MAIN_FOLDER_NAME: 'Timesheet Reports',
    MONTHLY_SUBFOLDERS: true, // Create YYYY-MM subfolders
    PROJECT_SUBFOLDERS: false, // Create project-specific subfolders when filtering by project
    NAMING_PATTERN: '{reportName}_{timestamp}',
    MAX_FILES_PER_FOLDER: 100 // Archive old reports if exceeded
  },
  
  // Expression System Configuration
  EXPRESSION_CONFIG: {
    MAX_EXPRESSION_LENGTH: 500,
    MAX_COMPILATION_CACHE_SIZE: 100,
    EXPRESSION_TIMEOUT_MS: 1000,
    SAFE_CONTEXT_VARIABLES: ['record', 'functions', 'constants', 'metadata']
  },
  
  // Output Structure Configuration
  OUTPUT_STRUCTURE_CONFIG: {
    TYPES: {
      SINGLE_SHEET: 'SINGLE_SHEET',
      SHEET_PER_PROJECT: 'SHEET_PER_PROJECT', 
      SHEET_PER_EMPLOYEE: 'SHEET_PER_EMPLOYEE',
      FILE_PER_PROJECT: 'FILE_PER_PROJECT',
      FILE_PER_EMPLOYEE: 'FILE_PER_EMPLOYEE'
    },
    MAX_GROUPS_LIMIT: 50,
    DEFAULT_NAMING_PATTERN: '{groupValue}_{timestamp}',
    MAX_FILENAME_LENGTH: 100
  },
  
  // Default Column Expressions for backward compatibility
  DEFAULT_EXPRESSIONS: {
    'Member Name': 'record.member || record.memberName',
    'Date': 'record.date',
    'Start Time': 'formatTime(record.from_time)',
    'End Time': 'formatTime(record.to_time)', 
    'Hours': 'calculateHours(record.from_time, record.to_time)',
    'Project Name': 'record.project',
    'Task Type': 'record.task_type',
    'Task Description': 'record.description',
    'Day of Week': 'getDayOfWeek(record.date)',
    'Week Number': 'getWeekNumber(record.date)',
    'Status': '"Active"'
  }
};

// Built-in transformation functions registry
const EXPRESSION_FUNCTIONS = {
  calculateHours: function(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return 0;
    return Math.round((endMinutes - startMinutes) / 60 * 100) / 100;
  },
  
  formatDate: function(dateValue) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? dateValue : date.toISOString().split('T')[0];
  },
  
  formatTime: function(timeValue) {
    if (!timeValue) return '';
    return normalizeTime(timeValue);
  },
  
  getDayOfWeek: function(dateValue) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return isNaN(date.getTime()) ? '' : days[date.getDay()];
  },
  
  getWeekNumber: function(dateValue) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDay.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);
  },
  
  concat: function() {
    return Array.prototype.slice.call(arguments)
      .filter(function(v) { return v != null && v !== ''; })
      .join(' ');
  },
  
  upper: function(value) {
    return String(value || '').toUpperCase();
  },
  
  lower: function(value) {
    return String(value || '').toLowerCase();
  },
  
  getMonthName: function(dateValue) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[date.getMonth()];
  },
  
  addDays: function(dateValue, days) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    date.setDate(date.getDate() + (days || 0));
    return date;
  },
  
  stringContains: function(text, substring) {
    if (!text || !substring) return false;
    return String(text).toLowerCase().includes(String(substring).toLowerCase());
  },
  
  defaultValue: function(value, fallback) {
    return (value !== null && value !== undefined && value !== '') ? value : fallback;
  }
};

// Helper function for time parsing (used by calculateHours)
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const timePattern = /^(\d{1,2}):(\d{2})$/;
  const match = String(timeStr).match(timePattern);
  if (!match) return null;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

// Helper function for time normalization (used by formatTime)
function normalizeTime(timeValue) {
  if (!timeValue) return '';
  const timeStr = String(timeValue).trim();
  const timePattern = /^(\d{1,2}):(\d{2})$/;
  const match = timeStr.match(timePattern);
  if (match) {
    const hours = match[1].padStart(2, '0');
    const minutes = match[2];
    return hours + ':' + minutes;
  }
  return timeStr;
}

// Error types for consistent error handling
const ERROR_TYPES = {
  // System-level errors
  SYSTEM_FAILURE: 'SYSTEM_FAILURE',
  TIMEOUT_WARNING: 'TIMEOUT_WARNING',
  MEMORY_CONSTRAINT: 'MEMORY_CONSTRAINT',
  
  // Data access errors
  FILE_ACCESS: 'FILE_ACCESS',
  FOLDER_ACCESS: 'FOLDER_ACCESS',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // Data validation errors
  INVALID_ENTRY: 'INVALID_ENTRY',
  MISSING_DATA: 'MISSING_DATA',
  FORMAT_ERROR: 'FORMAT_ERROR',
  
  // Configuration errors
  CONFIG_VALIDATION_ERROR: 'CONFIG_VALIDATION_ERROR',
  FILTER_ERROR: 'FILTER_ERROR',
  EXPORT_ERROR: 'EXPORT_ERROR',
  REPORT_GENERATION_ERROR: 'REPORT_GENERATION_ERROR'
};

// Severity levels
const SEVERITY_LEVELS = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

// ============================================================================
// TIMESHEET GENERATION CONSTANTS
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
};
