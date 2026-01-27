# Configuration Export Manual Testing Checklist

**Version**: 1.0  
**Date**: October 24, 2025  
**Feature**: Configuration-Driven Report Export  

## Pre-Testing Setup

### Required Environment
- [ ] Google Apps Script project deployed
- [ ] Timesheet data available (from aggregateMonthlyTimesheets)
- [ ] Google Sheets with edit permissions
- [ ] Test configuration data prepared

### Test Data Preparation
- [ ] Create "Report Configs" sheet with proper headers
- [ ] Add sample configurations (see examples below)
- [ ] Ensure aggregated timesheet data exists
- [ ] Backup current spreadsheet (if needed)

## Configuration Sheet Setup Tests

### T1: Basic Sheet Creation
- [ ] **Step**: Right-click sheet tabs → Insert sheet → Name "Report Configs"
- [ ] **Expected**: New sheet created successfully
- [ ] **Verify**: Sheet appears in tab list with correct name

### T2: Header Row Setup
- [ ] **Step**: Add headers in row 1: A1="Report Name", B1="Description", C1="Columns", D1="Filters", E1="Sort By", F1="Sort Order", G1="Summary Type", H1="Enabled"
- [ ] **Expected**: All 8 headers properly set
- [ ] **Verify**: Headers match expected column order exactly

### T3: Sample Configuration Entry
- [ ] **Step**: Add test config in row 2:
  - A2: "Weekly Summary"
  - B2: "Basic weekly timesheet summary"
  - C2: "Member Name,Total Hours,Date"
  - D2: "" (empty)
  - E2: "Member Name"
  - F2: "ASC"
  - G2: "NONE"
  - H2: "TRUE"
- [ ] **Expected**: Row saved without errors
- [ ] **Verify**: All values display correctly

## Basic Export Functionality Tests

### T4: Menu Access
- [ ] **Step**: Look for "Export Configurable Report" in Custom Menu
- [ ] **Expected**: Menu item appears and is clickable
- [ ] **Verify**: No JavaScript errors in browser console

### T5: Configuration Reading - Success Case
- [ ] **Step**: Click "Export Configurable Report"
- [ ] **Expected**: Configuration selection dialog appears
- [ ] **Expected**: Shows "Weekly Summary" configuration
- [ ] **Verify**: Dialog displays configuration details correctly

### T6: Single Configuration Selection
- [ ] **Step**: Confirm selection of "Weekly Summary"
- [ ] **Expected**: Process continues to data aggregation
- [ ] **Expected**: Progress messages appear
- [ ] **Verify**: No error dialogs shown

### T7: Report Generation and Export
- [ ] **Step**: Allow export process to complete
- [ ] **Expected**: Success message with file details
- [ ] **Expected**: New Google Sheets file created
- [ ] **Verify**: Report contains expected data and formatting

## Error Handling Tests

### T8: Missing Configuration Sheet
- [ ] **Step**: Rename "Report Configs" sheet to "Test" and run export
- [ ] **Expected**: Clear error message about missing sheet
- [ ] **Expected**: Setup guidance provided
- [ ] **Verify**: No system crashes or unclear errors

### T9: Empty Configuration Sheet
- [ ] **Step**: Delete all data from "Report Configs" sheet and run export
- [ ] **Expected**: Error message about empty configuration
- [ ] **Expected**: Setup instructions provided
- [ ] **Verify**: Quick start example shown

### T10: Invalid Configuration Data
- [ ] **Step**: Set H2 to "INVALID" (instead of TRUE/FALSE) and run export
- [ ] **Expected**: Validation error with specific field mentioned
- [ ] **Expected**: User-friendly guidance on fix
- [ ] **Verify**: Row number and field name clearly identified

### T11: Duplicate Report Names
- [ ] **Step**: Add second row with same report name as first
- [ ] **Expected**: Error about duplicate names
- [ ] **Expected**: Specific row numbers mentioned
- [ ] **Verify**: User understands which rows conflict

## Advanced Configuration Tests

### T12: Multiple Configurations
- [ ] **Step**: Add 3 different valid configurations
- [ ] **Expected**: Selection dialog shows numbered list
- [ ] **Expected**: User can choose by entering number
- [ ] **Verify**: Correct configuration selected based on input

### T13: Filter Testing
- [ ] **Step**: Add config with filters: "active=true,hours>0"
- [ ] **Expected**: Only matching records in final report
- [ ] **Expected**: Filter information shown in metadata
- [ ] **Verify**: Filter logic applied correctly

### T14: Column Selection
- [ ] **Step**: Create config with only "Member Name,Total Hours"
- [ ] **Expected**: Report contains only specified columns
- [ ] **Expected**: Column order matches configuration
- [ ] **Verify**: No extra columns included

### T15: Sorting Configuration
- [ ] **Step**: Set Sort By="Total Hours", Sort Order="DESC"
- [ ] **Expected**: Report sorted by hours descending
- [ ] **Expected**: Sort information in metadata
- [ ] **Verify**: Data actually sorted correctly

### T16: Summary Types
- [ ] **Step**: Test each summary type (MEMBER_TOTALS, DAILY_TOTALS, PROJECT_TOTALS)
- [ ] **Expected**: Data aggregated appropriately for each type
- [ ] **Expected**: Different record counts for each summary
- [ ] **Verify**: Aggregation logic works correctly

## Performance and Large Dataset Tests

