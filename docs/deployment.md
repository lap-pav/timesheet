# Google Apps Script Deployment Guide

**Version**: 1.0.0  
**Last Updated**: October 6, 2025  
**Platform**: Google Apps Script  

## Overview

This guide provides step-by-step instructions for deploying the Timesheet Aggregation System to Google Apps Script. The system aggregates individual timesheet files from Google Drive into normalized JSON datasets with comprehensive error handling and performance optimization.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start Deployment](#quick-start-deployment)
3. [Detailed Setup Instructions](#detailed-setup-instructions)
4. [Configuration](#configuration)
5. [Testing & Validation](#testing--validation)
6. [Production Deployment](#production-deployment)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Security Considerations](#security-considerations)

---

## Prerequisites

### System Requirements
- **Google Account**: Active Google account with Google Drive access
- **Permissions**: Admin or editor permissions for target Google Drive folders
- **Google Apps Script Access**: Ability to create and run Google Apps Script projects
- **Browser**: Modern web browser (Chrome, Firefox, Safari, Edge)

### Data Requirements
- **Folder Structure**: Monthly folders in Google Drive with YYYY-MM naming (e.g., "2025-09")
- **File Format**: Google Sheets timesheet files with naming pattern `Timesheet_YYYY-MM_MemberName`
- **Data Structure**: Standardized timesheet columns (see [Configuration](#configuration))

### Access Requirements
- **Google Drive API**: Enabled for the Google Apps Script project
- **Google Sheets API**: Enabled for the Google Apps Script project
- **Execution Permissions**: Ability to run scripts that access Google Drive and Sheets

---

## Quick Start Deployment

### 5-Minute Setup

1. **Create Project**: Go to [script.google.com](https://script.google.com) → "New Project"
2. **Copy Code**: Copy entire contents of `/script/Code.gs` → Paste in editor
3. **Enable APIs**: Services → Add "Google Drive API" and "Google Sheets API"
4. **Authorize**: Run any function → Grant permissions
5. **Test**: Execute `aggregateMonthlyTimesheets('2025-09')` with your month

### Verification
```javascript
// Quick test in the Apps Script editor
const result = aggregateMonthlyTimesheets('2025-09');
console.log(`Processed ${result.entries.length} entries from ${result.metadata.successfulFiles} files`);
```

---

## Detailed Setup Instructions

### Step 1: Create Google Apps Script Project

1. **Access Google Apps Script**
   - Navigate to [script.google.com](https://script.google.com)
   - Sign in with your Google account
   - Click **"New Project"**

2. **Project Setup**
   - Rename project to **"Timesheet Aggregator"** (or your preferred name)
   - Delete the default `myFunction()` placeholder code
   - Note your project ID (visible in URL after creation)

### Step 2: Deploy Implementation Code

1. **Copy Source Code**
   - Open `/script/Code.gs` from this repository
   - Select all content (Ctrl+A/Cmd+A)
   - Copy to clipboard (Ctrl+C/Cmd+C)

2. **Paste in Editor**
   - Return to Google Apps Script editor
   - Paste code in the main editor window
   - Verify all code was copied (should be ~1500+ lines)
   - Save project (Ctrl+S/Cmd+S)

### Step 3: Enable Required APIs

1. **Access Services Panel**
   - In left sidebar, click **"Services"** (+ icon)
   - If not visible, click **"Libraries & Services"**

2. **Add Google Drive API**
   - Click **"Add a service"**
   - Select **"Google Drive API"**
   - Click **"Add"**
   - Verify it appears in Services list

3. **Add Google Sheets API**
   - Click **"Add a service"**
   - Select **"Google Sheets API"**
   - Click **"Add"**
   - Verify it appears in Services list

### Step 4: Configure Permissions

1. **Initial Authorization**
   - Select any function from dropdown (e.g., `aggregateMonthlyTimesheets`)
   - Click **"Run"** button
   - Click **"Review permissions"** when prompted

2. **Grant Permissions**
   - Choose your Google account
   - Click **"Advanced"** if shown security warning
   - Click **"Go to Timesheet Aggregator (unsafe)"**
   - Review permissions:
     - ✓ See, edit, create, and delete your Google Drive files
     - ✓ See, edit, create, and delete your Google Sheets spreadsheets
     - ✓ Display and run third-party web content
   - Click **"Allow"**

3. **Verify Authorization**
   - Check execution log for successful completion
   - No permission errors should appear

### Step 5: Initial Configuration

1. **Review Configuration Constants**
   ```javascript
   // Verify these constants match your setup
   const AGGREGATION_CONFIG = {
     TIMESHEET_FILE_PATTERN: /^Timesheet_(\d{4}-\d{2})_(.+)$/i,
     MONTH_FOLDER_PATTERN: /^(\d{4}-\d{2})$/,
     BATCH_SIZE: 20,
     MAX_EXECUTION_TIME_MS: 300000  // 5 minutes
   };
   ```

2. **Customize for Your Environment**
   - Modify file patterns if your naming differs
   - Adjust batch size for performance
   - Update column headers if needed

---

## Configuration

### File Naming Patterns

The system expects specific naming conventions:

#### Monthly Folders
- **Pattern**: `YYYY-MM` (e.g., "2025-09", "2025-10")
- **Location**: Root level of Google Drive or within a parent folder
- **Multiple Matches**: System handles multiple folders with same pattern

#### Timesheet Files
- **Pattern**: `Timesheet_YYYY-MM_MemberName` (case-insensitive)
- **Examples**: 
  - `Timesheet_2025-09_JohnDoe`
  - `Timesheet_2025-09_Jane Smith`
  - `timesheet_2025-09_user123`
- **Format**: Google Sheets files only

### Column Headers

Configure expected column headers in `AGGREGATION_CONFIG.EXPECTED_HEADERS`:

```javascript
EXPECTED_HEADERS: {
  DATE: ['date', 'day'],                           // Required
  FROM_TIME: ['from time', 'start time', 'from'], // Required
  TO_TIME: ['to time', 'end time', 'to'],         // Required
  PROJECT: ['project', 'project name'],           // Required
  TASK_TYPE: ['task type', 'task', 'activity'],   // Required
  DESCRIPTION: ['description', 'desc', 'details'], // Optional
  TC_FROM_TIME: ['tc from time', 'timecard from'], // Optional
  TC_TO_TIME: ['tc to time', 'timecard to']        // Optional
}
```

### Performance Tuning

Adjust these settings based on your data volume:

```javascript
const AGGREGATION_CONFIG = {
  BATCH_SIZE: 20,                    // Files processed per batch
  MAX_EXECUTION_TIME_MS: 300000,     // 5-minute safety limit
  MAX_MEMORY_MB: 100,                // Memory usage limit
  CHECKPOINT_INTERVAL: 10            // Progress logging frequency
};
```

#### Batch Size Guidelines
- **Small files (<100 rows)**: Batch size 50-100
- **Medium files (100-500 rows)**: Batch size 20-30
- **Large files (500+ rows)**: Batch size 10-15
- **Mixed sizes**: Start with 20, adjust based on execution time

---

## Testing & Validation

### Unit Testing

Run individual functions to verify functionality:

```javascript
// Test folder discovery
const folderResult = getMonthlyFolder('2025-09');
console.log('Folder found:', folderResult.folder ? 'Yes' : 'No');

// Test file enumeration
if (folderResult.folder) {
  const filesResult = getTimesheetFiles(folderResult.folder);
  console.log('Files found:', filesResult.files.length);
}
```

### Integration Testing

Test the complete workflow:

```javascript
// Full aggregation test
console.log('Starting aggregation test...');
const startTime = new Date();

const result = aggregateMonthlyTimesheets('2025-09');

const endTime = new Date();
const duration = endTime - startTime;

console.log('Test Results:');
console.log('- Duration:', duration + 'ms');
console.log('- Files processed:', result.metadata.totalFiles);
console.log('- Entries created:', result.entries.length);
console.log('- Errors:', result.errors.length);
console.log('- System healthy:', result.metadata.systemHealthy);
```

### Error Testing

Test error handling with invalid data:

```javascript
// Test with non-existent month
const errorTest = aggregateMonthlyTimesheets('2999-99');
console.log('Error handling test:', errorTest.errors.length > 0 ? 'PASS' : 'FAIL');

// Generate error report
ErrorReportingSystem.initialize();
const report = ErrorReportingSystem.generateReport();
console.log('Error reporting system:', report.sessionId ? 'PASS' : 'FAIL');
```

### Performance Testing

Validate performance with realistic data:

```javascript
// Performance benchmark
MemoryManager.initialize();
const perfStart = MemoryManager.checkMemoryUsage('performance-test-start');

const result = aggregateMonthlyTimesheets('2025-09');

const perfEnd = MemoryManager.checkMemoryUsage('performance-test-end');
const memoryReport = MemoryManager.generateMemoryReport();

console.log('Performance Results:');
console.log('- Processing time:', result.metadata.processingTimeMs + 'ms');
console.log('- Memory used:', memoryReport.peak.usageMB + 'MB');
console.log('- Entries per second:', (result.entries.length / (result.metadata.processingTimeMs / 1000)).toFixed(2));
```

---

## Production Deployment

### Pre-Production Checklist

- [ ] All tests pass without errors
- [ ] Configuration reviewed and customized
- [ ] API services enabled and authorized
- [ ] Test data processed successfully
- [ ] Error handling validated
- [ ] Performance benchmarked
- [ ] Security permissions reviewed

### Deployment Strategies

#### Option 1: Manual Execution
- Best for: One-time aggregations, testing, small teams
- Process: Run functions manually in Apps Script editor
- Monitoring: Check execution logs manually

#### Option 2: Scheduled Execution
```javascript
// Create scheduled trigger
function setupMonthlyTrigger() {
  ScriptApp.newTrigger('runMonthlyAggregation')
    .timeBased()
    .everyDays(30)  // Run monthly
    .atHour(2)      // 2 AM
    .create();
}

function runMonthlyAggregation() {
  const currentMonth = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM');
  const result = aggregateMonthlyTimesheets(currentMonth);
  
  // Send results email or save to Drive
  if (!result.metadata.systemHealthy) {
    MailApp.sendEmail({
      to: 'admin@company.com',
      subject: 'Timesheet Aggregation Alert',
      body: 'Aggregation completed with errors. Check logs.'
    });
  }
}
```

#### Option 3: Web App Interface
```javascript
function doGet(e) {
  const month = e.parameter.month || Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM');
  const result = aggregateMonthlyTimesheets(month);
  
  return ContentService
    .createTextOutput(JSON.stringify(result, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### Environment Variables

Store sensitive configuration in Apps Script properties:

```javascript
// Set up properties (run once)
function setupProperties() {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperties({
    'ADMIN_EMAIL': 'admin@company.com',
    'ERROR_NOTIFICATION_THRESHOLD': '10',
    'DEFAULT_MONTH_FOLDER': 'root'  // or specific folder ID
  });
}

// Use in code
function getAdminEmail() {
  return PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
}
```

---

## Monitoring & Maintenance

### Execution Monitoring

#### Cloud Logging
```javascript
// Enhanced logging for production
function logAggregationResult(result, monthFolder) {
  console.log({
    timestamp: new Date().toISOString(),
    operation: 'monthly-aggregation',
    monthFolder: monthFolder,
    summary: {
      entriesProcessed: result.entries.length,
      filesProcessed: result.metadata.successfulFiles,
      totalFiles: result.metadata.totalFiles,
      processingTime: result.metadata.processingTimeMs,
      systemHealthy: result.metadata.systemHealthy,
      errorCount: result.errors.length
    }
  });
}
```

#### Performance Metrics
```javascript
// Track performance over time
function trackPerformanceMetrics(result) {
  const properties = PropertiesService.getScriptProperties();
  const metrics = {
    timestamp: Date.now(),
    processingTime: result.metadata.processingTimeMs,
    entriesProcessed: result.entries.length,
    filesProcessed: result.metadata.successfulFiles,
    errorCount: result.errors.length
  };
  
  // Store last 10 runs
  const historyKey = 'performance_history';
  let history = JSON.parse(properties.getProperty(historyKey) || '[]');
  history.push(metrics);
  if (history.length > 10) history.shift();
  
  properties.setProperty(historyKey, JSON.stringify(history));
}
```

### Automated Alerts

#### Error Threshold Alerts
```javascript
function checkErrorThreshold(result) {
  const threshold = parseInt(PropertiesService.getScriptProperties().getProperty('ERROR_NOTIFICATION_THRESHOLD') || '5');
  
  if (result.errors.length >= threshold) {
    const adminEmail = getAdminEmail();
    const report = ErrorReportingSystem.generateReport();
    
    MailApp.sendEmail({
      to: adminEmail,
      subject: `Timesheet Aggregation Alert: ${result.errors.length} errors`,
      htmlBody: generateErrorEmailHtml(report)
    });
  }
}

function generateErrorEmailHtml(report) {
  return `
    <h2>Timesheet Aggregation Error Report</h2>
    <p><strong>Session:</strong> ${report.sessionId}</p>
    <p><strong>Generated:</strong> ${report.generatedAt}</p>
    
    <h3>Summary</h3>
    <ul>
      <li>Total Errors: ${report.summary.totalErrors}</li>
      <li>Critical: ${report.summary.criticalErrors}</li>
      <li>Errors: ${report.summary.errors}</li>
      <li>Warnings: ${report.summary.warnings}</li>
    </ul>
    
    <h3>System Health</h3>
    <p><strong>Status:</strong> ${report.systemHealth.overallStatus}</p>
    
    <h3>Recommendations</h3>
    <ul>
      ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
  `;
}
```

### Maintenance Tasks

#### Monthly Maintenance Checklist
- [ ] Review error reports and trends
- [ ] Check performance metrics
- [ ] Validate data quality
- [ ] Update configuration if needed
- [ ] Test backup and recovery procedures

#### Quarterly Maintenance
- [ ] Review and update file patterns
- [ ] Optimize batch sizes based on data growth
- [ ] Update documentation
- [ ] Security review and permission audit
- [ ] Performance optimization review

---

## Troubleshooting

### Common Issues

#### Issue: "Folder not found" Error
**Symptoms**: 
```
Error: FOLDER_NOT_FOUND - No folder found matching pattern: 2025-09
```

**Solutions**:
1. Verify folder exists in Google Drive
2. Check folder naming format (must be YYYY-MM)
3. Ensure proper Drive access permissions
4. Check if folder is in Trash

**Diagnostic Code**:
```javascript
// Debug folder search
const searchResults = DriveApp.searchFolders('title contains "2025-09"');
while (searchResults.hasNext()) {
  const folder = searchResults.next();
  console.log('Found folder:', folder.getName(), 'ID:', folder.getId());
}
```

#### Issue: Permission Denied Errors
**Symptoms**:
```
Error: Access denied. You do not have permission to access this file.
```

**Solutions**:
1. Re-authorize Google Apps Script permissions
2. Check file sharing settings in Google Drive
3. Verify file ownership or editor access
4. Refresh authentication tokens

**Diagnostic Code**:
```javascript
// Test file access
function testFileAccess(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    console.log('File access OK:', file.getName());
    const spreadsheet = SpreadsheetApp.openById(fileId);
    console.log('Spreadsheet access OK, sheets:', spreadsheet.getSheets().length);
  } catch (error) {
    console.error('Access error:', error.message);
  }
}
```

#### Issue: Execution Timeout
**Symptoms**:
```
Error: Script execution timed out (6 minutes maximum)
```

**Solutions**:
1. Reduce batch size in configuration
2. Process data in smaller date ranges
3. Optimize memory usage
4. Remove unnecessary logging

**Diagnostic Code**:
```javascript
// Monitor execution time
function monitoredAggregation(monthFolder) {
  const startTime = Date.now();
  
  const result = aggregateMonthlyTimesheets(monthFolder);
  
  const executionTime = Date.now() - startTime;
  console.log('Execution time:', executionTime + 'ms');
  
  if (executionTime > 240000) {  // 4 minutes warning
    console.warn('Approaching timeout limit, consider optimizing');
  }
  
  return result;
}
```

#### Issue: Memory Limit Exceeded
**Symptoms**:
```
Error: Service invoked too many times in a short time
```

**Solutions**:
1. Enable memory management system
2. Reduce batch size
3. Clear unused variables
4. Process in smaller chunks

**Diagnostic Code**:
```javascript
// Memory optimization
function optimizedAggregation(monthFolder) {
  MemoryManager.initialize();
  
  const result = aggregateMonthlyTimesheets(monthFolder);
  
  const memoryReport = MemoryManager.generateMemoryReport();
  console.log('Peak memory usage:', memoryReport.peak.usageMB + 'MB');
  
  if (memoryReport.peak.usageMB > 80) {
    console.warn('High memory usage, consider batch size optimization');
  }
  
  return result;
}
```

### Debug Mode Activation

Enable detailed logging for troubleshooting:

```javascript
// Add to top of Code.gs for debug mode
const DEBUG_MODE = true;

function debugLog(message, data) {
  if (DEBUG_MODE) {
    console.log('[DEBUG]', message, data || '');
  }
}

// Use throughout code
debugLog('Starting aggregation for month:', monthFolder);
debugLog('Files found:', filesResult.files.length);
```

### Support and Documentation

#### Error Report Generation
```javascript
function generateSupportReport() {
  ErrorReportingSystem.initialize();
  
  // Run test aggregation
  const testResult = aggregateMonthlyTimesheets('2025-09');
  
  // Generate comprehensive report
  const errorReport = ErrorReportingSystem.generateReport();
  const memoryReport = MemoryManager.generateMemoryReport();
  
  const supportReport = {
    timestamp: new Date().toISOString(),
    scriptVersion: '1.0.0',
    testResults: {
      entriesProcessed: testResult.entries.length,
      processingTime: testResult.metadata.processingTimeMs,
      systemHealthy: testResult.metadata.systemHealthy
    },
    errorReport: errorReport,
    memoryReport: memoryReport,
    configuration: AGGREGATION_CONFIG
  };
  
  console.log('Support Report:', JSON.stringify(supportReport, null, 2));
  return supportReport;
}
```

---

## Security Considerations

### Permission Management

#### Principle of Least Privilege
- Grant only necessary Google Drive and Sheets permissions
- Regularly review and audit permissions
- Use service accounts for automated runs when possible

#### Access Control
```javascript
// Implement access logging
function logAccess(operation, details) {
  const accessLog = {
    timestamp: new Date().toISOString(),
    user: Session.getActiveUser().getEmail(),
    operation: operation,
    details: details
  };
  
  console.log('ACCESS_LOG:', JSON.stringify(accessLog));
  
  // Store in secure log sheet if needed
  // const logSheet = SpreadsheetApp.openById('LOG_SHEET_ID');
  // logSheet.appendRow([accessLog.timestamp, accessLog.user, accessLog.operation, JSON.stringify(accessLog.details)]);
}
```

### Data Protection

#### Sensitive Data Handling
- No sensitive data logged to console
- Sanitize error messages before external reporting
- Implement data retention policies

```javascript
// Sanitize error messages for external reporting
function sanitizeError(error) {
  const sanitized = { ...error };
  
  // Remove potentially sensitive information
  delete sanitized.fileName;
  delete sanitized.memberName;
  delete sanitized.field;
  
  // Generalize messages
  if (sanitized.message.includes('file:')) {
    sanitized.message = 'File access error occurred';
  }
  
  return sanitized;
}
```

#### Audit Trail
```javascript
// Maintain audit trail of all aggregations
function auditAggregation(monthFolder, result) {
  const audit = {
    timestamp: new Date().toISOString(),
    user: Session.getActiveUser().getEmail(),
    operation: 'aggregate_monthly_timesheets',
    monthFolder: monthFolder,
    filesProcessed: result.metadata.totalFiles,
    entriesCreated: result.entries.length,
    systemHealthy: result.metadata.systemHealthy,
    sessionId: ErrorReportingSystem.sessionId
  };
  
  // Store audit log
  const properties = PropertiesService.getScriptProperties();
  let auditHistory = JSON.parse(properties.getProperty('audit_history') || '[]');
  auditHistory.push(audit);
  
  // Keep last 100 entries
  if (auditHistory.length > 100) {
    auditHistory = auditHistory.slice(-100);
  }
  
  properties.setProperty('audit_history', JSON.stringify(auditHistory));
}
```

### Deployment Security

#### Script Protection
- Set appropriate sharing settings for Apps Script project
- Use version control for code changes
- Implement change approval process for production

#### Environment Separation
```javascript
// Environment detection
function getEnvironment() {
  const scriptId = ScriptApp.getScriptId();
  
  // Define environment based on script ID or properties
  const prodScriptId = PropertiesService.getScriptProperties().getProperty('PROD_SCRIPT_ID');
  
  return scriptId === prodScriptId ? 'production' : 'development';
}

// Environment-specific configuration
function getConfig() {
  const env = getEnvironment();
  const baseConfig = AGGREGATION_CONFIG;
  
  if (env === 'production') {
    baseConfig.BATCH_SIZE = 15;  // More conservative in production
    baseConfig.MAX_EXECUTION_TIME_MS = 240000;  // 4 minutes for safety
  }
  
  return baseConfig;
}
```

---

**Support**: For technical support and bug reports, contact your system administrator or create an issue in the project repository.

**Security**: Report security vulnerabilities through secure channels only. Do not post security issues publicly.

**Updates**: Check for updates to this deployment guide and implementation code regularly.
const TIMESHEET_FILE_PATTERN = /^Timesheet_(\d{4}-\d{2})_(.+)$/;

// Required fields - modify based on your timesheet structure
const REQUIRED_FIELDS = ['date', 'fromTime', 'toTime', 'project', 'taskType'];

// Validation settings
const MAX_HOURS_PER_DAY = 24;
const MAX_PROCESSING_TIME_MS = 300000; // 5 minutes to stay under 6-minute limit
```

### Troubleshooting

#### Common Issues

**Permission Denied Errors**
- Ensure the Google account has access to the timesheet folders
- Verify that files are not restricted or in a different account's drive

**Execution Timeout**
- The function has a 6-minute execution limit
- For large datasets (>200 members), consider running in batches
- Monitor execution time and implement batching if needed

**File Format Issues**
- Ensure timesheet files are in Google Sheets format (.xlsx, .csv, or native Sheets)
- Verify the filename follows the expected pattern: `Timesheet_YYYY-MM_MemberName`

**Data Validation Errors**
- Check that required fields are present in timesheet files
- Verify time formats are recognizable (HH:MM, H:MM AM/PM, etc.)
- Ensure dates are valid and within reasonable ranges

#### Debugging Steps

1. **Check Execution Transcript**
   - In Google Apps Script editor, go to "Executions"
   - Review recent execution logs for detailed error messages

2. **Test with Small Dataset**
   - Start with a folder containing only 2-3 timesheet files
   - Verify the function works before scaling up

3. **Validate Input Data**
   - Manually check a few timesheet files for format consistency
   - Ensure all required columns are present

### Performance Optimization

#### For Large Datasets (100+ members)
- Monitor execution time closely
- Consider implementing progress checkpoints
- Use batch processing if approaching time limits
- Optimize Google Drive API calls to reduce latency

#### Memory Management
- The function is designed to handle up to 20,000 entries
- If experiencing memory issues, implement streaming processing
- Clear large objects when no longer needed

### Maintenance

#### Regular Tasks
- Monitor error logs for data quality issues
- Update validation rules as business requirements change
- Review performance metrics and optimize as needed

#### Updates and Changes
- Test any changes in a copy of the Google Apps Script project first
- Maintain backup copies of working versions
- Document any customizations for future reference

### Support

For issues related to:
- **Google Apps Script platform**: Check [Google Apps Script documentation](https://developers.google.com/apps-script)
- **API limits and quotas**: Review [Google Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas)
- **Implementation bugs**: Review the error logs and contract specifications in the feature documentation
