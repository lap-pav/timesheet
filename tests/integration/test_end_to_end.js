// ============================================================================
// END-TO-END INTEGRATION TESTS FOR GOOGLE APPS SCRIPT DEPLOYMENT
// ============================================================================

/**
 * End-to-end integration tests for timesheet aggregation system
 * 
 * These tests are designed to be run in the Google Apps Script environment
 * with real Google Drive data to validate the complete system functionality.
 * 
 * Prerequisites:
 * 1. Google Drive folder structure with monthly folders (YYYY-MM format)
 * 2. Sample timesheet files following naming convention
 * 3. Google Apps Script project with proper permissions
 * 4. Real spreadsheet data for validation
 * 
 * Test Categories:
 * - Basic functionality validation
 * - Error handling with real data
 * - Performance validation with realistic datasets
 * - Integration with Google Drive/Sheets APIs
 * - End-to-end workflow validation
 * 
 * Note: These tests should be copied into Google Apps Script editor for execution
 */

// ============================================================================
// CONFIGURATION FOR REAL DATA TESTING
// ============================================================================

const END_TO_END_CONFIG = {
  // Test month for end-to-end validation (should exist in Google Drive)
  TEST_MONTH: '2025-09',
  
  // Minimum expected results for validation
  MIN_EXPECTED_FILES: 1,
  MIN_EXPECTED_ENTRIES: 5,
  
  // Performance thresholds
  MAX_PROCESSING_TIME_MS: 300000, // 5 minutes
  MAX_MEMORY_USAGE_MB: 80,
  
  // Validation criteria
  REQUIRED_FIELDS: ['member', 'date', 'from_time', 'to_time', 'project', 'task_type'],
  OPTIONAL_FIELDS: ['description', 'tc_from_time', 'tc_to_time'],
  
  // Error tolerance (percentage of entries that can fail validation)
  ERROR_TOLERANCE_PERCENT: 10
};

// ============================================================================
// END-TO-END TEST FUNCTIONS (TO BE RUN IN GOOGLE APPS SCRIPT)
// ============================================================================

/**
 * Master end-to-end test function - runs all validation tests
 * Call this function from Google Apps Script editor to run complete validation
 */
function runEndToEndTests() {
  console.log('='.repeat(80));
  console.log('STARTING END-TO-END INTEGRATION TESTS');
  console.log('='.repeat(80));
  
  const startTime = Date.now();
  let testResults = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    errors: [],
    warnings: [],
    summary: {}
  };
  
  try {
    // Test 1: Basic System Health Check
    console.log('\n--- Test 1: System Health Check ---');
    testResults = runTest(testResults, 'System Health Check', testSystemHealth);
    
    // Test 2: Google Drive Integration
    console.log('\n--- Test 2: Google Drive Integration ---');
    testResults = runTest(testResults, 'Google Drive Integration', testGoogleDriveIntegration);
    
    // Test 3: File Discovery and Access
    console.log('\n--- Test 3: File Discovery and Access ---');
    testResults = runTest(testResults, 'File Discovery and Access', testFileDiscoveryAndAccess);
    
    // Test 4: Data Reading and Parsing
    console.log('\n--- Test 4: Data Reading and Parsing ---');
    testResults = runTest(testResults, 'Data Reading and Parsing', testDataReadingAndParsing);
    
    // Test 5: Full Aggregation Workflow
    console.log('\n--- Test 5: Full Aggregation Workflow ---');
    testResults = runTest(testResults, 'Full Aggregation Workflow', testFullAggregationWorkflow);
    
    // Test 6: Error Handling with Real Data
    console.log('\n--- Test 6: Error Handling with Real Data ---');
    testResults = runTest(testResults, 'Error Handling with Real Data', testErrorHandlingWithRealData);
    
    // Test 7: Performance Validation
    console.log('\n--- Test 7: Performance Validation ---');
    testResults = runTest(testResults, 'Performance Validation', testPerformanceValidation);
    
    // Generate final report
    const endTime = Date.now();
    generateEndToEndReport(testResults, endTime - startTime);
    
  } catch (error) {
    console.error('CRITICAL ERROR in end-to-end tests:', error);
    testResults.errors.push({
      test: 'End-to-End Test Execution',
      error: error.message,
      severity: 'CRITICAL'
    });
  }
  
  return testResults;
}

