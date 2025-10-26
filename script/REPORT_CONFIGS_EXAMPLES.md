# Report Configs Examples - Copy-Paste Template

This file contains ready-to-use examples for the "Report Configs" sheet. Simply copy and paste the table into your Google Sheets.

## Column Headers (Row 1)
```
Report Name	Description	Columns	Filters	Sort By	Sort Order	Summary Type	Enabled
```

## Example Configuration Rows

### Basic Reports
```
Weekly Summary	Basic member hours report	Member Name,Total Hours,Date		Member Name	ASC	NONE	TRUE
Daily Activity	Daily team activity summary	Date,Total Hours,Members Count,Members		Date	DESC	DAILY_TOTALS	TRUE
Member Totals	Individual member summaries	Member Name,Total Hours,Total Entries		Total Hours	DESC	MEMBER_TOTALS	TRUE
Project Hours	Hours grouped by project	Project Name,Total Hours,Members Count		Total Hours	DESC	PROJECT_TOTALS	TRUE
```

### Filtered Reports
```
High Hour Entries	Entries over 8 hours	Member Name,Date,Hours,Project Name	Hours>8	Hours	DESC	NONE	TRUE
Low Hour Entries	Entries under 4 hours	Member Name,Date,Hours,Project Name	Hours<4	Hours	ASC	NONE	TRUE
Development Work	Development team only	Member Name,Project Name,Hours,Date	Project Name contains Development	Member Name	ASC	NONE	TRUE
Recent Activity	Last 7 days of work	Member Name,Date,Hours,Project Name	Date>=2025-10-20	Date	DESC	NONE	TRUE
```

### Advanced Reports
```
Detailed Timesheet	Full timesheet details	Member Name,Date,Start Time,End Time,Hours,Project Name,Task Description		Date	DESC	NONE	TRUE
Project Timeline	Project work by date	Project Name,Date,Total Hours,Members		Date	ASC	DAILY_TOTALS	TRUE
Member Performance	Performance metrics	Member Name,Total Hours,Total Entries,Date Range		Total Hours	DESC	MEMBER_TOTALS	TRUE
```

### Disabled Examples (for reference)
```
Test Report	Test configuration	Member Name,Hours	Hours>0	Member Name	ASC	NONE	FALSE
Future Feature	Placeholder for new report	Member Name,Date		Date	DESC	NONE	FALSE
```

## Copy-Paste Instructions

1. **Open your Google Spreadsheet** with the timesheet application
2. **Create "Report Configs" sheet**:
   - Right-click on sheet tabs at the bottom
   - Select "Insert sheet"
   - Name it exactly: `Report Configs`
3. **Add column headers**:
   - Copy the headers row from above
   - Paste into row 1 (A1:H1)
4. **Add example configurations**:
   - Copy any example rows you want to use
   - Paste starting from row 2
   - Each line becomes one row in the spreadsheet
5. **Test the setup**:
   - Go to the Custom Menu → "Report"
   - Should show available configurations

## Customization Tips

### Modifying Columns
- Available columns: `Member Name`, `PAV ID`, `Date`, `Start Time`, `End Time`, `Hours`, `Total Hours`, `Project Name`, `Task Description`, `Status`, `Department`, `Role`
- Separate multiple columns with commas: `Member Name,Hours,Date`
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
