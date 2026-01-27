# Enhanced Report Configs Examples - Expression-Based Configuration

This file contains ready-to-use examples for the "Report Config" sheet with the new enhanced expression system. Simply copy and paste the configurations into your Google Sheets.

## Column Headers (Row 1) - Enhanced Version
```
Report Name	Description	Columns	Filters	Sort By	Sort Order	Summary Type	Enabled	Output Structure	Grouping Field
```

## Enhanced Expression-Based Examples

### Expression-Based Column Transformations (Corrected)
```
Simple Test Report	Basic column test	Member Name:record.member,Project Name:record.project		Member Name	ASC	NONE	TRUE	SINGLE_SHEET	
Basic Hours Report	Show existing hours	Member Name:record.member,Date:record.date,Start Time:record.from_time,End Time:record.to_time,Project Name:record.project		Member Name	ASC	NONE	TRUE	SINGLE_SHEET	
Calculated Hours Report	Calculate hours from times	Member Name:record.member,Date:record.date,Calculated Hours:calculateHours(record.from_time,record.to_time),Project Name:record.project		Member Name	ASC	NONE	TRUE	SINGLE_SHEET	
Date Format Report	Date formatting test	Member Name:record.member,Date:record.date,Formatted Date:formatDate(record.date),Project Name:record.project		Member Name	ASC	NONE	TRUE	SINGLE_SHEET	
```

### Multi-Sheet Output Examples
```
Project Breakdown	Separate sheet per project	Project Name:record.project,Member Name:record.member,Date:record.date,Hours:calculateHours(record.from_time,record.to_time),Day:getDayOfWeek(record.date)		Date	ASC	NONE	TRUE	SHEET_PER_PROJECT	Project Name
Employee Reports	Individual employee sheets	Member Name:record.member,Date:record.date,Project Name:record.project,Hours:calculateHours(record.from_time,record.to_time),Month:getMonthName(record.date)		Date	DESC	NONE	TRUE	SHEET_PER_EMPLOYEE	Member Name
Department Analysis	Department-based organization	Task Type:record.task_type,Member Name:record.member,Project Name:record.project,Hours:calculateHours(record.from_time,record.to_time)		Member Name	ASC	NONE	TRUE	SHEET_PER_PROJECT	Task Type
```

### Multi-File Output Examples
```
Project Files	Separate file per project	Project Name:record.project,Member Name:record.member,Date:record.date,Hours:calculateHours(record.from_time,record.to_time),Task:defaultValue(record.task_type,"General")		Date	DESC	PROJECT_TOTALS	TRUE	FILE_PER_PROJECT	Project Name
Employee Files	Individual employee files	Member Name:record.member,Date:record.date,Project Name:record.project,Hours:calculateHours(record.from_time,record.to_time),Notes:defaultValue(record.description,"No notes")		Date	DESC	NONE	TRUE	FILE_PER_EMPLOYEE	Member Name
```

### Advanced Expression Examples
```
Complex Calculations	Advanced time calculations	Member Name:record.member,Total Hours:calculateHours(record.from_time,record.to_time),Overtime:defaultValue(calculateHours(record.from_time,record.to_time)-8,0),Week Day:getDayOfWeek(record.date)		Member Name	ASC	NONE	TRUE	SINGLE_SHEET	
Search and Format	Text processing examples	Member Name:record.member,Project Search:stringContains(record.project,"Development"),Formatted Date:formatDate(record.date),Hours:calculateHours(record.from_time,record.to_time)		Member Name	ASC	NONE	TRUE	SINGLE_SHEET	
Date Arithmetic	Date manipulation examples	Member Name:record.member,Date:record.date,Future Date:addDays(record.date,7),Month:getMonthName(record.date),Hours:calculateHours(record.from_time,record.to_time)		Date	ASC	NONE	TRUE	SINGLE_SHEET	
```

### Advanced Reports
```
Detailed Timesheet	Full timesheet details	Member Name:record.member,Date:record.date,Start Time:record.from_time,End Time:record.to_time,Hours:calculateHours(record.from_time,record.to_time),Project Name:record.project,Task Description:record.description		Date	DESC	NONE	TRUE	SINGLE_SHEET	
Project Timeline	Project work by date	Project Name:record.project,Date:record.date,Hours:calculateHours(record.from_time,record.to_time),Member:record.member		Date	ASC	NONE	TRUE	SINGLE_SHEET	
Member Performance	Performance metrics	Member Name:record.member,Hours:calculateHours(record.from_time,record.to_time),Project:record.project,Date:record.date		Member Name	DESC	NONE	TRUE	SINGLE_SHEET	
```

### Disabled Examples (for reference)
```
Test Report	Test configuration	Member Name:record.member,Hours:calculateHours(record.from_time,record.to_time)	Hours>0	Member Name	ASC	NONE	FALSE	SINGLE_SHEET	
Future Feature	Placeholder for new report	Member Name:record.member,Date:record.date		Date	DESC	NONE	FALSE	SINGLE_SHEET	
```

## Expression Functions Quick Reference

