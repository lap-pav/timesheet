# Contract: Timesheet Aggregation Main Function

**Function**: `aggregateMonthlyTimesheets(monthFolder)`  
**Purpose**: Main entry point for timesheet aggregation workflow

## Function Signature

```javascript
/**
 * Aggregates all timesheet files from a monthly folder into normalized JSON dataset
 * @param {string} monthFolder - Month identifier in YYYY-MM format (e.g., "2025-09")
 * @returns {Object} Aggregated dataset with entries, metadata, and errors
 * @throws {Error} When month folder is invalid or inaccessible
 */
function aggregateMonthlyTimesheets(monthFolder)
```

## Input Contract

### Required Parameters
- `monthFolder`: String matching pattern `\d{4}-\d{2}` (YYYY-MM format)

### Input Validation
- Month folder parameter must be provided
- Must match YYYY-MM format exactly
- Must represent valid calendar month (01-12)
- Year must be reasonable range (2020-2030)

### Pre-conditions
- Google Drive access permissions available
- Monthly folder exists and is accessible
- At least one timesheet file exists in folder

## Output Contract

### Success Response
```javascript
{
  "entries": Array<Object>,      // Normalized timesheet entries
  "metadata": {
    "processedAt": String,       // ISO timestamp
    "monthFolder": String,       // Input month folder
    "totalFiles": Number,        // Files found in folder
    "successfulFiles": Number,   // Files processed without errors  
    "totalEntries": Number,      // Total entries in output
    "processingTimeMs": Number   // Processing duration
  },
  "errors": Array<Object>        // Processing errors encountered
}
```

### Error Response
```javascript
// Throws Error for critical failures:
// - Month folder not found
// - No access permissions
// - Invalid month format
// - System errors preventing processing
```

## Behavioral Contracts

### Processing Guarantees
1. **Partial Success**: Returns results even if some files fail to process
2. **Error Logging**: All errors are captured and reported in output
3. **Data Integrity**: Valid entries are never corrupted by invalid entries
4. **Timeout Handling**: Graceful termination if execution limit approached

### Error Handling Promise
1. **Non-blocking**: Individual file failures don't stop overall processing
2. **Comprehensive Reporting**: All errors include context and timestamps
3. **Graceful Degradation**: Partial results better than complete failure
4. **User-Friendly**: Error messages suitable for end-user consumption

### Performance Commitments
1. **Execution Time**: Complete processing within 6-minute Google Apps Script limit
2. **Memory Efficiency**: Handle up to 20,000 entries without memory errors
3. **Progress Logging**: Provide status updates for long-running operations
4. **Resource Cleanup**: Properly close files and release resources

## Test Scenarios

### Happy Path
```javascript
// Input: "2025-09" with 50 valid timesheet files
// Expected: All 50 files processed, ~1500 entries returned, no errors
const result = aggregateMonthlyTimesheets("2025-09");
assert(result.metadata.totalFiles === 50);
assert(result.metadata.successfulFiles === 50);
assert(result.entries.length > 1400);
assert(result.errors.length === 0);
```

### Error Handling
```javascript
// Input: "2025-09" with some corrupted files
// Expected: Valid files processed, errors reported, partial results
const result = aggregateMonthlyTimesheets("2025-09");
assert(result.metadata.successfulFiles < result.metadata.totalFiles);
assert(result.entries.length > 0);
assert(result.errors.length > 0);
```

### Edge Cases
```javascript
// Empty folder
const emptyResult = aggregateMonthlyTimesheets("2025-12");
assert(emptyResult.entries.length === 0);
assert(emptyResult.metadata.totalFiles === 0);

// Invalid month format
assert.throws(() => aggregateMonthlyTimesheets("invalid-month"));
```

## Integration Points

### Dependencies
- `getMonthlyFolder(monthFolder)` - Folder discovery
- `getTimesheetFiles(folder)` - File enumeration  
- `processTimesheetFile(file)` - Individual file processing
- `validateAndNormalizeEntry(entry, member)` - Entry processing

### Side Effects
- Logs processing progress to console
- May create temporary data structures in memory
- Accesses Google Drive API for file operations
- May trigger Google Apps Script execution time warnings

### Error Propagation
- System errors (permissions, timeouts) are thrown as exceptions
- Data errors (corruption, validation) are captured and returned
- Processing errors are logged and included in error report
