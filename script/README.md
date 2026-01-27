# Timesheet Application - Enhanced Configuration System

The timesheet application features a powerful enhanced configuration system with expression-based transformations and multi-output structure support. This document explains the enhanced features and how to use them.

## Enhanced Features Overview

### 🚀 New in Enhanced Configuration System v1.0
- **Expression-Based Column Definitions**: Use JavaScript-like expressions for dynamic columns
- **Multi-Output Structure Support**: Generate single sheets, multi-sheets, or multi-file reports
- **Built-in Transformation Functions**: 8 powerful functions for time, date, and text processing
- **Advanced Security Validation**: Safe expression execution with comprehensive error handling
- **Backward Compatibility**: All existing configurations continue to work seamlessly

## File Structure

```
script/
├── constants.js               # Enhanced with expression functions and output structure config
├── main.js                    # Enhanced UI with advanced configuration dialogs
├── timesheet-generator.js     # Generate Timesheet Files functionality
├── timesheet-aggregator.js    # Aggregate Monthly Timesheets functionality
├── report-exporter.js         # Enhanced with expression engine and multi-output support
├── utils.js                   # Shared utility classes and systems
├── README.md                  # This documentation file (Enhanced System Guide)
├── DEPLOYMENT.md              # Deployment checklist and guide
└── REPORT_CONFIGS_EXAMPLES.md # Enhanced expression-based configuration examples
```

## Module Descriptions

### constants.js (Enhanced)
Contains all configuration objects and constants, now enhanced with:
- `EXPRESSION_FUNCTIONS`: Registry of 8 built-in transformation functions
- `OUTPUT_STRUCTURE_CONFIG`: Multi-output structure configuration
- `AGGREGATION_CONFIG`: Timesheet aggregation settings
- `REPORT_CONFIG`: Enhanced configuration export settings  
- `ERROR_TYPES`: Error type definitions
- `SEVERITY_LEVELS`: Logging severity levels
- `TEMPLATE_FILE_ID`: Timesheet template file ID
- `MEMBER_COLUMNS`: Member sheet column mappings

### main.js (Enhanced)
Enhanced UI functions with advanced configuration capabilities:
- `onOpen()`: Initialize application menu
- `generateTimesheetFiles()`: Generate timesheet files for all members
- `aggregateMonthlyTimesheetsUI()`: Aggregate monthly timesheets with progress feedback
- `exportConfigurableReportUI()`: **Enhanced** with advanced configuration dialog
- `showAdvancedConfigurationDialog()`: **New** - Advanced output structure options
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

### report-exporter.js (Enhanced)
Enhanced configuration-driven report export system with expression engine:
- `parseColumnDefinitions()`: **Enhanced** - Parse expression-based column definitions
- `evaluateExpression()`: **New** - Safe expression evaluation with caching
- `validateTransformationExpression()`: **New** - Security validation for expressions
- `determineOutputStructure()`: **New** - Multi-output structure analysis
- `createOutputFiles()`: **New** - Multi-file report generation
- `generateFileName()`: **New** - Smart file naming for multi-output
- `readReportConfigurations()`: Enhanced with backward compatibility
- `generateConfigurableReport()`: Enhanced with expression support
- `exportReportToGoogleSheets()`: Enhanced with multi-output capabilities
- Comprehensive error handling and user-friendly messages

## Enhanced Report Configs Sheet Setup

The enhanced configuration system supports powerful expression-based transformations and multiple output structures. Create a "Report Configs" sheet with the following structure:

### Column Headers (Row 1) - Enhanced Structure
| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| Report Name | Description | Columns | Filters | Sort By | Sort Order | Summary Type | Enabled | Output Structure | Grouping Field |

### New Enhanced Features

#### Expression-Based Columns
Use JavaScript-like expressions for dynamic column transformations:
```
Member Name,Calculated Hours:calculateHours(Time In,Time Out),Day:getDayOfWeek(Date)
```

