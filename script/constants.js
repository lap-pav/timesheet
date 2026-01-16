// ============================================================================
// TIMESHEET APPLICATION CONSTANTS AND CONFIGURATION
// ============================================================================

// ============================================================================
// 🚨 TEMPLATE UPDATE GUIDE 🚨
// ============================================================================
// 
// WHEN TIMESHEET TEMPLATE CHANGES, UPDATE THESE SECTIONS IN ORDER:
//
// 1. TIMESHEET_TEMPLATE_CONFIG (below):
//    - Update TEMPLATE_VERSION and TEMPLATE_LAST_UPDATED
//    - Add/remove fields in REQUIRED_FIELDS and OPTIONAL_FIELDS
//    - Update FIELD_VALIDATION rules for new fields
//
// 2. AGGREGATION_CONFIG.EXPECTED_HEADERS:
//    - Add header patterns that might appear in new template
//    - Update existing patterns if column names change
//
// 3. AGGREGATION_CONFIG.FIELD_MAPPINGS:
//    - Map header keys to internal field names
//    - Use consistent naming (lowercase, underscores)
//
// 4. REPORT_CONFIG.COLUMN_MAPPINGS (if needed):
//    - Add display name variations for new fields
//    - Update expressions in REPORT_CONFIGS_EXAMPLES.md
//
// 5. TEST THE CHANGES:
//    - Run templateDiagnostic() function in Apps Script editor
//    - Test with sample timesheet files
//    - Verify reports generate correctly
//
// EXAMPLE: Adding a new "Priority" field:
// 1. Add 'PRIORITY' to OPTIONAL_FIELDS
// 2. Add PRIORITY: ['priority', 'importance', 'urgency'] to EXPECTED_HEADERS  
// 3. Add PRIORITY: 'priority' to FIELD_MAPPINGS
// 4. Add 'Priority': 'priority' to COLUMN_MAPPINGS
// 5. Test with templateDiagnostic()
//
// ============================================================================

// ============================================================================
// TIMESHEET TEMPLATE CONFIGURATION
// ============================================================================
// 🚨 UPDATE THIS SECTION WHEN TIMESHEET TEMPLATE CHANGES 🚨

