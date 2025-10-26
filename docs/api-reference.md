# API Reference: Timesheet Aggregation System

**Version**: 2.0.0  
**Date**: October 24, 2025  
**Platform**: Google Apps Script  

## Overview

The Timesheet Aggregation System provides comprehensive functionality for aggregating individual member timesheet files from Google Drive folders into normalized JSON datasets and exporting configurable reports. The system is designed for Google Apps Script deployment and handles large-scale data processing with robust error handling and performance optimization.

## Table of Contents

1. [Core Functions](#core-functions)
2. [Configuration Export Functions](#configuration-export-functions)
3. [Configuration](#configuration)
4. [Data Structures](#data-structures)
5. [Error Handling](#error-handling)
6. [Integration APIs](#integration-apis)
7. [Utility Functions](#utility-functions)
8. [Performance Considerations](#performance-considerations)

---

## Core Functions

### `aggregateMonthlyTimesheets(monthFolder)`

**Description**: Main aggregation function that orchestrates the complete timesheet aggregation process.

**Parameters**:
- `monthFolder` (string): Month identifier in YYYY-MM format (e.g., "2025-09")

**Returns**: Object containing:
```javascript
{
  entries: Array<TimesheetEntry>,     // Normalized timesheet entries
  metadata: {
    processedAt: string,              // ISO timestamp
    monthFolder: string,              // Input month folder
    totalFiles: number,               // Total files found
    successfulFiles: number,          // Successfully processed files
    totalEntries: number,             // Total entries processed
    processingTimeMs: number,         // Total processing time
    systemHealthy: boolean,           // Overall system health status
    batchProcessing: Object,          // Batch processing information
    performanceMetrics: Object        // Detailed performance metrics
  },
  errors: Array<ErrorObject>          // Array of error objects
}
```

---

## Configuration Export Functions

### `exportConfigurableReportUI()`

**Description**: Main UI function that provides an interactive interface for users to select and export configurable reports based on aggregated timesheet data.

**Parameters**: None (UI-driven function)

**Returns**: Void (interacts with user through Google Apps Script UI)

**Behavior**:
- Displays configuration selection dialog
- Shows progress tracking for long operations (>30 seconds)
- Provides user-friendly error messages
- Exports reports to Google Sheets with formatting

**Example Usage**:
```javascript
// Called from Google Apps Script menu
exportConfigurableReportUI();
```

### `readReportConfigurations()`

**Description**: Reads and validates report configurations from the "Report Configs" sheet.

**Parameters**: None

**Returns**: Object containing:
```javascript
{
  success: boolean,                   // Operation success status
  configurations: Array<{             // Array of valid configurations
    reportName: string,               // Unique report name (max 50 chars)
    description: string,              // Report description (max 200 chars)  
    columns: Array<string>,           // Selected column names
    filters: Object,                  // Filter conditions
    sortBy: string,                   // Sort column name
    sortOrder: "ASC"|"DESC",          // Sort direction
    summaryType: string,              // Summary aggregation type
    enabled: boolean                  // Configuration enabled status
  }>,
  errors: Array<string>               // Validation error messages
}
```

**Configuration Sheet Schema**:
| Column | Field | Type | Required | Valid Values |
|--------|-------|------|----------|--------------|
| A | Report Name | string | Yes | Unique, max 50 chars |
| B | Description | string | Yes | Max 200 chars |
| C | Columns | string | Yes | Comma-separated column names |
| D | Filters | string | No | key=value,key>value format |
| E | Sort By | string | No | Must be in Columns list |
| F | Sort Order | string | No | ASC or DESC |
| G | Summary Type | string | No | NONE, MEMBER_TOTALS, DAILY_TOTALS, PROJECT_TOTALS |
| H | Enabled | boolean | Yes | TRUE or FALSE |

### `generateConfigurableReport(aggregatedData, configuration)`

**Description**: Generates a customized report from aggregated timesheet data based on configuration parameters.

**Parameters**:
- `aggregatedData` (Array): Array of aggregated timesheet objects
- `configuration` (Object): Report configuration object from readReportConfigurations()

**Returns**: Object containing:
```javascript
{
  success: boolean,                   // Generation success status
  reportData: Array<Object>,          // Filtered and formatted report data
  metadata: {
    reportName: string,               // Report name from configuration
    description: string,              // Report description
    totalRecords: number,             // Number of records in final report
    originalRecords: number,          // Number of input records
    filteredRecords: number,          // Records after filtering
    generatedAt: string,              // ISO timestamp
    columns: Array<string>,           // Selected columns
    appliedFilters: Object,           // Filters that were applied
    sortBy: string,                   // Sort column used
    sortOrder: string,                // Sort direction used
    summaryType: string,              // Summary aggregation applied
    processingInfo: {                 // Performance information
      usedBatching: boolean,          // Whether batch processing was used
      batchSize: number,              // Batch size for large datasets
      isLargeDataset: boolean         // Whether dataset exceeded thresholds
    }
  },
  errors: Array<string>               // Generation error messages
}
```

**Supported Filters**:
- `=` - Exact match
- `!=` - Not equal
- `>` - Greater than (numeric)
- `<` - Less than (numeric)
- `>=` - Greater than or equal (numeric)
- `<=` - Less than or equal (numeric)
- `contains` - Text contains substring

**Summary Types**:
- `NONE` - No aggregation, show individual records
- `MEMBER_TOTALS` - Aggregate by team member
- `DAILY_TOTALS` - Aggregate by date
- `PROJECT_TOTALS` - Aggregate by project

### `exportReportToGoogleSheets(reportData, metadata, outputLocation)`

**Description**: Exports generated report data to Google Sheets with formatting and metadata.

**Parameters**:
- `reportData` (Array): Array of report data objects from generateConfigurableReport()
- `metadata` (Object): Report metadata object
- `outputLocation` (string): Either "new_file" or "current_sheet"

**Returns**: Object containing:
```javascript
{
  success: boolean,                   // Export success status
  fileId: string,                     // Google Sheets file ID
  fileName: string,                   // Name of created/updated file
  sheetName: string,                  // Name of sheet containing report
  errors: Array<string>               // Export error messages
}
```

**Features**:
- Automatic file organization (same folder as source spreadsheet)
- Rich formatting with headers, colors, and frozen rows
- Metadata section with report details
- Batch processing for large datasets (>1000 rows)
- Unique sheet naming to prevent conflicts

### `selectReportConfigurationUI(configurations)`

**Description**: Provides an interactive UI for users to select from available report configurations.

**Parameters**:
- `configurations` (Array): Array of configuration objects from readReportConfigurations()

**Returns**: Object or null:
- Selected configuration object, or null if user cancels

**Behavior**:
- Single configuration: Shows confirmation dialog
- Multiple configurations: Shows numbered selection prompt
- Input validation with retry for invalid selections
- User-friendly configuration previews

---

## Available Report Columns

The following columns are available for report configuration:

| Column Name | Data Source | Description |
|-------------|-------------|-------------|
| Member Name | member.name | Team member's full name |
| Email | member.email | Team member's email address |
| Total Hours | aggregated calculation | Sum of hours for the period |
| Date | timesheet.date | Date of timesheet entry |
| Hours | timesheet.hours | Hours logged for specific entry |
| Project Name | timesheet.project | Project name or code |
| Task Description | timesheet.description | Description of work performed |
| Status | member.status | Member status (active/inactive) |
| Department | member.department | Member's department |
| Role | member.role | Member's role or position |

**Example**:
```javascript
const result = aggregateMonthlyTimesheets('2025-09');
console.log(`Processed ${result.entries.length} entries from ${result.metadata.successfulFiles} files`);
```

**Performance**: Processes up to 20,000 entries within Google Apps Script's 6-minute execution limit.

---

### `getMonthlyFolder(yearMonth)`

**Description**: Discovers and validates Google Drive folder for a specific month.

**Parameters**:
- `yearMonth` (string): Month in YYYY-MM format

**Returns**: Object containing:
```javascript
{
  folder: DriveApp.Folder | null,     // Google Drive folder object
  errors: Array<ErrorObject>,         // Any errors encountered
  metadata: {
    yearMonth: string,                // Input parameter
    searchTimeMs: number,             // Time spent searching
    foldersFound: number              // Number of matching folders
  }
}
```

**Example**:
```javascript
const folderResult = getMonthlyFolder('2025-09');
if (folderResult.folder) {
  console.log(`Found folder: ${folderResult.folder.getName()}`);
}
```

---

### `getTimesheetFiles(folder)`

**Description**: Enumerates timesheet files in a Google Drive folder using pattern matching.

**Parameters**:
- `folder` (DriveApp.Folder): Google Drive folder object

**Returns**: Object containing:
```javascript
{
  files: Array<TimesheetFileInfo>,    // Array of file information objects
  errors: Array<ErrorObject>,         // Processing errors
  metadata: {
    totalFiles: number,               // Total files in folder
    validFiles: number,               // Files matching timesheet pattern
    invalidFiles: number,             // Files not matching pattern
    enumerationTimeMs: number         // Processing time
  }
}
```

**File Pattern**: Files must match `Timesheet_YYYY-MM_MemberName` format.

---

### `readTimesheetData(timesheetFile)`

**Description**: Reads and extracts data from a Google Spreadsheet timesheet file.

**Parameters**:
- `timesheetFile` (Object): File object from `getTimesheetFiles()`

**Returns**: Object containing:
```javascript
{
  rawData: Array<Array>,              // Raw spreadsheet data (excluding headers)
  headers: Array<string>,             // Column headers
  memberName: string,                 // Extracted member name
  fileName: string,                   // Original filename
  errors: Array<ErrorObject>,         // Processing errors
  metadata: {
    totalRows: number,                // Total rows in spreadsheet
    dataRows: number,                 // Data rows (excluding header)
    readTimeMs: number                // Processing time
  }
}
```

**Retry Logic**: Automatically retries failed reads up to 3 times with exponential backoff.

---

### `validateTimesheetEntry(entry, memberName, headers, rowIndex)`

**Description**: Validates a single timesheet entry against format and business rules.

**Parameters**:
- `entry` (Array): Raw row data from spreadsheet
- `memberName` (string): Member name for context
- `headers` (Array): Column headers for field mapping
- `rowIndex` (number): Row index for error reporting

**Returns**: Object containing:
```javascript
{
  isValid: boolean,                   // Overall validation result
  errors: Array<ErrorObject>,         // Validation errors
  warnings: Array<ErrorObject>        // Validation warnings
}
```

**Validation Rules**:
- Required fields: date, from_time, to_time, project, task_type
- Date formats: YYYY-MM-DD, MM/DD/YYYY, M/D/YYYY
- Time formats: HH:MM, H:MM, HH:MM:SS, HH.MM, decimal hours
- Time logic: from_time should be before to_time

---

### `normalizeTimesheetEntry(entry, memberName, headers, rowIndex)`

**Description**: Normalizes a validated entry to standard format with consistent data types.

**Parameters**:
- `entry` (Array): Raw row data
- `memberName` (string): Member name
- `headers` (Array): Column headers
- `rowIndex` (number): Row index

**Returns**: TimesheetEntry object:
```javascript
{
  member: string,                     // Member name
  date: string,                       // Date in YYYY-MM-DD format
  from_time: string,                  // Time in HH:MM format
  to_time: string,                    // Time in HH:MM format
  project: string,                    // Project identifier
  task_type: string,                  // Task type/activity
  description: string,                // Work description
  tc_from_time: string,               // Timecard from time (optional)
  tc_to_time: string,                 // Timecard to time (optional)
  source_file: string,                // Source filename
  row_index: number,                  // Original row index
  processed_at: string                // Processing timestamp
}
```

---

### `processTimesheetFile(timesheetFile)`

**Description**: Complete processing pipeline for a single timesheet file.

**Parameters**:
- `timesheetFile` (Object): File object from `getTimesheetFiles()`

**Returns**: Object containing:
```javascript
{
  memberName: string,                 // Member name
  fileName: string,                   // Source filename
  entries: Array<TimesheetEntry>,     // Normalized entries
  errors: Array<ErrorObject>,         // Processing errors
  metadata: {
    processingTimeMs: number,         // Processing time
    totalRows: number,                // Total rows processed
    validEntries: number,             // Valid entries created
    invalidEntries: number,           // Invalid entries skipped
    normalizedEntries: number         // Successfully normalized entries
  }
}
```

**Processing Steps**:
1. Read spreadsheet data
2. Validate headers
3. Validate each entry
4. Normalize valid entries

---

## Configuration

### `AGGREGATION_CONFIG`

**Description**: Main configuration object controlling system behavior.

```javascript
const AGGREGATION_CONFIG = {
  // Execution limits
  MAX_EXECUTION_TIME_MS: 300000,     // 5 minutes (safety buffer)
  MAX_MEMORY_MB: 100,                // Memory limit
  BATCH_SIZE: 20,                    // Files per batch
  
  // File patterns
  TIMESHEET_FILE_PATTERN: /^Timesheet_(\d{4}-\d{2})_(.+)$/i,
  MONTH_FOLDER_PATTERN: /^(\d{4}-\d{2})$/,
  
  // Column headers (case-insensitive matching)
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
  
  // Validation patterns
  TIME_FORMAT_PATTERNS: [
    /^\d{1,2}:\d{2}$/,               // H:MM or HH:MM
    /^\d{1,2}:\d{2}:\d{2}$/,         // H:MM:SS or HH:MM:SS
    /^\d{1,2}\.\d{2}$/               // H.MM or HH.MM
  ],
  
  DATE_FORMAT_PATTERNS: [
    /^\d{4}-\d{2}-\d{2}$/,           // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/,         // MM/DD/YYYY
    /^\d{1,2}\/\d{1,2}\/\d{4}$/      // M/D/YYYY
  ],
  
  // Error handling
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  
  // Performance
  CHECKPOINT_INTERVAL: 10            // Progress logging frequency
};
```

### Error Types and Severity

```javascript
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

const SEVERITY_LEVELS = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};
```

---

## Data Structures

### TimesheetEntry

Standard normalized timesheet entry structure:

```javascript
{
  member: "JohnDoe",                  // Member identifier
  date: "2025-09-15",                 // Date in YYYY-MM-DD format
  from_time: "09:00",                 // Start time in HH:MM format
  to_time: "17:30",                   // End time in HH:MM format
  project: "Project Alpha",            // Project name/identifier
  task_type: "Development",            // Type of work performed
  description: "Working on features", // Detailed description
  tc_from_time: "09:00",              // Timecard start time (optional)
  tc_to_time: "17:30",                // Timecard end time (optional)
  source_file: "JohnDoe",             // Source filename
  row_index: 5,                       // Original row number
  processed_at: "2025-10-06T10:30:00.000Z" // Processing timestamp
}
```

### ErrorObject

Standard error object structure:

```javascript
{
  type: "INVALID_ENTRY",              // Error type from ERROR_TYPES
  source: "DATA_VALIDATION",          // Source component
  message: "Missing required field 'date'", // Human-readable message
  severity: "ERROR",                  // Severity level
  timestamp: "2025-10-06T10:30:00.000Z", // Error timestamp
  memberName: "JohnDoe",              // Context: member name
  fileName: "Timesheet_2025-09_JohnDoe", // Context: filename
  rowIndex: 5,                        // Context: row number
  field: "date"                       // Context: specific field
}
```

---

## Error Handling

### Error Reporting System

The system includes a comprehensive error reporting system accessible through `ErrorReportingSystem`:

#### `ErrorReportingSystem.initialize()`

Initializes the error reporting system with a unique session ID.

#### `ErrorReportingSystem.logError(error, context)`

Logs a structured error with contextual information.

**Parameters**:
- `error` (Object): Error object with type, message, severity
- `context` (Object): Additional context information

#### `ErrorReportingSystem.generateReport(options)`

Generates a comprehensive error report with analysis and recommendations.

**Returns**: Object containing:
```javascript
{
  sessionId: string,                  // Unique session identifier
  generatedAt: string,                // Report generation timestamp
  summary: {
    totalErrors: number,              // Total error count
    criticalErrors: number,           // Critical error count
    errors: number,                   // Error level count
    warnings: number,                 // Warning level count
    infoMessages: number              // Info level count
  },
  errorsByType: Object,               // Errors grouped by type
  errorsBySource: Object,             // Errors grouped by source
  timeline: Array,                    // Chronological error timeline
  recommendations: Array,             // Actionable recommendations
  systemHealth: {
    overallStatus: string,            // HEALTHY/WARNING/CRITICAL
    issues: Array<string>             // Identified issues
  }
}
```

---

## Integration APIs

### Google Drive Integration

#### `DriveAPIIntegration.searchFolders(folderName, options)`

Enhanced folder search with advanced filtering and error handling.

**Parameters**:
- `folderName` (string): Folder name to search for
- `options` (Object): Search options
  - `exactMatch` (boolean): Require exact name match
  - `parentFolderId` (string): Limit search to specific parent

#### `DriveAPIIntegration.enumerateFiles(folder, options)`

Enhanced file enumeration with filtering and batch processing.

**Parameters**:
- `folder` (DriveApp.Folder): Folder to enumerate
- `options` (Object): Enumeration options
  - `batchSize` (number): Files per batch (default: 50)
  - `namePattern` (RegExp): Filter by filename pattern
  - `mimeTypeFilter` (Array): Filter by MIME types

### Google Sheets Integration

#### `SheetsAPIIntegration.detectColumns(headers, options)`

Intelligent column detection and header mapping with confidence scoring.

**Parameters**:
- `headers` (Array): Raw header array from spreadsheet
- `options` (Object): Detection options

**Returns**: Object containing:
```javascript
{
  columnMap: Object,                  // Mapped column indices
  unmappedColumns: Array,             // Unrecognized columns
  confidence: number,                 // Overall confidence score (0-1)
  errors: Array,                      // Detection issues
  metadata: Object                    // Detection statistics
}
```

#### `SheetsAPIIntegration.extractData(fileId, options)`

Enhanced spreadsheet data extraction with intelligent parsing.

**Parameters**:
- `fileId` (string): Google Sheets file ID
- `options` (Object): Extraction options
  - `sheetName` (string): Specific sheet name (optional)

---

## Utility Functions

### Date and Time Utilities

#### `normalizeDate(dateValue)`

Normalizes various date formats to YYYY-MM-DD standard.

**Supported Formats**:
- YYYY-MM-DD (preserved)
- MM/DD/YYYY → YYYY-MM-DD
- M/D/YYYY → YYYY-MM-DD
- Date objects → YYYY-MM-DD
- Parseable strings → YYYY-MM-DD

#### `normalizeTime(timeValue)`

Normalizes various time formats to HH:MM standard.

**Supported Formats**:
- HH:MM (preserved)
- H:MM → HH:MM
- HH:MM:SS → HH:MM
- HH.MM → HH:MM
- Decimal hours → HH:MM

#### `parseTimeToMinutes(timeStr)`

Converts time string to minutes since midnight for comparison.

**Returns**: Number of minutes or null if invalid.

### Progress Tracking

#### `ProgressTracker.startOperation(operationId, config)`

Starts tracking a new long-running operation.

**Parameters**:
- `operationId` (string): Unique identifier
- `config` (Object): Operation configuration

#### `ProgressTracker.updateProgress(operationId, update)`

Updates progress for an active operation.

#### `ProgressTracker.getOperationStatus(operationId)`

Retrieves current status and metrics for an operation.

### Memory Management

#### `MemoryManager.checkMemoryUsage(context)`

Monitors memory usage and provides status assessment.

#### `MemoryManager.optimizeBatchSize(defaultBatchSize, itemSizeEstimate)`

Dynamically optimizes batch size based on available memory.

#### `MemoryManager.performCleanup(options)`

Performs memory cleanup operations to free resources.

---

## Performance Considerations

### Execution Limits

- **Time Limit**: 6 minutes maximum execution time (Google Apps Script limit)
- **Memory Limit**: ~100MB practical limit for stable operation
- **Batch Processing**: Processes files in configurable batches (default: 20 files)

### Optimization Strategies

1. **Progressive Processing**: Large datasets processed in stages with checkpoints
2. **Memory Management**: Automatic cleanup and batch size optimization
3. **Retry Logic**: Automatic retry for transient failures
4. **Duplicate Detection**: Hash-based duplicate entry removal
5. **Column Filtering**: Processes only relevant columns to reduce memory usage

### Scalability

The system is designed to handle:
- **200+ team members** with individual timesheet files
- **20,000+ timesheet entries** per aggregation run
- **Variable file sizes** from simple to complex spreadsheets
- **Mixed data quality** with comprehensive validation and error handling

### Best Practices

1. **Batch Size Tuning**: Adjust `AGGREGATION_CONFIG.BATCH_SIZE` based on file complexity
2. **Memory Monitoring**: Enable memory tracking for large datasets
3. **Error Analysis**: Review error reports to identify data quality issues
4. **Performance Metrics**: Monitor processing times and optimize bottlenecks
5. **Progressive Processing**: For very large datasets, consider multiple runs with date ranges

---

## Example Usage

### Basic Aggregation

```javascript
// Initialize error reporting
ErrorReportingSystem.initialize();

// Run aggregation
const result = aggregateMonthlyTimesheets('2025-09');

// Check results
if (result.metadata.systemHealthy) {
  console.log(`Successfully processed ${result.entries.length} entries`);
  console.log(`Processing time: ${result.metadata.processingTimeMs}ms`);
} else {
  console.error('Aggregation completed with issues');
  const report = ErrorReportingSystem.generateReport();
  console.log('Error report:', report);
}
```

### Advanced Processing with Monitoring

```javascript
// Initialize systems
ErrorReportingSystem.initialize();
MemoryManager.initialize();

// Start progress tracking
const operationId = ProgressTracker.startOperation('monthly-aggregation', {
  name: 'Monthly Timesheet Aggregation',
  totalItems: 0, // Will be updated as files are discovered
  stages: ['Discovery', 'Processing', 'Aggregation', 'Cleanup']
});

// Run aggregation with monitoring
const result = aggregateMonthlyTimesheets('2025-09');

// Complete tracking
ProgressTracker.completeOperation(operationId);

// Generate reports
const errorReport = ErrorReportingSystem.generateReport();
const memoryReport = MemoryManager.generateMemoryReport();

console.log('Processing complete:', {
  entries: result.entries.length,
  errors: errorReport.summary.totalErrors,
  memoryUsage: memoryReport.peak.usageMB
});
```

---

**Last Updated**: October 6, 2025  
**Version**: 1.0.0  
**Support**: See deployment documentation for troubleshooting and support information.
