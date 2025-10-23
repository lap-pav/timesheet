# Contract: Data Validation Functions

**Functions**: Entry validation and normalization functions  
**Purpose**: Ensure data quality and standardize timesheet entries

## Core Validation Functions

### validateTimesheetEntry

```javascript
/**
 * Validates a raw timesheet entry from spreadsheet
 * @param {Object} entry - Raw entry data from spreadsheet row
 * @param {string} memberName - Member name from filename
 * @returns {Object} Validation result with status and errors
 */
function validateTimesheetEntry(entry, memberName)
```

**Input Contract:**
```javascript
{
  date: Any,           // Date value (Date object, string, or number)
  fromTime: Any,       // Start time (various formats)
  toTime: Any,         // End time (various formats)
  project: Any,        // Project identifier
  taskType: Any,       // Task type description
  description: Any,    // Work description
  tcFromTime: Any,     // Time correction start (optional)
  tcToTime: Any        // Time correction end (optional)
}
```

**Output Contract:**
```javascript
{
  isValid: Boolean,           // Overall validation status
  errors: Array<String>,      // Critical errors preventing processing
  warnings: Array<String>,    // Data quality warnings
  normalizedEntry: Object     // Cleaned and standardized entry
}
```

### normalizeTimesheetEntry

```javascript
/**
 * Converts validated entry to standardized output format
 * @param {Object} validatedEntry - Entry that passed validation
 * @param {string} memberName - Member name for output
 * @returns {Object} Normalized entry for JSON output
 */
function normalizeTimesheetEntry(validatedEntry, memberName)
```

**Output Contract:**
```javascript
{
  member: String,        // Member name from filename
  date: String,          // YYYY-MM-DD format
  from_time: String,     // HH:MM format (24-hour)
  to_time: String,       // HH:MM format (24-hour)  
  project: String,       // Trimmed project name
  task_type: String,     // Standardized task type
  description: String,   // Cleaned description
  tc_from_time: String,  // HH:MM or empty string
  tc_to_time: String     // HH:MM or empty string
}
```

## Validation Rules

### Required Field Validation
```javascript
// All these fields must be present and non-empty
const requiredFields = ['date', 'fromTime', 'toTime', 'project', 'taskType'];

// Validation behavior:
// - Missing fields → error
// - Empty string → error  
// - Null/undefined → error
// - Whitespace only → error after trim
```

### Data Type Validation
```javascript
// Date validation
// - Accept: Date objects, ISO strings, Excel serial numbers, common formats
// - Reject: Invalid dates, future dates beyond reasonable range
// - Normalize to: YYYY-MM-DD string format

// Time validation  
// - Accept: "HH:MM", "H:MM AM/PM", decimal hours, Excel time values
// - Reject: Invalid times, negative times, times > 24:00
// - Normalize to: HH:MM 24-hour format

// String validation
// - Accept: Non-empty strings after trimming
// - Reject: Empty, null, undefined, whitespace-only
// - Normalize: Trim whitespace, limit length if excessive
```

### Business Rule Validation
```javascript
// Time logic validation
function validateTimeLogic(fromTime, toTime) {
  // Rules:
  // - toTime must be after fromTime (same day)
  // - Duration must be reasonable (< 24 hours)
  // - Overnight shifts require special handling
  // - Break times should be reasonable
}

// Overtime detection
function detectOvertime(fromTime, toTime, date) {
  // Rules:
  // - > 8 hours = overtime warning
  // - Weekend work = weekend warning  
  // - Holiday work = holiday warning
  // - Late night work = late shift warning
}
```

## Error Categories

### Critical Errors (Entry Rejected)
- Missing required fields
- Invalid date format that cannot be parsed
- Invalid time format that cannot be parsed
- Time logic violations (end before start, impossible durations)

### Warnings (Entry Processed)
- Overtime hours detected
- Weekend or holiday work
- Unusual time patterns
- Description too long or too short
- Project name formatting issues

### Data Quality Issues
- Inconsistent project naming
- Unusual task type values
- Time correction discrepancies
- Duplicate entries for same date/member

## Test Scenarios

### Valid Entry Processing
```javascript
const validEntry = {
  date: "2025-09-15",
  fromTime: "09:00",
  toTime: "17:30", 
  project: "Project Alpha",
  taskType: "Development",
  description: "Implemented user authentication",
  tcFromTime: "",
  tcToTime: ""
};

const result = validateTimesheetEntry(validEntry, "JohnDoe");
assert(result.isValid === true);
assert(result.errors.length === 0);
assert(result.normalizedEntry.member === "JohnDoe");
```

### Error Handling
```javascript
const invalidEntry = {
  date: "invalid-date",
  fromTime: "25:00",  // Invalid time
  toTime: "08:00",    // Before start time
  project: "",        // Empty required field
  taskType: "Dev",
  description: "Work"
};

const result = validateTimesheetEntry(invalidEntry, "JaneSmith");
assert(result.isValid === false);
assert(result.errors.length > 0);
assert(result.errors.includes("Invalid date format"));
```

### Warning Generation
```javascript
const overtimeEntry = {
  date: new Date("2025-09-15"),
  fromTime: "08:00",
  toTime: "22:00",  // 14 hours - overtime
  project: "Urgent Project",
  taskType: "Development", 
  description: "Critical bug fix"
};

const result = validateTimesheetEntry(overtimeEntry, "DevLead");
assert(result.isValid === true);
assert(result.warnings.includes("Overtime hours detected"));
```

## Performance Requirements

### Processing Speed
- Validate 1000 entries in < 1 second
- Memory usage < 1MB for validation state
- No memory leaks during batch processing

### Error Reporting
- Detailed error context for debugging
- User-friendly error messages
- Structured error data for programmatic handling

### Integration Points
- Works with Google Apps Script data types
- Handles Excel/Sheets date serial numbers
- Compatible with various timezone scenarios
