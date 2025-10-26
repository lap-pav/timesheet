# Quickstart: Configuration-Driven Report Export

## Overview
This feature enables users to generate customizable reports from aggregated timesheet data using configuration-driven templates. Users define report formats in a Google Sheets configuration, and the system generates reports as new Google Sheets documents.

## Prerequisites
- Existing aggregateMonthlyTimesheets function is working
- Google Spreadsheet with timesheet data
- Edit access to the Google Spreadsheet
- Google Drive folder access for report output

## Setup Instructions

### 1. Create Report Configuration Sheet
1. Open your timesheet Google Spreadsheet
2. Add a new sheet named "Report Configs"
3. Set up the header row with these exact column names:
   ```
   A: Report Name
   B: Description  
   C: Columns
   D: Filters
   E: Sort By
   F: Sort Order
   G: Summary Type
   H: Enabled
   ```

### 2. Add Sample Configuration
Add this sample configuration in row 2:
```
A2: Monthly Summary
B2: Total hours by member for the month
C2: memberName,totalHours,project
D2: active=true,totalHours>0
E2: totalHours
F2: DESC
G2: SUM
H2: TRUE
```

### 3. Deploy Code to Google Apps Script
1. Copy the configuration export functions to your Code.gs file
2. Add the new menu item to your onOpen() function:
   ```javascript
   ui.createMenu('Custom Menu')
     .addItem('Generate Timesheet Files', 'generateTimesheetFiles')
     .addItem('Aggregate Monthly Timesheets', 'aggregateMonthlyTimesheetsUI')
     .addItem('Export Configurable Report', 'exportConfigurableReportUI')
     .addToUi();
   ```

## Usage Workflow

### Basic Usage
1. **Aggregate Data**: Run "Aggregate Monthly Timesheets" first to prepare data
2. **Select Report**: Go to Custom Menu → "Export Configurable Report"
3. **Choose Configuration**: Select from available report configurations
4. **Generate Report**: System creates new Google Sheets file with report
5. **Access Report**: Find generated report in the same Google Drive folder

### Creating New Report Types
1. Open the "Report Configs" sheet
2. Add a new row with your configuration:
   - **Report Name**: Unique identifier (e.g., "Weekly Detail")
   - **Description**: What the report shows
   - **Columns**: Comma-separated list (e.g., "date,memberName,hours")
   - **Filters**: Criteria (e.g., "active=true,hours>0")
   - **Sort By**: Column to sort by
   - **Sort Order**: "ASC" or "DESC"
   - **Summary Type**: "SUM", "COUNT", "AVG", or "NONE"
   - **Enabled**: TRUE to activate

## Available Columns
Use these column names in your configurations:
- `memberName` - Employee name
- `pavId` - Employee ID
- `date` - Work date
- `startTime` - Start time
- `endTime` - End time  
- `totalHours` - Hours worked
- `project` - Project name
- `active` - Active status

## Filter Examples
- `active=true` - Only active employees
- `totalHours>0` - Only entries with hours
- `date>=2025-10-01` - From specific date
- `project=Project A` - Specific project only
- Multiple filters: `active=true,totalHours>4`

## Common Report Templates

### 1. Employee Summary
```
Report Name: Employee Summary
Columns: memberName,totalHours
Filters: active=true
Sort By: totalHours
Sort Order: DESC
Summary Type: SUM
```

### 2. Daily Detail
```
Report Name: Daily Detail  
Columns: date,memberName,project,totalHours
Filters: active=true
Sort By: date
Sort Order: ASC
Summary Type: NONE
```

### 3. Project Breakdown
```
Report Name: Project Breakdown
Columns: project,memberName,totalHours
Filters: totalHours>0
Sort By: project
Sort Order: ASC
Summary Type: COUNT
```

## Troubleshooting

### Common Issues

**"Report Configs sheet not found"**
- Ensure sheet is named exactly "Report Configs"
- Check spelling and capitalization

**"No valid configurations found"**
- Check that Enabled column is set to TRUE
- Verify all required columns are filled
- Check for validation errors in configuration

**"Column 'xyz' not found in data"**
- Use exact column names from Available Columns list
- Check spelling and case sensitivity

**"Export failed - permissions error"**
- Ensure you have edit access to the Google Spreadsheet
- Check Google Drive folder permissions

### Validation Errors
The system validates configurations before generating reports:
- Report names must be unique
- Column names must exist in aggregated data
- Sort column must be included in columns list
- Summary type must be SUM, COUNT, AVG, or NONE

## Performance Notes
- Large datasets (>1000 entries) may take 1-2 minutes
- Progress indicators show for operations >30 seconds
- Maximum processing time is 5 minutes
- Reports are saved automatically to Google Drive

## Advanced Configuration

### Complex Filters
Combine multiple criteria:
```
active=true,totalHours>=8,date>=2025-10-01
```

### Multiple Sort Criteria
Currently supports single column sorting. For multiple criteria, generate separate reports.

### Custom Formatting
Generated reports include:
- Bold headers with background color
- Proper data type formatting (dates, numbers)
- Summary rows in bold
- Auto-sized columns

## Integration Points
- Input: Uses aggregateMonthlyTimesheets() output
- Configuration: Reads from "Report Configs" sheet
- Output: Creates new Google Sheets in same Drive folder
- UI: Accessible via Custom Menu

## Next Steps
1. Test with sample configuration
2. Create additional report types as needed
3. Share generated reports with stakeholders
4. Modify configurations based on feedback