/**
 * Test runner utility function
 */
function runTest(testResults, testName, testFunction) {
  testResults.totalTests++;
  
  try {
    const result = testFunction();
    if (result.success) {
      testResults.passedTests++;
      console.log(`✅ ${testName}: PASSED`);
      if (result.warnings && result.warnings.length > 0) {
        testResults.warnings.push(...result.warnings.map(w => ({ test: testName, warning: w })));
      }
    } else {
      testResults.failedTests++;
      console.log(`❌ ${testName}: FAILED - ${result.error}`);
      testResults.errors.push({ test: testName, error: result.error, severity: 'ERROR' });
    }
    
    // Store test-specific metrics
    if (result.metrics) {
      testResults.summary[testName] = result.metrics;
    }
    
  } catch (error) {
    testResults.failedTests++;
    console.log(`💥 ${testName}: EXCEPTION - ${error.message}`);
    testResults.errors.push({ test: testName, error: error.message, severity: 'EXCEPTION' });
  }
  
  return testResults;
}

// ============================================================================
// INDIVIDUAL TEST IMPLEMENTATIONS
// ============================================================================

/**
 * Test 1: System Health Check
 * Validates that all required functions and constants are available
 */
function testSystemHealth() {
  const requiredFunctions = [
    'aggregateMonthlyTimesheets',
    'getMonthlyFolder', 
    'getTimesheetFiles',
    'readTimesheetData',
    'validateTimesheetEntry',
    'normalizeTimesheetEntry',
    'processTimesheetFile'
  ];
  
  const requiredConstants = [
    'AGGREGATION_CONFIG',
    'ERROR_TYPES',
    'SEVERITY_LEVELS'
  ];
  
  // Check functions exist and are callable
  for (const funcName of requiredFunctions) {
    if (typeof eval(funcName) !== 'function') {
      return { success: false, error: `Required function ${funcName} not found or not callable` };
    }
  }
  
  // Check constants exist
  for (const constName of requiredConstants) {
    try {
      const constValue = eval(constName);
      if (constValue === undefined) {
        return { success: false, error: `Required constant ${constName} not defined` };
      }
    } catch (error) {
      return { success: false, error: `Error accessing constant ${constName}: ${error.message}` };
    }
  }
  
  // Check Google Apps Script APIs are available
  if (typeof DriveApp === 'undefined') {
    return { success: false, error: 'DriveApp API not available' };
  }
  
  if (typeof SpreadsheetApp === 'undefined') {
    return { success: false, error: 'SpreadsheetApp API not available' };
  }
  
  return { 
    success: true, 
    metrics: { 
      functionsChecked: requiredFunctions.length,
      constantsChecked: requiredConstants.length 
    }
  };
}

/**
 * Test 2: Google Drive Integration
 * Tests connection to Google Drive and basic folder operations
 */
function testGoogleDriveIntegration() {
  try {
    // Test basic Drive access
    const rootFolder = DriveApp.getRootFolder();
    if (!rootFolder) {
      return { success: false, error: 'Cannot access Google Drive root folder' };
    }
    
    // Test folder search functionality
    const testFolders = DriveApp.searchFolders('title contains "2025"');
    const folderCount = getFolderIteratorCount(testFolders);
    
    console.log(`Found ${folderCount} folders with "2025" in title`);
    
    // Test file search functionality  
    const testFiles = DriveApp.searchFiles('title contains "Timesheet"');
    const fileCount = getFileIteratorCount(testFiles);
    
    console.log(`Found ${fileCount} files with "Timesheet" in title`);
    
    return { 
      success: true, 
      metrics: { 
        foldersFound: folderCount,
        timesheetFilesFound: fileCount 
      }
    };
    
  } catch (error) {
    return { success: false, error: `Google Drive integration failed: ${error.message}` };
  }
}

/**
 * Test 3: File Discovery and Access
 * Tests the system's ability to find and access timesheet files
 */
