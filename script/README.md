# Timesheet Application - Modular Structure

The timesheet application has been restructured into a more maintainable modular architecture. This document explains the new organization and how to deploy it.

## File Structure

```
script/
├── constants.ts               # All constants and configuration objects  
├── main.ts                    # UI functions and main entry points
├── timesheet-generator.ts     # Generate Timesheet Files functionality
├── timesheet-aggregator.ts    # Aggregate Monthly Timesheets functionality
├── report-exporter.ts         # Export Configurable Report functionality
├── utils.ts                   # Shared utility classes and systems
├── README.md                  # This documentation file
├── DEPLOYMENT.md              # Deployment checklist and guide
└── REPORT_CONFIGS_EXAMPLES.md # Report configuration examples
```

## Module Descriptions

### constants.ts
Contains all configuration objects and constants:
- `AGGREGATION_CONFIG`: Timesheet aggregation settings
- `REPORT_CONFIG`: Configuration export settings  
- `ERROR_TYPES`: Error type definitions
- `SEVERITY_LEVELS`: Logging severity levels
- `TEMPLATE_FILE_ID`: Timesheet template file ID
- `MEMBER_COLUMNS`: Member sheet column mappings

### main.ts
Main UI functions that users interact with:
- `onOpen()`: Initialize application menu
- `generateTimesheetFiles()`: Generate timesheet files for all members
- `aggregateMonthlyTimesheetsUI()`: Aggregate monthly timesheets with progress feedback
- `exportConfigurableReportUI()`: Export configurable reports with user selection
- `selectReportConfigurationUI()`: Helper for report configuration selection
- `readTime()` / `readMembers()`: Shared utility functions

### timesheet-generator.ts
Handles timesheet file generation:
- `createTimesheetFolder()`: Create monthly folder structure
- `createTimesheetFile()`: Create individual timesheet files from template

### timesheet-aggregator.ts
Core timesheet data aggregation system:
- `aggregateMonthlyTimesheets()`: Main aggregation orchestration
- `getMonthlyFolder()`: Discover Google Drive folders
- `getTimesheetFiles()`: Enumerate timesheet files
- `readTimesheetData()`: Read spreadsheet data
- `validateTimesheetEntry()`: Validate individual entries
- `normalizeTimesheetEntry()`: Normalize data formats
- Data processing and validation utilities

### report-exporter.ts
Configuration-driven report export system:
- `readReportConfigurations()`: Read "Report Configs" sheet
- `generateConfigurableReport()`: Generate reports from aggregated data
- `exportReportToGoogleSheets()`: Export reports to new Google Sheets
- Configuration parsing and validation utilities
- User-friendly error message generation

## Report Configs Sheet Setup

To use the configurable report export feature, create a "Report Configs" sheet with the following structure:

### Column Headers (Row 1)
| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| Report Name | Description | Columns | Filters | Sort By | Sort Order | Summary Type | Enabled |

### Available Columns
You can use these column names in the "Columns" field (comma-separated):
- `Member Name` - Team member name
- `PAV ID` - Member ID
- `Date` - Entry date
- `Start Time` - Work start time
- `End Time` - Work end time
- `Hours` - Calculated hours
- `Total Hours` - Total hours (used in summaries)
- `Project Name` - Project name
- `Task Description` - Task details
- `Status` - Entry status
- `Department` - Member department
- `Role` - Member role

### Filter Operators
Use these operators in the "Filters" field:
- `=` - Exact match (e.g., `Status=Active`)
- `!=` - Not equal (e.g., `Status!=Inactive`)
- `>` - Greater than (e.g., `Hours>8`)
- `<` - Less than (e.g., `Hours<4`)
- `>=` - Greater than or equal (e.g., `Hours>=8`)
- `<=` - Less than or equal (e.g., `Hours<=8`)
- `contains` - Text contains (e.g., `Project Name contains Development`)

### Summary Types
- `NONE` - Show individual records
- `MEMBER_TOTALS` - Group by team member with totals
- `DAILY_TOTALS` - Group by date with totals
- `PROJECT_TOTALS` - Group by project with totals

### Example Configurations

#### Example 1: Basic Weekly Summary
| Report Name | Description | Columns | Filters | Sort By | Sort Order | Summary Type | Enabled |
|-------------|-------------|---------|---------|---------|------------|--------------|---------|
| Weekly Summary | Basic member hours | Member Name,Total Hours,Date | | Member Name | ASC | NONE | TRUE |

#### Example 2: High-Hour Entries Report
| Report Name | Description | Columns | Filters | Sort By | Sort Order | Summary Type | Enabled |
|-------------|-------------|---------|---------|---------|------------|--------------|---------|
| Long Hours | Entries over 8 hours | Member Name,Date,Hours,Project Name | Hours>8 | Hours | DESC | NONE | TRUE |