### T17: Large Dataset Handling
- [ ] **Step**: Test with 1000+ timesheet records (if available)
- [ ] **Expected**: Progress tracking messages appear
- [ ] **Expected**: Process completes within reasonable time (<5 minutes)
- [ ] **Verify**: Memory usage stays reasonable

### T18: Batch Processing Verification
- [ ] **Step**: Check Google Apps Script logs during large dataset processing
- [ ] **Expected**: Batch processing messages in logs
- [ ] **Expected**: No memory or timeout errors
- [ ] **Verify**: Performance metrics in metadata

## Export Format and Formatting Tests

### T19: New File Export
- [ ] **Step**: Verify new file creation behavior
- [ ] **Expected**: File created in same folder as source spreadsheet
- [ ] **Expected**: Unique filename with timestamp
- [ ] **Verify**: File permissions allow access

### T20: Report Formatting
- [ ] **Step**: Open generated report file
- [ ] **Expected**: Metadata section at top with report details
- [ ] **Expected**: Formatted headers with colors
- [ ] **Expected**: Frozen rows for easy scrolling
- [ ] **Verify**: Professional appearance suitable for sharing

### T21: Metadata Completeness
- [ ] **Step**: Check metadata section in exported report
- [ ] **Expected**: Report name, description, record counts
- [ ] **Expected**: Applied filters, sort order, generation timestamp
- [ ] **Expected**: Processing information for large datasets
- [ ] **Verify**: All metadata accurately reflects configuration

## Edge Cases and Boundary Tests

### T22: Empty Data Results
- [ ] **Step**: Create config with filters that match no records
- [ ] **Expected**: Empty report with appropriate message
- [ ] **Expected**: Metadata indicates 0 records
- [ ] **Verify**: No crashes or unclear states

### T23: Special Characters in Configuration
- [ ] **Step**: Test report name with special characters: "Test & Report (2025)"
- [ ] **Expected**: Configuration saves and processes correctly
- [ ] **Expected**: Filename sanitized appropriately
- [ ] **Verify**: No encoding or display issues

### T24: Very Long Configuration Values
- [ ] **Step**: Test with 200-character description
- [ ] **Expected**: Validation accepts (within limit)
- [ ] **Expected**: Full description preserved in output
- [ ] **Verify**: No truncation or display issues

### T25: Invalid Column Names
- [ ] **Step**: Add "InvalidColumn" to columns list
- [ ] **Expected**: Clear validation error about invalid column
- [ ] **Expected**: List of valid columns provided
- [ ] **Verify**: User knows how to fix the issue

## Integration Tests

### T26: Existing Data Integration
- [ ] **Step**: Run export with real aggregated timesheet data
- [ ] **Expected**: Data formatting preserved correctly
- [ ] **Expected**: All timesheet fields accessible
- [ ] **Verify**: Output matches source data structure

### T27: Menu Integration
- [ ] **Step**: Test menu after closing and reopening spreadsheet
- [ ] **Expected**: Menu items still available
- [ ] **Expected**: Function calls work correctly
- [ ] **Verify**: No Google Apps Script authorization issues

### T28: Permission Testing
- [ ] **Step**: Test with different user permission levels (if applicable)
- [ ] **Expected**: Appropriate behavior for each permission level
- [ ] **Expected**: Clear error messages for insufficient permissions
- [ ] **Verify**: No security or access violations

## User Experience Tests

### T29: Error Message Quality
- [ ] **Step**: Review all error messages encountered during testing
- [ ] **Expected**: Messages are clear and actionable
- [ ] **Expected**: Technical jargon avoided
- [ ] **Verify**: Average user can understand and act on errors

### T30: Process Flow Smoothness
- [ ] **Step**: Complete entire export process without consulting documentation
- [ ] **Expected**: Process feels intuitive and guided
- [ ] **Expected**: Each step clearly leads to the next
- [ ] **Verify**: No confusion about what to do next

## Post-Testing Verification

### Cleanup
- [ ] Remove test configurations
- [ ] Delete test export files (if desired)
- [ ] Restore original configuration data (if needed)

### Documentation
- [ ] Record any issues found during testing
- [ ] Note performance observations
- [ ] Document any user experience improvements needed

## Test Results Summary

**Date Tested**: ___________  
**Tester**: ___________  
**Total Tests**: 30  
**Passed**: _____ / 30  
**Failed**: _____ / 30  
**Critical Issues**: ___________  
**Minor Issues**: ___________  

### Critical Issues Found
_List any blocking issues that prevent normal operation_

### Minor Issues Found  
_List any cosmetic or minor functionality issues_

### Overall Assessment
_Summarize readiness for production use_

---

## Example Test Configurations

### Configuration 1: Basic Report
```
Report Name: Weekly Team Summary
Description: Basic summary of team member hours
Columns: Member Name,Total Hours,Date
Filters: (empty)
Sort By: Member Name
Sort Order: ASC
Summary Type: NONE
Enabled: TRUE
```

### Configuration 2: Filtered Report
```
Report Name: Active Members Only
Description: Show only active team members with hours
Columns: Member Name,Total Hours,Status
Filters: active=true,hours>0
Sort By: Total Hours
Sort Order: DESC
Summary Type: MEMBER_TOTALS
Enabled: TRUE
```

### Configuration 3: Project Summary
```
Report Name: Project Hours Summary
Description: Total hours by project
Columns: Project Name,Total Hours,Member Count
Filters: (empty)
Sort By: Total Hours
Sort Order: DESC
Summary Type: PROJECT_TOTALS
Enabled: TRUE
```