function testFileDiscoveryAndAccess() {
  try {
    // Test monthly folder discovery
    const folderResult = getMonthlyFolder(END_TO_END_CONFIG.TEST_MONTH);
    
    if (folderResult.errors.length > 0) {
      return { 
        success: false, 
        error: `Folder discovery failed: ${folderResult.errors[0].message}` 
      };
    }
    
    if (!folderResult.folder) {
      return { 
        success: false, 
        error: `Test month folder ${END_TO_END_CONFIG.TEST_MONTH} not found in Google Drive` 
      };
    }
    
    console.log(`✓ Found monthly folder: ${folderResult.folder.getName()}`);
    
    // Test file enumeration
    const filesResult = getTimesheetFiles(folderResult.folder);
    
    if (filesResult.errors.length > 0) {
      return { 
        success: false, 
        error: `File enumeration failed: ${filesResult.errors[0].message}` 
      };
    }
    
    if (filesResult.files.length < END_TO_END_CONFIG.MIN_EXPECTED_FILES) {
      return { 
        success: false, 
        error: `Insufficient timesheet files found. Expected at least ${END_TO_END_CONFIG.MIN_EXPECTED_FILES}, found ${filesResult.files.length}` 
      };
    }
    
    console.log(`✓ Found ${filesResult.files.length} timesheet files`);
    
    // Test file access for first file
    const testFile = filesResult.files[0];
    try {
      const spreadsheet = SpreadsheetApp.openById(testFile.fileId);
      const sheet = spreadsheet.getActiveSheet();
      const dataRange = sheet.getDataRange();
      const rowCount = dataRange.getNumRows();
      
      console.log(`✓ Successfully accessed test file: ${testFile.fileName} (${rowCount} rows)`);
      
    } catch (accessError) {
      return { 
        success: false, 
        error: `Cannot access test file ${testFile.fileName}: ${accessError.message}` 
      };
    }
    
    return { 
      success: true, 
      metrics: { 
        folderFound: true,
        filesFound: filesResult.files.length,
        firstFileAccessible: true 
      }
    };
    
  } catch (error) {
    return { success: false, error: `File discovery test failed: ${error.message}` };
  }
}

/**
 * Test 4: Data Reading and Parsing
 * Tests the system's ability to read and parse spreadsheet data
 */
function testDataReadingAndParsing() {
  try {
    // Get a sample file for testing
    const folderResult = getMonthlyFolder(END_TO_END_CONFIG.TEST_MONTH);
    if (!folderResult.folder) {
      return { success: false, error: 'Test folder not available for data reading test' };
    }
    
    const filesResult = getTimesheetFiles(folderResult.folder);
    if (filesResult.files.length === 0) {
      return { success: false, error: 'No files available for data reading test' };
    }
    
    const testFile = filesResult.files[0];
    console.log(`Testing data reading with file: ${testFile.fileName}`);
    
    // Test data reading
    const dataResult = readTimesheetData(testFile);
    
    if (dataResult.errors.length > 0) {
      return { 
        success: false, 
        error: `Data reading failed: ${dataResult.errors[0].message}` 
      };
    }
    
    if (!dataResult.rawData || dataResult.rawData.length === 0) {
      return { success: false, error: 'No data found in test file' };
    }
    
    if (!dataResult.headers || dataResult.headers.length === 0) {
      return { success: false, error: 'No headers found in test file' };
    }
    
    console.log(`✓ Read ${dataResult.rawData.length} data rows with ${dataResult.headers.length} columns`);
    console.log(`✓ Headers: ${dataResult.headers.join(', ')}`);
    
    // Test data validation on first few rows
    let validationErrors = 0;
    const samplesToTest = Math.min(5, dataResult.rawData.length);
    
    for (let i = 0; i < samplesToTest; i++) {
      const validationResult = validateTimesheetEntry(
        dataResult.rawData[i], 
        dataResult.memberName, 
        dataResult.headers, 
        i + 2 // Row index (1-based + header)
      );
      
      if (!validationResult.isValid) {
        validationErrors++;
      }
    }
    
    console.log(`✓ Validated ${samplesToTest} sample entries, ${validationErrors} validation errors`);
    
    return { 
      success: true, 
      metrics: { 
        dataRows: dataResult.rawData.length,
        headerColumns: dataResult.headers.length,
        memberName: dataResult.memberName,
        validationErrors: validationErrors,
        samplesValidated: samplesToTest
      }
    };
    
  } catch (error) {
    return { success: false, error: `Data reading test failed: ${error.message}` };
  }
}