#### Output Structure Options
Set the "Output Structure" field to:
- **SINGLE_SHEET** (default): Traditional single sheet output
- **SHEET_PER_PROJECT**: Separate sheet for each project
- **SHEET_PER_EMPLOYEE**: Separate sheet for each team member
- **FILE_PER_PROJECT**: Separate file for each project
- **FILE_PER_EMPLOYEE**: Separate file for each team member

#### Grouping Field
When using multi-sheet/multi-file outputs, specify the grouping field:
- For `SHEET_PER_PROJECT` or `FILE_PER_PROJECT`: Use "Project Name"
- For `SHEET_PER_EMPLOYEE` or `FILE_PER_EMPLOYEE`: Use "Member Name"

### Available Columns & Expression System

#### Standard Column Names
You can use these column names in the "Columns" field (comma-separated):
- `Member Name` - Team member name
- `PAV ID` - Member ID
- `Date` - Entry date
- `Start Time` / `Time In` - Work start time
- `End Time` / `Time Out` - Work end time
- `Hours` - Calculated hours
- `Total Hours` - Total hours (used in summaries)
- `Project Name` - Project name
- `Task Description` - Task details
- `Status` - Entry status
- `Department` - Member department
- `Role` - Member role

#### Expression-Based Columns
Create dynamic columns using expressions:
```
DisplayName:expression
```

#### Built-in Functions
Use these powerful transformation functions:
- `calculateHours(timeIn, timeOut)` - Calculate duration between times
- `formatTime(minutes)` - Format minutes as HH:MM
- `formatDate(date, format)` - Format dates with custom patterns
- `getDayOfWeek(date)` - Get day name (Monday, Tuesday, etc.)
- `getMonthName(date)` - Get month name (January, February, etc.)
- `addDays(date, days)` - Add/subtract days from a date
- `stringContains(text, substring)` - Check if text contains substring
- `defaultValue(value, fallback)` - Provide fallback for empty values

#### Expression Examples
```
Calculated Hours:calculateHours(Time In,Time Out)
Work Day:getDayOfWeek(Date)
Hours Display:defaultValue(calculateHours(Time In,Time Out),0)
Project Type:stringContains(Project Name,'Development') ? 'Dev' : 'Other'
```

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

### Enhanced Configuration Examples

#### Example 1: Expression-Based Time Calculations
| Report Name | Description | Columns | Filters | Sort By | Sort Order | Summary Type | Enabled | Output Structure | Grouping Field |
|-------------|-------------|---------|---------|---------|------------|--------------|---------|------------------|----------------|
| Enhanced Hours | Expression-based hours | Member Name,Calculated Hours:calculateHours(Time In,Time Out),Day:getDayOfWeek(Date) | | Member Name | ASC | NONE | TRUE | SINGLE_SHEET | |

#### Example 2: Multi-Sheet Project Reports
| Report Name | Description | Columns | Filters | Sort By | Sort Order | Summary Type | Enabled | Output Structure | Grouping Field |
|-------------|-------------|---------|---------|---------|------------|--------------|---------|------------------|----------------|
| Project Sheets | Separate sheet per project | Member Name,Date,Hours:calculateHours(Time In,Time Out),Task Description | | Date | DESC | NONE | TRUE | SHEET_PER_PROJECT | Project Name |

#### Example 3: Multi-File Employee Reports
| Report Name | Description | Columns | Filters | Sort By | Sort Order | Summary Type | Enabled | Output Structure | Grouping Field |
|-------------|-------------|---------|---------|---------|------------|--------------|---------|------------------|----------------|
| Employee Files | Individual employee files | Date,Project Name,Hours:defaultValue(calculateHours(Time In,Time Out),0),Status | | Date | DESC | NONE | TRUE | FILE_PER_EMPLOYEE | Member Name |

#### Example 4: Advanced Date Formatting
| Report Name | Description | Columns | Filters | Sort By | Sort Order | Summary Type | Enabled | Output Structure | Grouping Field |
|-------------|-------------|---------|---------|---------|------------|--------------|---------|------------------|----------------|
| Formatted Dates | Custom date display | Member Name,Work Date:formatDate(Date),Month:getMonthName(Date),Hours:calculateHours(Time In,Time Out) | | Date | DESC | NONE | TRUE | SINGLE_SHEET | |

