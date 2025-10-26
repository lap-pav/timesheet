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
  DEFAULT_BATCH_SIZE: 50,
  
  // Google Sheets limits
  MAX_COLUMNS: 18278,
  MAX_ROWS: 2000000,
  MAX_CELLS: 5000000
};

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