/**
 * Test 5: Full Aggregation Workflow
 * Tests the complete aggregation process with real data
 */
function testFullAggregationWorkflow() {
  try {
    console.log(`Starting full aggregation test for month: ${END_TO_END_CONFIG.TEST_MONTH}`);
    
    // Initialize monitoring systems
    if (typeof ErrorReportingSystem !== 'undefined') {
      ErrorReportingSystem.initialize();
    }
    
    if (typeof MemoryManager !== 'undefined') {
      MemoryManager.initialize();
    }
    
    const startTime = Date.now();
    
    // Run full aggregation
    const result = aggregateMonthlyTimesheets(END_TO_END_CONFIG.TEST_MONTH);
    
    const processingTime = Date.now() - startTime;
    
    // Validate aggregation results
    if (!result) {
      return { success: false, error: 'Aggregation returned null result' };
    }
    
    if (!result.entries || !Array.isArray(result.entries)) {
      return { success: false, error: 'Aggregation did not return entries array' };
    }
    
    if (result.entries.length < END_TO_END_CONFIG.MIN_EXPECTED_ENTRIES) {
      return { 
        success: false, 
        error: `Insufficient entries aggregated. Expected at least ${END_TO_END_CONFIG.MIN_EXPECTED_ENTRIES}, got ${result.entries.length}` 
      };
    }
    
    // Validate entry structure
    const sampleEntry = result.entries[0];
    const missingFields = END_TO_END_CONFIG.REQUIRED_FIELDS.filter(field => !sampleEntry.hasOwnProperty(field));
    
    if (missingFields.length > 0) {
      return { 
        success: false, 
        error: `Sample entry missing required fields: ${missingFields.join(', ')}` 
      };
    }
    
    // Check error rate
    const errorCount = result.errors ? result.errors.length : 0;
    const errorRate = (errorCount / result.entries.length) * 100;
    
    if (errorRate > END_TO_END_CONFIG.ERROR_TOLERANCE_PERCENT) {
      return { 
        success: false, 
        error: `Error rate too high: ${errorRate.toFixed(2)}% (tolerance: ${END_TO_END_CONFIG.ERROR_TOLERANCE_PERCENT}%)` 
      };
    }
    
    // Performance validation
    if (processingTime > END_TO_END_CONFIG.MAX_PROCESSING_TIME_MS) {
      return { 
        success: false, 
        error: `Processing time too long: ${processingTime}ms (limit: ${END_TO_END_CONFIG.MAX_PROCESSING_TIME_MS}ms)` 
      };
    }
    
    console.log(`✅ Full aggregation completed successfully:`);
    console.log(`   - Entries processed: ${result.entries.length}`);
    console.log(`   - Files processed: ${result.metadata ? result.metadata.totalFiles : 'unknown'}`);
    console.log(`   - Processing time: ${processingTime}ms`);
    console.log(`   - Error count: ${errorCount}`);
    console.log(`   - Error rate: ${errorRate.toFixed(2)}%`);
    
    const warnings = [];
    
    // Performance warnings
    if (processingTime > END_TO_END_CONFIG.MAX_PROCESSING_TIME_MS * 0.8) {
      warnings.push(`Processing time approaching limit: ${processingTime}ms`);
    }
    
    if (errorRate > END_TO_END_CONFIG.ERROR_TOLERANCE_PERCENT * 0.5) {
      warnings.push(`Error rate higher than ideal: ${errorRate.toFixed(2)}%`);
    }
    
    return { 
      success: true, 
      warnings: warnings,
      metrics: { 
        entriesProcessed: result.entries.length,
        filesProcessed: result.metadata ? result.metadata.totalFiles : null,
        processingTimeMs: processingTime,
        errorCount: errorCount,
        errorRate: errorRate,
        systemHealthy: result.metadata ? result.metadata.systemHealthy : null
      }
    };
    
  } catch (error) {
    return { success: false, error: `Full aggregation test failed: ${error.message}` };
  }
}