const TIMESHEET_TEMPLATE_CONFIG = {
  // Current template version for tracking changes
  TEMPLATE_VERSION: '1.0',
  TEMPLATE_LAST_UPDATED: '2025-10-27',
  
  // Fixed column order for position-based mapping (eliminates header text dependency)
  // TO UPDATE TEMPLATE: Modify this order when template columns change
  COLUMN_ORDER: [
    'DATE',        // Column 0: Date
    'FROM_TIME',   // Column 1: From Time  
    'TO_TIME',     // Column 2: To Time
    'PROJECT',     // Column 3: Project
    'TASK_TYPE',   // Column 4: Task Type
    'DESCRIPTION', // Column 5: Description (optional)
    'TC_FROM_TIME', // Column 6: TC From Time (optional)
    'TC_TO_TIME',  // Column 7: TC To Time (optional)
    'OFF'          // Column 8: Off Day flag (boolean - true means time off)
  ],
  
  // Required fields that must be present in every timesheet
  // TO UPDATE TEMPLATE: Add/remove required fields here
  REQUIRED_FIELDS: ['DATE', 'FROM_TIME', 'TO_TIME'],
  
  // Conditionally required fields (required unless OFF is true)
  // TO UPDATE TEMPLATE: Add/remove conditionally required fields here
  CONDITIONALLY_REQUIRED_FIELDS: ['PROJECT', 'TASK_TYPE'],
  
  // Optional fields that may or may not be present
  // TO UPDATE TEMPLATE: Add/remove optional fields here  
  OPTIONAL_FIELDS: ['DESCRIPTION', 'TC_FROM_TIME', 'TC_TO_TIME', 'OFF'],
  
  // Field validation rules
  // TO UPDATE TEMPLATE: Modify validation rules for new/changed fields
  FIELD_VALIDATION: {
    DATE: {
      required: true,
      type: 'date',
      patterns: [/^\d{4}-\d{2}-\d{2}$/, /^\d{2}\/\d{2}\/\d{4}$/, /^\d{1,2}\/\d{1,2}\/\d{4}$/]
    },
    FROM_TIME: {
      required: true,
      type: 'time',
      patterns: [/^\d{1,2}:\d{2}$/, /^\d{1,2}:\d{2}:\d{2}$/, /^\d{1,2}:\d{2}\s*(AM|PM)$/i]
    },
    TO_TIME: {
      required: true,
      type: 'time', 
      patterns: [/^\d{1,2}:\d{2}$/, /^\d{1,2}:\d{2}:\d{2}$/, /^\d{1,2}:\d{2}\s*(AM|PM)$/i]
    },
    PROJECT: {
      required: true,
      type: 'text',
      minLength: 1,
      maxLength: 100
    },
    TASK_TYPE: {
      required: false,
      type: 'text',
      maxLength: 50
    },
    DESCRIPTION: {
      required: false,
      type: 'text',
      maxLength: 500
    },
    TC_FROM_TIME: {
      required: false,
      type: 'time',
      patterns: [/^\d{1,2}:\d{2}$/, /^\d{1,2}:\d{2}:\d{2}$/, /^\d{1,2}:\d{2}\s*(AM|PM)$/i]
    },
    TC_TO_TIME: {
      required: false,
      type: 'time',
      patterns: [/^\d{1,2}:\d{2}$/, /^\d{1,2}:\d{2}:\d{2}$/, /^\d{1,2}:\d{2}\s*(AM|PM)$/i]
    },
    OFF: {
      required: false,
      type: 'option',
      description: 'Any selected value indicates time-off (e.g., Vacation, Sick Leave, Personal Day, Holiday, etc.)'
    }
  }
};

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
  // TO UPDATE TEMPLATE: Add new header patterns here
  EXPECTED_HEADERS: {
    DATE: ['date', 'day', 'work date'],
    FROM_TIME: ['from time', 'start time', 'from', 'begin time'],
    TO_TIME: ['to time', 'end time', 'to', 'finish time'],
    PROJECT: ['project', 'project name', 'client', 'account'],
    TASK_TYPE: ['task type', 'task', 'type', 'activity', 'work type'],
    DESCRIPTION: ['description', 'desc', 'details', 'notes', 'comments'],
    TC_FROM_TIME: ['tc from time', 'tc start', 'timecard from'],
    TC_TO_TIME: ['tc to time', 'tc end', 'timecard to'],
    OFF: ['off', 'time off', 'off day', 'day off', 'leave']
  },
  
  // Field mapping from header keys to internal field names
  // TO UPDATE TEMPLATE: Modify target field names here
  FIELD_MAPPINGS: {
    DATE: 'date',
    FROM_TIME: 'from_time',
    TO_TIME: 'to_time', 
    PROJECT: 'project',
    TASK_TYPE: 'task_type',
    DESCRIPTION: 'description',
    TC_FROM_TIME: 'tc_from_time',
    TC_TO_TIME: 'tc_to_time',
    OFF: 'off'
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
  CHECKPOINT_INTERVAL: 10, // Log progress every N files

  TIMESHEET_SHEET_NAME: "Report",
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
    OUTPUT_STRUCTURE: 7,  // H: Output Structure (SINGLE_SHEET, SHEET_PER_PROJECT, etc.)
    GROUPING_FIELD: 8,    // I: Grouping Field (for multi-sheet/file outputs)
    INACTIVE: 9,          // J: In-active (Checkbox - checked means inactive)
  },
  
  // Validation limits
  MAX_REPORT_NAME_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 200,
  
  // Valid enumeration values
  VALID_SORT_ORDERS: ['ASC', 'DESC'],
  VALID_SUMMARY_TYPES: ['NONE', 'MEMBER_TOTALS', 'DAILY_TOTALS', 'PROJECT_TOTALS', 'MEMBER_PROJECT_BREAKDOWN', 'MEMBER_DATE_PIVOT'],
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
    'To Customer Start': 'tc_from_time',
    'To Customer End': 'tc_to_time',
    
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
    'Hours': 'calculateWorkingHours(record.from_time, record.to_time, record.off)',
    'Off Hours': 'calculateOffHours(record.from_time, record.to_time, record.off)',
    'Unpaid Off Hours': 'calculateUnpaidOffHours(record.from_time, record.to_time, record.off, record.off_type)',
    'Total Hours': 'calculateWorkingHours(record.from_time, record.to_time, record.off) + calculateOffHours(record.from_time, record.to_time, record.off)',
    'Project Name': 'record.project',
    'Task Type': 'record.task_type',
    'Task Description': 'record.description',
    'Day of Week': 'getDayOfWeek(record.date)',
    'Week Number': 'getWeekNumber(record.date)',
    'Status': '"Active"'
  }
};