#### Example 3: Project Summary Report
| Report Name | Description | Columns | Filters | Sort By | Sort Order | Summary Type | Enabled |
|-------------|-------------|---------|---------|---------|------------|--------------|---------|
| Project Hours | Hours by project | Project Name,Total Hours,Members Count | | Total Hours | DESC | PROJECT_TOTALS | TRUE |

#### Example 4: Daily Team Activity
| Report Name | Description | Columns | Filters | Sort By | Sort Order | Summary Type | Enabled |
|-------------|-------------|---------|---------|---------|------------|--------------|---------|
| Daily Activity | Daily team summary | Date,Total Hours,Members Count,Members | | Date | DESC | DAILY_TOTALS | TRUE |

#### Example 5: Member Performance Report
| Report Name | Description | Columns | Filters | Sort By | Sort Order | Summary Type | Enabled |
|-------------|-------------|---------|---------|---------|------------|--------------|---------|
| Member Totals | Individual member summaries | Member Name,Total Hours,Total Entries | | Total Hours | DESC | MEMBER_TOTALS | TRUE |

#### Example 6: Development Team Filter
| Report Name | Description | Columns | Filters | Sort By | Sort Order | Summary Type | Enabled |
|-------------|-------------|---------|---------|---------|------------|--------------|---------|
| Dev Team Hours | Development team only | Member Name,Project Name,Hours | Project Name contains Development | Member Name | ASC | NONE | TRUE |

#### Example 7: Recent Activity (Last Week)
| Report Name | Description | Columns | Filters | Sort By | Sort Order | Summary Type | Enabled |
|-------------|-------------|---------|---------|---------|------------|--------------|---------|
| Recent Work | This week's entries | Member Name,Date,Hours,Project Name | Date>=2025-10-20 | Date | DESC | NONE | TRUE |

### Quick Setup Guide
1. **Create the Sheet**: Right-click sheet tabs → Insert sheet → Name it "Report Configs"
2. **Add Headers**: Copy the column headers above to row 1
3. **Add Examples**: Copy any of the example rows above to start with
4. **Test**: Run "Report" from the Custom Menu to test your configurations
5. **Customize**: Modify examples or add new configurations as needed

### utils.ts
Shared utility systems:
- `ErrorReportingSystem`: Advanced error logging and reporting
- `ProgressTracker`: Progress tracking for long-running operations
- `DriveAPIIntegration`: Google Drive API utilities
- `SheetsAPIIntegration`: Google Sheets API utilities

## Deployment to Google Apps Script

### Method 1: Manual Upload (Recommended)
1. Open [Google Apps Script](https://script.google.com)
2. Create a new project
3. Delete the default `Code.gs` file
4. For each `.ts` file in the script folder:
   - Click the "+" next to "Files"
   - Select "Script" 
   - Copy the file name (without extension)
   - Paste the entire file content
   - Save

### Method 2: Using clasp (Command Line)
If you have [clasp](https://developers.google.com/apps-script/guides/clasp) installed:

```bash
cd /Users/lap/pav/projects/training/ai/tools/timesheet
clasp create --type standalone --title "Timesheet Application"
clasp push
```

## Key Benefits of Modular Structure

1. **Better Organization**: Related functionality is grouped together
2. **Easier Maintenance**: Changes can be made to specific modules
3. **Improved Readability**: Smaller files are easier to understand
4. **Better Testing**: Individual modules can be tested separately
5. **Team Collaboration**: Multiple developers can work on different modules
6. **Reduced Complexity**: The original 4900+ line file is now split into manageable pieces

## Function Dependencies

The modules have the following dependencies:
- `main.ts` → depends on all other modules
- `timesheet-generator.ts` → depends on `constants.ts`
- `timesheet-aggregator.ts` → depends on `constants.ts`, `utils.ts`
- `report-exporter.ts` → depends on `constants.ts`, `timesheet-aggregator.ts`, `utils.ts`
- `utils.ts` → depends on `constants.ts`

## Original Functionality Preserved

All original functionality remains exactly the same:
- The same menu items appear in the UI
- All functions work identically
- All features and capabilities are preserved
- Configuration export system works as before
- Error handling and logging remain the same

## Development Guidelines

When working with the modular structure:

1. **Constants**: Add new constants to `constants.ts`
2. **UI Functions**: Add new UI functions to `main.ts`
3. **Data Processing**: Add aggregation logic to `timesheet-aggregator.ts`
4. **Report Features**: Add export features to `report-exporter.ts`
5. **Utilities**: Add shared utilities to `utils.ts`
6. **Cross-module Dependencies**: Keep dependencies clear and documented

## Migration Notes

The original `Code.gs` file has been backed up as `Code.gs.backup`. If you need to revert to the monolithic structure, simply:

```bash
cd /Users/lap/pav/projects/training/ai/tools/timesheet/script
mv Code.gs.backup Code.gs
```

However, the modular structure is recommended for long-term maintainability and development.
