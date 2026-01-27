# Report Generator Contract

## Function Signature
```javascript
function generateConfigurableReport(aggregatedData, configuration)
```

## Purpose
Generate a filtered, sorted, and formatted report based on configuration specifications and aggregated timesheet data.

## Input Requirements
### aggregatedData Parameter
```javascript
{
  metadata: {
    month: string,           // Format: "YYYY-MM"
    totalEntries: number,    // Positive integer
    successfulFiles: number, // Positive integer <= totalFiles
    totalFiles: number       // Positive integer
  },
  entries: [
    {
      memberName: string,    // Required, non-empty
      pavId: string,        // Required, format: "PAV###"
      date: string,         // Required, format: "YYYY-MM-DD"
      startTime: string,    // Format: "HH:MM"
      endTime: string,      // Format: "HH:MM"
      totalHours: number,   // Required, positive number
      project: string,      // Optional
      active: boolean       // Required
    }
  ]
}
```

### configuration Parameter
```javascript
{
  reportName: string,              // Required identifier
  description: string,             // Human-readable description
  columns: string[],               // Array of column names to include
  filters: object,                 // Key-value filtering criteria
  sortBy: string,                  // Column name for sorting
  sortOrder: "ASC"|"DESC",         // Sort direction
  summaryType: "SUM"|"COUNT"|"AVG"|"NONE", // Aggregation type
  enabled: boolean                 // Must be true for processing
}
```

## Output Contract
```javascript
{
  success: boolean,
  reportData: {
    headers: string[],           // Column headers in display order
    rows: any[][],               // Data rows matching header order
    summaryRow: any[]|null,      // Aggregated totals if summaryType != "NONE"
    metadata: {
      generatedAt: string,       // ISO timestamp
      configurationUsed: string, // Configuration name
      recordCount: number,       // Number of data rows
      filterCriteria: string,    // Applied filters description
      sortCriteria: string       // Applied sorting description
    }
  },
  errors: string[],              // Processing error messages
  warnings: string[]             // Non-critical issues
}
```

## Processing Requirements

### 1. Data Filtering
- Apply all filter criteria from configuration.filters
- Support operators: = (equals), > (greater than), < (less than), >= (greater or equal), <= (less or equal)
- Handle string, number, and boolean data types appropriately
- Case-insensitive string matching for equality comparisons

### 2. Column Selection
- Include only columns specified in configuration.columns
- Maintain column order as specified in configuration
- Map column names to actual data fields in aggregatedData.entries

### 3. Data Sorting
- Sort by the column specified in configuration.sortBy
- Use configuration.sortOrder for direction (ASC/DESC)
- Handle mixed data types gracefully (numbers before strings)

### 4. Summary Generation
- If summaryType = "SUM": Calculate totals for numeric columns
- If summaryType = "COUNT": Count total number of records
- If summaryType = "AVG": Calculate averages for numeric columns
- If summaryType = "NONE": No summary row generated

## Error Conditions
- Invalid aggregatedData structure → Return success: false with specific error
- Configuration references non-existent columns → Return success: false, list missing columns
- Filter criteria results in zero records → Return success: true with warning
- Sort column not in selected columns → Return success: false with error message
- Aggregation on non-numeric columns → Return success: false with type error

## Performance Requirements
- Process up to 10,000 data entries within 30 seconds
- Use minimal memory by processing data in chunks if necessary
- Provide progress indication for operations taking longer than 10 seconds

## Example Valid Input/Output

### Input Configuration
```javascript
{
  reportName: "Active Members Hours",
  columns: ["memberName", "totalHours", "project"],
  filters: { "active": true, "totalHours": ">0" },
  sortBy: "totalHours",
  sortOrder: "DESC",
  summaryType: "SUM"
}
```

### Expected Output
```javascript
{
  success: true,
  reportData: {
    headers: ["Member Name", "Total Hours", "Project"],
    rows: [
      ["John Doe", 40, "Project A"],
      ["Jane Smith", 35, "Project B"]
    ],
    summaryRow: ["TOTAL", 75, ""],
    metadata: {
      generatedAt: "2025-10-24T10:30:00Z",
      configurationUsed: "Active Members Hours",
      recordCount: 2,
      filterCriteria: "active=true AND totalHours>0",
      sortCriteria: "totalHours DESC"
    }
  },
  errors: [],
  warnings: []
}
```

## Column Name Mapping
Standard column mappings from aggregated data to display names:
- `memberName` → "Member Name"
- `pavId` → "PAV ID"
- `date` → "Date"
- `startTime` → "Start Time"
- `endTime` → "End Time"
- `totalHours` → "Total Hours"
- `project` → "Project"
- `active` → "Active Status"