#### Example 5: Conditional Logic Report
| Report Name | Description | Columns | Filters | Sort By | Sort Order | Summary Type | Enabled | Output Structure | Grouping Field |
|-------------|-------------|---------|---------|---------|------------|--------------|---------|------------------|----------------|
| Smart Categories | Conditional categorization | Member Name,Project Name,Hours:calculateHours(Time In,Time Out),Type:stringContains(Project Name,'Dev') ? 'Development' : 'Other' | | Hours | DESC | NONE | TRUE | SINGLE_SHEET | |

#### Example 6: Robust Error Handling
| Report Name | Description | Columns | Filters | Sort By | Sort Order | Summary Type | Enabled | Output Structure | Grouping Field |
|-------------|-------------|---------|---------|---------|------------|--------------|---------|------------------|----------------|
| Safe Hours | Error-safe calculations | Member Name,Date,Safe Hours:defaultValue(calculateHours(Time In,Time Out),0),Status:defaultValue(Status,'Unknown') | | Date | DESC | NONE | TRUE | SINGLE_SHEET | |

#### Example 7: Legacy Compatibility
| Report Name | Description | Columns | Filters | Sort By | Sort Order | Summary Type | Enabled | Output Structure | Grouping Field |
|-------------|-------------|---------|---------|---------|------------|--------------|---------|------------------|----------------|
| Legacy Format | Backward compatible | Member Name,Date,Hours,Project Name | Hours>8 | Hours | DESC | NONE | TRUE | SINGLE_SHEET | |

### Enhanced Quick Setup Guide
1. **Create the Sheet**: Right-click sheet tabs → Insert sheet → Name it "Report Configs"
2. **Add Enhanced Headers**: Copy the 10-column headers above to row 1 (includes Output Structure and Grouping Field)
3. **Start Simple**: Begin with legacy-style configurations, then add expressions
4. **Add Examples**: Copy enhanced examples above to start with expression-based features
5. **Test Expressions**: Use the advanced configuration dialog to validate expressions
6. **Try Multi-Output**: Experiment with SHEET_PER_PROJECT and FILE_PER_EMPLOYEE options
7. **Customize**: Build complex expressions using built-in functions
8. **Documentation**: See `docs/expression-functions.md` for detailed function reference

### Migration from Legacy Configurations
- **Automatic Migration**: Existing configurations work without changes
- **Enhanced Features**: Add "Output Structure" and "Grouping Field" columns for new features
- **Expression Upgrade**: Replace simple column names with expression-based definitions
- **No Data Loss**: All existing reports continue to function normally

### utils.js
Shared utility systems:
- `ErrorReportingSystem`: Advanced error logging and reporting
- `ProgressTracker`: Progress tracking for long-running operations
- `DriveAPIIntegration`: Google Drive API utilities
- `SheetsAPIIntegration`: Google Sheets API utilities

## Enhanced Configuration System Benefits

### 🎯 Expression System Advantages
- **Dynamic Calculations**: Real-time hour calculations, date formatting, text processing
- **Conditional Logic**: Smart categorization and status determination
- **Error Prevention**: Built-in fallback values and validation
- **Performance**: Expression caching for fast execution
- **Security**: Safe sandbox execution prevents malicious code

### 📊 Multi-Output Structure Benefits
- **Project-Focused Reports**: Separate sheets/files per project for stakeholder distribution
- **Employee-Focused Reports**: Individual timesheets for payroll and performance review
- **Scalable Organization**: Handle large datasets with logical grouping
- **Automated Distribution**: Generate targeted reports for different audiences
- **Flexible Workflows**: Support various organizational reporting needs

### 🔄 Backward Compatibility
- **Zero Migration Effort**: Existing configurations work immediately
- **Gradual Enhancement**: Add new features at your own pace
- **Risk-Free Adoption**: No disruption to current workflows
- **Mixed Usage**: Use both legacy and enhanced features simultaneously

## Deployment to Google Apps Script