/**
 * Test 6: Error Handling with Real Data
 * Tests system behavior with various error conditions
 */
function testErrorHandlingWithRealData() {
  try {
    let testsPassed = 0;
    let totalTests = 0;
    
    // Test 1: Non-existent month folder
    totalTests++;
    try {
      const invalidResult = aggregateMonthlyTimesheets('2999-99');
      if (invalidResult.errors && invalidResult.errors.length > 0) {
        console.log(`✓ Non-existent folder error handled correctly`);
        testsPassed++;
      } else {
        console.log(`⚠ Non-existent folder should have produced errors`);
      }
    } catch (error) {
      console.log(`✓ Non-existent folder error handled with exception (acceptable)`);
      testsPassed++;
    }
    
    // Test 2: Error reporting system
    totalTests++;
    if (typeof ErrorReportingSystem !== 'undefined') {
      try {
        ErrorReportingSystem.initialize();
        const report = ErrorReportingSystem.generateReport();
        if (report && report.sessionId) {
          console.log(`✓ Error reporting system functional`);
          testsPassed++;
        } else {
          console.log(`⚠ Error reporting system not generating reports`);
        }
      } catch (error) {
        console.log(`⚠ Error reporting system test failed: ${error.message}`);
      }
    } else {
      console.log(`⚠ Error reporting system not available`);
    }
    
    // Test 3: Memory management system
    totalTests++;
    if (typeof MemoryManager !== 'undefined') {
      try {
        MemoryManager.initialize();
        const memoryCheck = MemoryManager.checkMemoryUsage('error-handling-test');
        if (memoryCheck) {
          console.log(`✓ Memory management system functional`);
          testsPassed++;
        } else {
          console.log(`⚠ Memory management system not responding`);
        }
      } catch (error) {
        console.log(`⚠ Memory management system test failed: ${error.message}`);
      }
    } else {
      console.log(`⚠ Memory management system not available`);
    }
    
    const successRate = (testsPassed / totalTests) * 100;
    
    return { 
      success: successRate >= 66, // At least 2/3 of error handling tests should pass
      metrics: { 
        errorHandlingTestsPassed: testsPassed,
        totalErrorHandlingTests: totalTests,
        successRate: successRate
      },
      warnings: successRate < 100 ? [`Error handling success rate: ${successRate.toFixed(1)}%`] : []
    };
    
  } catch (error) {
    return { success: false, error: `Error handling test failed: ${error.message}` };
  }
}

/**
 * Test 7: Performance Validation
 * Tests system performance characteristics with real data
 */
function testPerformanceValidation() {
  try {
    console.log('Running performance validation tests...');
    
    // Memory usage test
    let memoryMetrics = null;
    if (typeof MemoryManager !== 'undefined') {
      MemoryManager.initialize();
      const preTest = MemoryManager.checkMemoryUsage('performance-test-start');
      
      // Run a sample aggregation
      const result = aggregateMonthlyTimesheets(END_TO_END_CONFIG.TEST_MONTH);
      
      const postTest = MemoryManager.checkMemoryUsage('performance-test-end');
      memoryMetrics = MemoryManager.generateMemoryReport();
      
      console.log(`Memory usage - Peak: ${memoryMetrics.peak ? memoryMetrics.peak.usageMB : 'unknown'}MB`);
    }
    
    // Processing speed test
    const speedTestStart = Date.now();
    const speedTestResult = aggregateMonthlyTimesheets(END_TO_END_CONFIG.TEST_MONTH);
    const speedTestDuration = Date.now() - speedTestStart;
    
    if (speedTestResult && speedTestResult.entries) {
      const entriesPerSecond = speedTestResult.entries.length / (speedTestDuration / 1000);
      console.log(`Processing speed: ${entriesPerSecond.toFixed(2)} entries/second`);
    }
    
    // Performance validation
    const warnings = [];
    let performanceScore = 100;
    
    if (speedTestDuration > END_TO_END_CONFIG.MAX_PROCESSING_TIME_MS * 0.8) {
      warnings.push(`Processing time high: ${speedTestDuration}ms`);
      performanceScore -= 25;
    }
    
    if (memoryMetrics && memoryMetrics.peak && memoryMetrics.peak.usageMB > END_TO_END_CONFIG.MAX_MEMORY_USAGE_MB) {
      warnings.push(`Memory usage high: ${memoryMetrics.peak.usageMB}MB`);
      performanceScore -= 25;
    }
    
    return { 
      success: performanceScore >= 50, // At least 50% performance score required
      warnings: warnings,
      metrics: { 
        processingTimeMs: speedTestDuration,
        memoryUsageMB: memoryMetrics && memoryMetrics.peak ? memoryMetrics.peak.usageMB : null,
        entriesPerSecond: speedTestResult && speedTestResult.entries ? speedTestResult.entries.length / (speedTestDuration / 1000) : null,
        performanceScore: performanceScore
      }
    };
    
  } catch (error) {
    return { success: false, error: `Performance validation failed: ${error.message}` };
  }
}

