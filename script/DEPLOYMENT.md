# Timesheet Application - Deployment Checklist

## Pre-Deployment Checklist

- [ ] All module files are present in `/script/` folder:
  - [ ] `constants.gs`
  - [ ] `main.gs` 
  - [ ] `timesheet-generator.gs`
  - [ ] `timesheet-aggregator.gs`
  - [ ] `report-exporter.gs`
  - [ ] `utils.gs`

- [ ] Google Apps Script project is created
- [ ] Default `Code.gs` file is removed from Google Apps Script

## Deployment Steps

### Step 1: Upload Constants
- [ ] Create new script file: `constants`
- [ ] Copy content from `constants.gs`
- [ ] Save and verify no syntax errors

### Step 2: Upload Utilities
- [ ] Create new script file: `utils`
- [ ] Copy content from `utils.gs`  
- [ ] Save and verify no syntax errors

### Step 3: Upload Core Modules
- [ ] Create new script file: `timesheet-generator`
- [ ] Copy content from `timesheet-generator.gs`
- [ ] Save and verify no syntax errors

- [ ] Create new script file: `timesheet-aggregator`
- [ ] Copy content from `timesheet-aggregator.gs`
- [ ] Save and verify no syntax errors

- [ ] Create new script file: `report-exporter`
- [ ] Copy content from `report-exporter.gs`
- [ ] Save and verify no syntax errors

### Step 4: Upload Main Interface
- [ ] Create new script file: `main`
- [ ] Copy content from `main.gs`
- [ ] Save and verify no syntax errors

## Post-Deployment Verification

### Basic Functionality Tests
- [ ] Open a Google Spreadsheet
- [ ] Verify "Custom Menu" appears with all items:
  - [ ] "Generate Timesheet Files"
  - [ ] "Aggregate Monthly Timesheets"  
  - [ ] "Export Configurable Report"

### Test Core Functions
- [ ] Test "Generate Timesheet Files":
  - [ ] Menu item executes without errors
  - [ ] Files are created in expected folder structure
  
- [ ] Test "Aggregate Monthly Timesheets":
  - [ ] Menu item executes without errors
  - [ ] Shows progress dialog
  - [ ] Displays completion summary
  
- [ ] Test "Export Configurable Report":
  - [ ] Menu item executes without errors
  - [ ] Configuration loading works (or shows helpful setup message)
  - [ ] Report generation and export completes

### Error Handling Tests
- [ ] Test with missing folders (should show helpful error messages)
- [ ] Test with invalid timesheet files (should log warnings, continue processing)
- [ ] Test with missing "Report Configs" sheet (should show setup guidance)

## Configuration Setup (if needed)

### For Report Export Feature
If using the configurable report export feature:

- [ ] Create "Report Configs" sheet with headers:
  - [ ] A1: "Report Name"
  - [ ] B1: "Description"  
  - [ ] C1: "Columns"
  - [ ] D1: "Filters"
  - [ ] E1: "Sort By"
  - [ ] F1: "Sort Order"
  - [ ] G1: "Summary Type"
  - [ ] H1: "Enabled"

- [ ] Add sample configuration row:
  - [ ] A2: "Weekly Summary"
  - [ ] B2: "Team member hours summary"
  - [ ] C2: "Member Name,Total Hours,Date"
  - [ ] D2: (leave empty)
  - [ ] E2: "Member Name"
  - [ ] F2: "ASC"
  - [ ] G2: "NONE"
  - [ ] H2: "TRUE"

## Troubleshooting

### Common Issues and Solutions

**Issue**: "Function not found" errors
- **Solution**: Ensure all module files are uploaded and saved without syntax errors

**Issue**: Menu doesn't appear
- **Solution**: Check that `main.gs` is uploaded and `onOpen()` function is present

**Issue**: Configuration errors in report export
- **Solution**: Verify "Report Configs" sheet exists with correct headers

**Issue**: File access errors
- **Solution**: Ensure the script has necessary permissions to access Google Drive and Sheets

### Performance Considerations

- [ ] For large datasets (>100 timesheet files):
  - [ ] Consider reducing `BATCH_SIZE` in constants if memory errors occur
  - [ ] Monitor execution time and implement checkpoints if needed

- [ ] For report export with many configurations:
  - [ ] Test with small datasets first
  - [ ] Verify memory usage stays within Google Apps Script limits

## Rollback Plan

If issues occur after deployment:

1. **Quick Rollback**:
   - [ ] Delete all modular script files from Google Apps Script
   - [ ] Upload `Code.gs.backup` as `Code.gs`
   - [ ] Test basic functionality

2. **Partial Rollback**:
   - [ ] Keep working modules
   - [ ] Replace problematic modules with backup versions
   - [ ] Isolate and fix issues

## Success Criteria

Deployment is successful when:
- [ ] All menu items work without errors
- [ ] Core functionality (generate, aggregate, export) works as expected
- [ ] Error messages are helpful and user-friendly
- [ ] Performance is acceptable for typical usage patterns
- [ ] No critical functionality is broken compared to original version

## Documentation Updates

After successful deployment:
- [ ] Update main project README with new structure information
- [ ] Update API documentation if any function signatures changed
- [ ] Update user guides with any new features or changes
- [ ] Share deployment guide with team members