### Available Built-in Functions
- `calculateHours(timeIn, timeOut)` - Calculate duration between times
- `formatDate(date)` - Format dates as ISO date string
- `formatTime(timeValue)` - Format time values as HH:MM
- `getDayOfWeek(date)` - Get day name (Monday, Tuesday, etc.)
- `getMonthName(date)` - Get month name (January, February, etc.)
- `getWeekNumber(date)` - Get week number of the year
- `addDays(date, days)` - Add/subtract days from a date
- `stringContains(text, substring)` - Check if text contains substring
- `defaultValue(value, fallback)` - Use fallback if value is empty/null
- `upper(text)` - Convert text to uppercase
- `lower(text)` - Convert text to lowercase
- `concat(...)` - Concatenate multiple values with spaces

### Expression Syntax Examples (Corrected)
- Simple field: `Member Name:record.member` (direct field access with expression format)
- Basic calculation: `Hours:calculateHours(record.from_time,record.to_time)`
- Text formatting: `Day:getDayOfWeek(record.date)`
- Default values: `Task:defaultValue(record.task_type,"General")`
- Complex: `Overtime:defaultValue(calculateHours(record.from_time,record.to_time)-8,0)`

### Important Syntax Rules
- **Field references**: Use dot notation `record.fieldName` (use mapped field names from table below)
- **String literals**: Use double quotes: `"Development"`, `"Active"`
- **Function calls**: Standard syntax: `functionName(arg1, arg2)`
- **Field name mapping**: Use the internal field names, not display names

### Field Name Mapping (Corrected for Actual Data Structure)
| Display Name | Internal Field Name | Expression Usage |
|--------------|-------------------|-------------------|
| Member Name | member | `record.member` |
| Date | date | `record.date` |
| Start Time | from_time | `record.from_time` |
| End Time | to_time | `record.to_time` |
| Project Name | project | `record.project` |
| Task Type | task_type | `record.task_type` |
| Task Description | description | `record.description` |
| TC Start Time | tc_from_time | `record.tc_from_time` |
| TC End Time | tc_to_time | `record.tc_to_time` |
| Source File | source_file | `record.source_file` |
| Row Index | row_index | `record.row_index` |
| Processed At | processed_at | `record.processed_at` |

## Setup Instructions (Enhanced Version)

1. **Open your Google Spreadsheet** with the timesheet application
2. **Create "Report Config" sheet**:
   - Right-click on sheet tabs at the bottom
   - Select "Insert sheet"
   - Name it exactly: `Report Config`
3. **Add enhanced column headers**:
   - Copy the enhanced headers row from above
   - Paste into row 1 (A1:J1) - Note: Now 10 columns including Output Structure and Grouping Field
4. **Add example configurations**:
   - Copy any example rows you want to use
   - Paste starting from row 2
   - Each line becomes one row in the spreadsheet
5. **Test the setup**:
   - Go to the Custom Menu → "Report"
   - Should show available configurations

## Customization Tips

### Modifying Columns (Expression Format)
- Use expression format: `Display Name:record.field_name` or `Display Name:expression`
- Available fields: `member`, `date`, `from_time`, `to_time`, `project`, `task_type`, `description`, `tc_from_time`, `tc_to_time`, `source_file`, `row_index`, `processed_at`
- Example: `Member Name:record.member,Hours:calculateHours(record.from_time,record.to_time),Project:record.project`
- Order matters - columns appear in the specified order

### Filter Examples
- Single filter: `Hours>8`
- Multiple filters: `Hours>4,Status=Active`
- Text filters: `Project Name contains Development`
- Date filters: `Date>=2025-10-01`
- Exact match: `Member Name=John Doe`

### Summary Types Explained
- **NONE**: Shows individual timesheet entries as-is
- **MEMBER_TOTALS**: Groups all entries by member, shows totals per person
- **DAILY_TOTALS**: Groups all entries by date, shows daily totals
- **PROJECT_TOTALS**: Groups all entries by project, shows project totals

### Sort Options
- **Sort By**: Must be one of the columns you specified in "Columns"
- **Sort Order**: Either `ASC` (ascending/low to high) or `DESC` (descending/high to low)

### Enable/Disable Reports
- **TRUE**: Report appears in the selection menu
- **FALSE**: Report is saved but hidden from menu (useful for templates or testing)

## Troubleshooting

### Common Issues
- **"Invalid columns" error**: Check column names match exactly (case-sensitive)
- **"Sort By column not found" error**: Ensure Sort By column is included in the Columns list
- **No reports appear**: Check that at least one report has Enabled = TRUE
- **Filter not working**: Check filter syntax and ensure column names are correct

### Validation
- Report Name: Required, must be unique, max 50 characters
- Description: Required, max 200 characters  
- Columns: Required, must be valid column names
- Filters: Optional, must use correct operators
- Sort By: Optional, must be in Columns list if specified
- Sort Order: Must be ASC or DESC if Sort By is specified
- Summary Type: Must be NONE, MEMBER_TOTALS, DAILY_TOTALS, or PROJECT_TOTALS
- Enabled: Must be TRUE or FALSE