// Helper functions for expression functions (must be defined first)
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  
  const timeString = String(timeStr).trim().toUpperCase();
  
  // Handle AM/PM format: "9:00 AM", "1:30 PM", etc.
  const ampmPattern = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/;
  const ampmMatch = timeString.match(ampmPattern);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1]);
    const minutes = parseInt(ampmMatch[2]);
    const period = ampmMatch[3];
    
    // Convert to 24-hour format
    if (period === 'AM' && hours === 12) {
      hours = 0;
    } else if (period === 'PM' && hours !== 12) {
      hours += 12;
    }
    
    return hours * 60 + minutes;
  }
  
  // Handle 24-hour format: "09:00", "13:30", etc.
  const timePattern = /^(\d{1,2}):(\d{2})$/;
  const match = timeString.match(timePattern);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }
  
  return null;
}

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

// Built-in transformation functions registry
const EXPRESSION_FUNCTIONS = {
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
  },
  
  // Customer time tracking functions
  calculateCustomerHours: function(tcStartTime, tcEndTime, fallbackFromTime, fallbackToTime, isOff) {
    // Use TC times if provided, otherwise fall back to regular from/to times
    let startTime = tcStartTime;
    let endTime = tcEndTime;
    
    // Check if TC times are missing or empty, use fallbacks
    if (!tcStartTime || String(tcStartTime).trim() === '') {
      startTime = fallbackFromTime;
    }
    if (!tcEndTime || String(tcEndTime).trim() === '') {
      endTime = fallbackToTime;
    }
    
    return EXPRESSION_FUNCTIONS.calculateWorkingHours(startTime, endTime, isOff);
  },
  
  // Single-record time calculation functions (replaces entries-based functions)
  calculateWorkingHours: function(fromTime, toTime, isOff) {
    // Only calculate hours if it's not a time-off record
    if (isOff === true || isOff === 'true') return 0;
    if (!fromTime || !toTime) return 0;
    const startMinutes = parseTimeToMinutes(fromTime);
    const endMinutes = parseTimeToMinutes(toTime);
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return 0;
    return Math.round((endMinutes - startMinutes) / 60 * 100) / 100;
  },

  // Helper function to calculate hours within business hours (08:00-12:00 and 13:00-17:00)
  calculateBusinessHoursOverlap: function(fromTime, toTime) {
    if (!fromTime || !toTime) return 0;
    
    const startMinutes = parseTimeToMinutes(fromTime);
    const endMinutes = parseTimeToMinutes(toTime);
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return 0;
    
    // Business hours: 08:00-12:00 and 13:00-17:00 (excludes lunch break)
    const morningStart = 8 * 60;    // 08:00 = 480 minutes
    const morningEnd = 12 * 60;     // 12:00 = 720 minutes
    const afternoonStart = 13 * 60; // 13:00 = 780 minutes
    const afternoonEnd = 17 * 60;   // 17:00 = 1020 minutes
    
    let totalHours = 0;
    
    // Calculate morning session overlap (08:00-12:00)
    const morningOverlapStart = Math.max(startMinutes, morningStart);
    const morningOverlapEnd = Math.min(endMinutes, morningEnd);
    if (morningOverlapEnd > morningOverlapStart) {
      totalHours += (morningOverlapEnd - morningOverlapStart) / 60;
    }
    
    // Calculate afternoon session overlap (13:00-17:00)
    const afternoonOverlapStart = Math.max(startMinutes, afternoonStart);
    const afternoonOverlapEnd = Math.min(endMinutes, afternoonEnd);
    if (afternoonOverlapEnd > afternoonOverlapStart) {
      totalHours += (afternoonOverlapEnd - afternoonOverlapStart) / 60;
    }
    
    return Math.round(totalHours * 100) / 100;
  },

  calculateOffHours: function(fromTime, toTime, isOff) {
    // Only calculate hours if it's a time-off record
    if (!(isOff === true || isOff === 'true')) return 0;
    return EXPRESSION_FUNCTIONS.calculateBusinessHoursOverlap(fromTime, toTime);
  },

  calculateUnpaidOffHours: function(fromTime, toTime, isOff, offType) {
    // Only calculate hours if it's an unpaid time-off record
    if (!(isOff === true || isOff === 'true')) return 0;
    if (!offType || String(offType).toLowerCase() !== 'unpaid leave') return 0;
    return EXPRESSION_FUNCTIONS.calculateBusinessHoursOverlap(fromTime, toTime);
  },

  // Japanese formatting functions
  formatJapaneseDate: function(dateValue) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return dateValue;
    
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return month + '月' + day.toString().padStart(2, '0') + '日';
  },

  formatJapaneseDayOfWeek: function(dateValue) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[date.getDay()];
  },

  formatWorkHours: function(tcStartTime, tcEndTime, fallbackFromTime, fallbackToTime, isOff) {
    const hours = EXPRESSION_FUNCTIONS.calculateCustomerHours(tcStartTime, tcEndTime, fallbackFromTime, fallbackToTime, isOff);
    if (hours === 0) return '';
    
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    
    if (minutes === 0) {
      return wholeHours + ':00';
    } else {
      return wholeHours + ':' + minutes.toString().padStart(2, '0');
    }
  }
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

