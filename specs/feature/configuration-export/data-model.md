# Data Model: Configuration-Driven Report Export

## Core Entities

### 1. Report Configuration
**Purpose**: Defines how a report should be generated from aggregated data

**Attributes**:
- `reportName`: String - Unique identifier for the report type
- `description`: String - Human-readable description of the report
- `columns`: Array[String] - Ordered list of columns to include in output
- `filters`: Object - Key-value pairs for filtering data (e.g., {"Active": true})
- `sortBy`: String - Column name to sort results by
- `sortOrder`: String - "ASC" or "DESC"
- `summaryType`: String - "SUM", "COUNT", "AVG", "NONE" for aggregation
- `enabled`: Boolean - Whether this configuration is active

**Validation Rules**:
- reportName must be unique within the configuration sheet
- columns must reference valid fields from aggregated data
- sortBy must reference a column included in the columns list
- summaryType must be one of the allowed enumeration values

### 2. Aggregated Timesheet Data
**Purpose**: Input data from aggregateMonthlyTimesheets function

**Expected Structure**:
```javascript
{
  metadata: {
    month: "2025-09",
    totalEntries: 150,
    successfulFiles: 5,
    totalFiles: 5
  },
  entries: [
    {
      memberName: "John Doe",
      pavId: "PAV001",
      date: "2025-09-15",
      startTime: "09:00",
      endTime: "17:00",
      totalHours: 8,
      project: "Project A",
      active: true
    }
  ]
}
```

**Validation Requirements**:
- entries array must not be empty
- Each entry must have required fields: memberName, date, totalHours
- Date format must be YYYY-MM-DD
- totalHours must be numeric and positive

### 3. Generated Report
**Purpose**: Output document created from configuration and data

**Structure**:
- **Header Row**: Column names as defined in configuration
- **Data Rows**: Filtered and sorted entries according to configuration
- **Summary Row**: Aggregated totals if summaryType is not "NONE"
- **Metadata Sheet**: Report generation details (timestamp, configuration used, record count)

**Google Sheets Format**:
- Main data on "Report Data" sheet
- Metadata on "Report Info" sheet
- Consistent formatting with headers in bold
- Date columns formatted as dates, numeric columns as numbers

### 4. Export Job
**Purpose**: Tracks the status of a report generation operation

**Attributes**:
- `jobId`: String - Unique identifier for the operation
- `configName`: String - Name of the configuration being used
- `status`: String - "PENDING", "PROCESSING", "COMPLETED", "FAILED"
- `startTime`: Date - When the job started
- `endTime`: Date - When the job completed (if finished)
- `recordCount`: Number - Number of records processed
- `errorMessage`: String - Error details if status is "FAILED"
- `outputFileId`: String - Google Drive file ID of generated report

## Data Relationships

### Configuration → Report Generation
- One configuration can generate multiple reports over time
- Each report generation uses exactly one configuration
- Configuration changes don't affect previously generated reports

### Aggregated Data → Report Outputs
- One set of aggregated data can be used for multiple report types
- Each report contains a subset/transformation of the aggregated data
- Original aggregated data remains unchanged during report generation

### Export Job → Generated Report
- One-to-one relationship between export job and output file
- Export job tracks the generation process for a specific report
- Multiple export jobs can use the same configuration with different data

## Configuration Sheet Schema

The "Report Configs" sheet structure:

| Column | Data Type | Description | Example |
|--------|-----------|-------------|---------|
| A - Report Name | String | Unique identifier | "Monthly Summary" |
| B - Description | String | Human-readable description | "Total hours by member" |
| C - Columns | String (comma-separated) | Output columns | "Member,Project,Hours" |
| D - Filters | String (JSON-like) | Data filtering rules | "Active=true,Hours>0" |
| E - Sort By | String | Column to sort by | "Hours" |
| F - Sort Order | String | ASC or DESC | "DESC" |
| G - Summary Type | String | Aggregation method | "SUM" |
| H - Enabled | Boolean | Active status | TRUE |

## Data Validation Rules

### Configuration Validation
1. **Report Name**: Required, unique, max 50 characters
2. **Columns**: Must reference valid fields from aggregated data structure
3. **Filters**: Must use valid comparison operators (=, >, <, >=, <=)
4. **Sort By**: Must be one of the columns specified in Columns field
5. **Summary Type**: Must be SUM, COUNT, AVG, or NONE
6. **Enabled**: Must be TRUE or FALSE

### Runtime Data Validation
1. **Input Data**: Verify aggregated data structure matches expected format
2. **Configuration Integrity**: Ensure referenced columns exist in input data
3. **Filter Values**: Validate filter criteria against actual data types
4. **Memory Constraints**: Check data size against Google Apps Script limits

## Error Handling Strategy

### Configuration Errors
- Invalid column references → Show specific missing column names
- Malformed filters → Highlight syntax errors with examples
- Duplicate report names → List conflicting configurations

### Data Processing Errors
- Empty input data → Clear message about data availability
- Filter results in no data → Warning with suggestion to modify filters
- Memory constraints → Automatic chunking with progress indicators

### Export Errors
- Drive permissions → Clear instructions for folder access
- File creation failures → Retry mechanism with fallback options