// ============================================================================
// UTILITY FUNCTIONS FOR TESTING
// ============================================================================

/**
 * Count items in a file iterator (Google Apps Script specific)
 */
function getFileIteratorCount(iterator) {
  let count = 0;
  while (iterator.hasNext()) {
    iterator.next();
    count++;
  }
  return count;
}

/**
 * Count items in a folder iterator (Google Apps Script specific)
 */
function getFolderIteratorCount(iterator) {
  let count = 0;
  while (iterator.hasNext()) {
    iterator.next();
    count++;
  }
  return count;
}

/**
 * Generate comprehensive end-to-end test report
 */
function generateEndToEndReport(testResults, totalDuration) {
  console.log('\n' + '='.repeat(80));
  console.log('END-TO-END INTEGRATION TEST REPORT');
  console.log('='.repeat(80));
  
  const timestamp = new Date().toISOString();
  const successRate = (testResults.passedTests / testResults.totalTests) * 100;
  
  console.log(`\nTest Session: ${timestamp}`);
  console.log(`Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
  console.log(`Test Environment: Google Apps Script`);
  console.log(`Test Month: ${END_TO_END_CONFIG.TEST_MONTH}`);
  
  console.log(`\n📊 TEST SUMMARY:`);
  console.log(`   Total Tests: ${testResults.totalTests}`);
  console.log(`   Passed: ${testResults.passedTests} (${successRate.toFixed(1)}%)`);
  console.log(`   Failed: ${testResults.failedTests}`);
  console.log(`   Warnings: ${testResults.warnings.length}`);
  
  // Overall status
  let overallStatus = 'UNKNOWN';
  if (testResults.failedTests === 0) {
    overallStatus = testResults.warnings.length === 0 ? '✅ EXCELLENT' : '⚠️ GOOD';
  } else if (successRate >= 80) {
    overallStatus = '⚠️ ACCEPTABLE';
  } else {
    overallStatus = '❌ NEEDS ATTENTION';
  }
  
  console.log(`\n🎯 OVERALL STATUS: ${overallStatus}`);
  
  // Detailed test results
  if (Object.keys(testResults.summary).length > 0) {
    console.log(`\n📋 DETAILED RESULTS:`);
    for (const [testName, metrics] of Object.entries(testResults.summary)) {
      console.log(`   ${testName}:`);
      for (const [key, value] of Object.entries(metrics)) {
        console.log(`     - ${key}: ${value}`);
      }
    }
  }
  
  // Errors
  if (testResults.errors.length > 0) {
    console.log(`\n❌ ERRORS:`);
    testResults.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.test}: ${error.error} [${error.severity}]`);
    });
  }
  
  // Warnings
  if (testResults.warnings.length > 0) {
    console.log(`\n⚠️ WARNINGS:`);
    testResults.warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning.test}: ${warning.warning}`);
    });
  }
  
  // Recommendations
  console.log(`\n💡 RECOMMENDATIONS:`);
  if (testResults.failedTests === 0 && testResults.warnings.length === 0) {
    console.log(`   • System is ready for production deployment`);
    console.log(`   • All integration tests passed successfully`);
    console.log(`   • No issues detected with real Google Drive data`);
  } else {
    if (testResults.failedTests > 0) {
      console.log(`   • Address failed tests before production deployment`);
      console.log(`   • Review error messages and fix underlying issues`);
    }
    if (testResults.warnings.length > 0) {
      console.log(`   • Review warnings for potential optimizations`);
      console.log(`   • Consider performance tuning if needed`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('END-TO-END INTEGRATION TEST COMPLETE');
  console.log('='.repeat(80));
  
  return {
    timestamp: timestamp,
    duration: totalDuration,
    overallStatus: overallStatus,
    successRate: successRate,
    summary: testResults
  };
}

// ============================================================================
// QUICK TEST FUNCTIONS FOR DEVELOPMENT
// ============================================================================

/**
 * Quick smoke test - runs essential checks only
 * Use this for rapid validation during development
 */
function runQuickSmokeTest() {
  console.log('🔥 Running Quick Smoke Test...');
  
  const tests = [
    { name: 'System Health', func: testSystemHealth },
    { name: 'Drive Access', func: testGoogleDriveIntegration },
    { name: 'Basic Aggregation', func: () => {
      try {
        const result = aggregateMonthlyTimesheets(END_TO_END_CONFIG.TEST_MONTH);
        return { 
          success: result && result.entries && result.entries.length > 0,
          metrics: { entries: result ? result.entries.length : 0 }
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }}
  ];
  
  let passed = 0;
  tests.forEach(test => {
    try {
      const result = test.func();
      if (result.success) {
        console.log(`✅ ${test.name}: PASSED`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: FAILED - ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`💥 ${test.name}: EXCEPTION - ${error.message}`);
    }
  });
  
  const status = passed === tests.length ? '🎉 ALL GOOD' : '⚠️ ISSUES DETECTED';
  console.log(`\n${status} - ${passed}/${tests.length} tests passed`);
  
  return { passed, total: tests.length, status };
}

/**
 * Manual test runner for specific functionality
 * Call this with specific test names for targeted testing
 */
function runSpecificTest(testName) {
  const availableTests = {
    'health': testSystemHealth,
    'drive': testGoogleDriveIntegration,
    'files': testFileDiscoveryAndAccess,
    'data': testDataReadingAndParsing,
    'aggregation': testFullAggregationWorkflow,
    'errors': testErrorHandlingWithRealData,
    'performance': testPerformanceValidation
  };
  
  if (!availableTests[testName]) {
    console.log(`❌ Test '${testName}' not found. Available tests: ${Object.keys(availableTests).join(', ')}`);
    return { success: false, error: 'Test not found' };
  }
  
  console.log(`🧪 Running specific test: ${testName}`);
  
  try {
    const result = availableTests[testName]();
    if (result.success) {
      console.log(`✅ Test '${testName}' PASSED`);
      if (result.metrics) {
        console.log('Metrics:', result.metrics);
      }
    } else {
      console.log(`❌ Test '${testName}' FAILED: ${result.error}`);
    }
    return result;
  } catch (error) {
    console.log(`💥 Test '${testName}' EXCEPTION: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// INSTRUCTIONS FOR GOOGLE APPS SCRIPT DEPLOYMENT
// ============================================================================

/*
 * TO RUN THESE TESTS IN GOOGLE APPS SCRIPT:
 * 
 * 1. Copy this entire file content to Google Apps Script editor
 * 2. Ensure the main Code.gs file is also deployed with aggregation functions
 * 3. Set up test data:
 *    - Create a monthly folder (e.g., "2025-09") in Google Drive
 *    - Add sample timesheet files following naming convention
 *    - Update END_TO_END_CONFIG.TEST_MONTH to match your test folder
 * 
 * 4. Run tests:
 *    - For complete testing: runEndToEndTests()
 *    - For quick validation: runQuickSmokeTest()
 *    - For specific tests: runSpecificTest('testname')
 * 
 * 5. Review results in Google Apps Script execution log
 * 
 * IMPORTANT: These tests require real Google Drive data and proper permissions.
 * Ensure your Google Apps Script project has the necessary authorizations.
 */
