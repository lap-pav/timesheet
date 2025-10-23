# Data Model: Timesheet Aggregation

**Feature**: Timesheet Aggregation and Data Normalization  
**Date**: 2025-10-06  
**Context**: Google Apps Script data structures and transformations

## Core Entities

### MonthlyFolder
Represents a Google Drive folder containing all timesheet files for a specific month.

**Properties:**
- `name`: String - Folder name in YYYY-MM format (e.g., "2025-09")
- `driveFolder`: DriveApp.Folder - Google Drive folder object
- `fileCount`: Number - Count of timesheet files found
- `expectedMembers`: Array<String> - List of expected member names (optional)

**Validation Rules:**
- Name must match YYYY-MM pattern
- Must be accessible with read permissions
- Should contain at least one timesheet file

### TimesheetFile
Represents an individual member's timesheet spreadsheet file.

**Properties:**
- `fileName`: String - Original filename (e.g., "Timesheet_2025-09_JohnDoe")
- `memberName`: String - Extracted member name from filename
- `fileId`: String - Google Drive file ID
- `spreadsheet`: SpreadsheetApp.Spreadsheet - Opened spreadsheet object
- `isValid`: Boolean - Whether file is accessible and properly formatted

**Validation Rules:**
- Filename must match pattern: "Timesheet_YYYY-MM_MemberName"
- File must be accessible spreadsheet format
- Must contain recognizable data structure

### TimesheetEntry
Represents a single daily timesheet record from a member's spreadsheet.

**Source Fields** (from spreadsheet):
- `date`: Date/String - Work date
- `fromTime`: String - Start time (various formats supported)
- `toTime`: String - End time (various formats supported)  
- `project`: String - Project name or identifier
- `taskType`: String - Type of task performed
- `description`: String - Detailed description of work
- `tcFromTime`: String - Time correction start time (optional)
- `tcToTime`: String - Time correction end time (optional)

**Normalized Fields** (for JSON output):
- `member`: String - Member name from filename
- `date`: String - Standardized date (YYYY-MM-DD)
- `from_time`: String - Standardized time (HH:MM)
- `to_time`: String - Standardized time (HH:MM)
- `project`: String - Cleaned project name
- `task_type`: String - Standardized task type
- `description`: String - Trimmed description
- `tc_from_time`: String - Standardized correction time (HH:MM)
- `tc_to_time`: String - Standardized correction time (HH:MM)

**Validation Rules:**
- Date must be valid and within reasonable range
- From time must be valid time format
- To time must be valid time format and after from time
- Project must be non-empty string
- Task type must be non-empty string
- Time corrections must be valid times if provided

### AggregatedDataset
Represents the final output containing all processed timesheet entries.

**Properties:**
- `entries`: Array<TimesheetEntry> - Flat array of all normalized entries
- `metadata`: Object - Processing metadata
  - `processedAt`: String - ISO timestamp of processing
  - `monthFolder`: String - Source folder name
  - `totalFiles`: Number - Total files processed
  - `successfulFiles`: Number - Files processed without errors
  - `totalEntries`: Number - Total entries in output
  - `processingTimeMs`: Number - Total processing time
- `errors`: Array<ProcessingError> - List of errors encountered

### ProcessingError
Represents errors encountered during processing.

**Properties:**
- `type`: String - Error type ("FILE_ACCESS", "DATA_VALIDATION", "SYSTEM_ERROR")
- `source`: String - Source file or entry identifier
- `message`: String - Human-readable error description
- `details`: Object - Additional error context
- `timestamp`: String - When error occurred

## Data Transformations

### Filename to Member Name
```javascript
// Input: "Timesheet_2025-09_JohnDoe.xlsx"
// Output: "JohnDoe"
function extractMemberName(filename) {
  const pattern = /^Timesheet_\d{4}-\d{2}_(.+)$/;
  const match = filename.match(pattern);
  return match ? match[1].replace(/\.[^.]+$/, '') : null;
}
```

### Time Standardization
```javascript
// Input: "9:30 AM", "09:30", "930", "9.5"
// Output: "09:30"
function standardizeTime(timeInput) {
  // Support multiple input formats
  // Convert to 24-hour HH:MM format
  // Handle AM/PM, decimal hours, various separators
}
```

### Date Standardization
```javascript
// Input: Date object, "2025-09-15", "9/15/2025", "15-Sep-2025"
// Output: "2025-09-15"
function standardizeDate(dateInput) {
  // Convert various date formats to YYYY-MM-DD
  // Handle Date objects, strings, Excel date numbers
}
```

### Entry Validation
```javascript
function validateEntry(entry) {
  return {
    isValid: Boolean,
    errors: Array<String>,
    warnings: Array<String>
  };
}
```

## JSON Output Schema

### Main Output Structure
```json
{
  "entries": [
    {
      "member": "JohnDoe",
      "date": "2025-09-15",
      "from_time": "09:00",
      "to_time": "17:30",
      "project": "Project Alpha",
      "task_type": "Development",
      "description": "Implemented user authentication",
      "tc_from_time": "09:15",
      "tc_to_time": "17:30"
    }
  ],
  "metadata": {
    "processedAt": "2025-10-06T10:30:00.000Z",
    "monthFolder": "2025-09",
    "totalFiles": 45,
    "successfulFiles": 43,
    "totalEntries": 1247,
    "processingTimeMs": 125000
  },
  "errors": [
    {
      "type": "FILE_ACCESS",
      "source": "Timesheet_2025-09_JaneSmith.xlsx",
      "message": "File could not be accessed - permission denied",
      "details": {
        "fileId": "abc123xyz",
        "attemptedAt": "2025-10-06T10:25:00.000Z"
      },
      "timestamp": "2025-10-06T10:25:00.000Z"
    }
  ]
}
```

### Entry-Level Validation States
- **Valid**: All required fields present and properly formatted
- **Warning**: Entry processed but with data quality concerns
- **Invalid**: Entry skipped due to missing required fields or invalid data

## Memory Management

### Data Structure Efficiency
- Use lightweight objects for entries (avoid unnecessary properties)
- Process files sequentially to limit memory usage
- Clear intermediate objects after processing

### Batch Processing Strategy
- Process files in batches if memory constraints detected
- Implement streaming aggregation for large datasets
- Monitor memory usage and adjust batch sizes dynamically

## Error Recovery

### File-Level Errors
- Continue processing remaining files when individual files fail
- Collect comprehensive error information for reporting
- Maintain partial results even with multiple file failures

### Entry-Level Errors
- Skip invalid entries but continue processing file
- Collect validation errors for quality reporting
- Maintain entry context for debugging purposes

This data model provides the foundation for implementing robust, scalable timesheet aggregation while maintaining data integrity and comprehensive error handling.