### Method 1: Manual Upload (Recommended)
1. Open [Google Apps Script](https://script.google.com)
2. Create a new project
3. Delete the default `Code.gs` file
4. For each `.js` file in the script folder:
   - Click the "+" next to "Files"
   - Select "Script" 
   - Copy the file name (without extension)
   - Paste the entire file content
   - Save
5. **Important**: Ensure all files are uploaded for enhanced configuration system to work

### Method 2: Using clasp (Command Line)
If you have [clasp](https://developers.google.com/apps-script/guides/clasp) installed:

```bash
cd /Users/lap/pav/projects/training/ai/tools/timesheet
clasp create --type standalone --title "Enhanced Timesheet Application"
clasp push
```

### Enhanced System Deployment Notes
- **Complete Upload Required**: All enhanced files must be deployed together
- **Function Dependencies**: Enhanced system requires all modules for full functionality
- **Testing**: Test basic functionality before enabling advanced features
- **Documentation**: Share `docs/expression-functions.md` with users for reference

## Key Benefits of Enhanced Configuration System

1. **Powerful Expressions**: Dynamic calculations and transformations without code changes
2. **Multi-Output Flexibility**: Generate targeted reports for different stakeholders
3. **Enhanced User Experience**: Advanced configuration dialogs with real-time validation
4. **Backward Compatibility**: Seamless migration from legacy configurations
5. **Security & Safety**: Safe expression execution with comprehensive validation
6. **Performance Optimization**: Expression caching and efficient processing
7. **Better Organization**: Modular structure with clear separation of concerns
8. **Easier Maintenance**: Changes can be made to specific modules
9. **Improved Testing**: Individual modules tested with comprehensive test suite
10. **Team Collaboration**: Multiple developers can work on different modules

## Enhanced Function Dependencies

The enhanced modules have the following dependencies:
- `main.js` → depends on all other modules (enhanced with advanced UI)
- `timesheet-generator.js` → depends on `constants.js`
- `timesheet-aggregator.js` → depends on `constants.js`, `utils.js`
- `report-exporter.js` → depends on `constants.js`, `timesheet-aggregator.js`, `utils.js` (enhanced with expression engine)
- `utils.js` → depends on `constants.js`
- `constants.js` → enhanced with `EXPRESSION_FUNCTIONS` and `OUTPUT_STRUCTURE_CONFIG`

## Original Functionality Preserved

All original functionality remains exactly the same:
- The same menu items appear in the UI
- All functions work identically
- All features and capabilities are preserved
- Configuration export system works as before
- Error handling and logging remain the same

## Enhanced Development Guidelines

When working with the enhanced configuration system:

1. **Expression Functions**: Add new transformation functions to `constants.js` EXPRESSION_FUNCTIONS registry
2. **Output Structures**: Add new output patterns to `OUTPUT_STRUCTURE_CONFIG` in `constants.js`
3. **UI Enhancements**: Add advanced configuration features to `main.js`
4. **Expression Engine**: Enhance expression evaluation logic in `report-exporter.js`
5. **Security Validation**: Update expression validation patterns in `report-exporter.js`
6. **Multi-Output Logic**: Enhance output structure handling in `report-exporter.js`
7. **Utilities**: Add shared utilities to `utils.js`
8. **Documentation**: Update expression documentation in `docs/expression-functions.md`
9. **Testing**: Add comprehensive tests for new expression functions
10. **Cross-module Dependencies**: Keep dependencies clear and documented

### Expression Function Development
When adding new built-in functions:
1. Add function to `EXPRESSION_FUNCTIONS` registry in `constants.js`
2. Include comprehensive parameter validation
3. Provide fallback values for error cases
4. Add usage examples to documentation
5. Test with various data types and edge cases

## Migration Notes

The original `Code.gs` file has been backed up as `Code.gs.backup`. If you need to revert to the monolithic structure, simply:

```bash
cd /Users/lap/pav/projects/training/ai/tools/timesheet/script
mv Code.gs.backup Code.gs
```

However, the modular structure is recommended for long-term maintainability and development.
