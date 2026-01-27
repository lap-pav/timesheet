# Configuration Reader Contract

## Function Signature
```javascript
function readReportConfigurations()
```

## Purpose
Read and validate report configurations from the "Report Configs" sheet within the active Google Spreadsheet.

## Input Requirements
- Active Google Spreadsheet must contain a sheet named "Report Configs"
- Configuration sheet must follow the defined schema (8 columns: A-H)
- At least one configuration row must be present (excluding header)

## Output Contract
```javascript
{
  success: boolean,
  configurations: [
    {
      reportName: string,        // Required, unique, max 50 chars
      description: string,       // Required, max 200 chars
      columns: string[],         // Required, array of column names
      filters: object,           // Key-value pairs for filtering
      sortBy: string,            // Must be in columns array
      sortOrder: "ASC"|"DESC",   // Required enum value
      summaryType: "SUM"|"COUNT"|"AVG"|"NONE", // Required enum
      enabled: boolean           // Required true/false
    }
  ],
  errors: string[]              // Array of validation error messages
}
```

## Validation Rules
1. **Report Name**: Must be non-empty, unique across all configs, max 50 characters
2. **Description**: Must be non-empty, max 200 characters
3. **Columns**: Must be comma-separated valid column names from aggregated data
4. **Filters**: Must be valid key=value pairs, separated by commas
5. **Sort By**: Must reference a column from the columns list
6. **Sort Order**: Must be exactly "ASC" or "DESC"
7. **Summary Type**: Must be exactly "SUM", "COUNT", "AVG", or "NONE"
8. **Enabled**: Must be boolean TRUE or FALSE

## Error Conditions
- Sheet "Report Configs" not found → Return success: false, specific error message
- Empty configuration sheet → Return success: false, indicate no configurations
- Invalid data types → Return success: false, list specific validation failures
- Duplicate report names → Return success: false, list conflicting names

## Behavioral Requirements
- Only return configurations where enabled = TRUE
- Ignore empty rows in the configuration sheet
- Provide specific error messages for each validation failure
- Process all configurations before returning (don't fail on first error)

## Example Valid Configuration
```
Report Name: "Monthly Summary"
Description: "Total hours by member for the month"
Columns: "Member,Project,Hours"
Filters: "Active=true,Hours>0"
Sort By: "Hours"
Sort Order: "DESC"
Summary Type: "SUM"
Enabled: TRUE
```

## Example Error Response
```javascript
{
  success: false,
  configurations: [],
  errors: [
    "Row 2: Report Name 'Daily Report' exceeds 50 character limit",
    "Row 3: Sort By 'InvalidColumn' not found in Columns list",
    "Row 4: Summary Type 'INVALID' must be SUM, COUNT, AVG, or NONE"
  ]
}
```