// ============================================================================
// AI REPORT GENERATION CONFIGURATION
// ============================================================================

/**
 * AI Service Configuration
 * These constants control the AI integration behavior
 */
const AI_CONFIG = {
  PRIMARY_SERVICE: 'gemini',
  FALLBACK_SERVICE: 'claude',
  CACHE_TTL_HOURS: 24,
  MAX_INPUT_LENGTH: 1000,
  REQUEST_TIMEOUT_MS: 30000,
  MAX_RETRIES: 2,
  CLAUDE_MODEL: 'claude-sonnet-4-5-20250929',
  GEMINI_MODEL: 'gemini-2.0-flash'
};

/**
 * API Endpoints for AI Services
 */
const AI_ENDPOINTS = {
  GEMINI: `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.GEMINI_MODEL}:generateContent`,
  CLAUDE: `https://api.anthropic.com/v1/messages`
};

/**
 * AI Report Configuration Constants
 * Based on REPORT_CONFIGS_EXAMPLES.md format
 */
const AI_REPORT_CONFIG = {
  MAX_REPORT_NAME_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 200,
  VALID_SUMMARY_TYPES: ['NONE', 'MEMBER_TOTALS', 'DAILY_TOTALS', 'PROJECT_TOTALS', 'MEMBER_PROJECT_BREAKDOWN', 'MEMBER_DATE_PIVOT'],
  VALID_OUTPUT_STRUCTURES: ['SINGLE_SHEET', 'SHEET_PER_PROJECT', 'SHEET_PER_EMPLOYEE', 'FILE_PER_PROJECT', 'FILE_PER_EMPLOYEE'],
  VALID_SORT_ORDERS: ['ASC', 'DESC']
};

/**
 * AI Field Mapping from Internal Names to Display Names
 * Based on data-model.md specifications
 */
const AI_FIELD_MAPPING = {
  'member': 'Member Name',
  'date': 'Date',
  'from_time': 'Start Time',
  'to_time': 'End Time',
  'project': 'Project Name',
  'task_type': 'Task Type',
  'description': 'Task Description',
  'tc_from_time': 'Customer From Time',
  'tc_to_time': 'Customer To Time',
  'off': 'Time Off Flag',
  'off_type': 'Time Off Type'
};

/**
 * Expression Functions Available for AI Report Generation
 * Based on expression-functions.md
 */
const AI_EXPRESSION_FUNCTIONS = [
  'calculateCustomerHours(tc_from_time, tc_to_time, from_time, to_time, off)',
  'calculateWorkingHours(from_time, to_time, off)',
  'calculateOffHours(from_time, to_time, off)',
  'calculateUnpaidOffHours(from_time, to_time, off, off_type)',
  'formatJapaneseDate(date)',
  'formatJapaneseDayOfWeek(date)',
  'formatWorkHours(tc_from_time, tc_to_time, from_time, to_time, off)',
  'concat(...args)',
  'formatDate(date, format)',
  'formatTime(time, format)',
];
