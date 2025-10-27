# Enhanced Configuration System - Manual Testing Checklist

**Version**: Enhanced Configuration System v1.0  
**Date**: October 27, 2025  
**System**: Google Apps Script Timesheet Application

## Pre-Testing Setup

### ✅ Environment Preparation
- [ ] Google Apps Script project deployed with all enhanced files
- [ ] Active spreadsheet with aggregated timesheet data available
- [ ] "Report Configs" sheet created with proper column headers
- [ ] Test data available with various data types (dates, times, text, numbers)
- [ ] Browser console open for debugging (F12 → Console tab)

### ✅ Required Test Data
Ensure your aggregated data contains:
- [ ] Multiple team members
- [ ] Various project names
- [ ] Date range spanning multiple days/weeks
- [ ] Time entries with different start/end times
- [ ] Some empty or null values for testing fallbacks
- [ ] Special characters in project names (for text processing tests)

## Basic Functionality Tests

### ✅ Legacy Compatibility Tests
- [ ] **Test LC-001**: Existing configurations work without changes
  - Use old column format: `Member Name,Date,Hours,Project Name`
  - Expected: Report generates successfully with same output as before
  
- [ ] **Test LC-002**: Mixed legacy and enhanced configurations
  - Create one legacy config and one with expressions
  - Expected: Both configurations appear in selection dialog
  
- [ ] **Test LC-003**: Automatic migration validation
  - Check that legacy columns are properly mapped
  - Expected: No data loss or formatting changes

### ✅ Expression System Tests

#### Basic Expression Evaluation
- [ ] **Test EX-001**: Simple field references
  - Column: `Member Name`
  - Expected: Displays member names correctly
  
- [ ] **Test EX-002**: Basic calculations
  - Column: `Hours:calculateHours(Time In,Time Out)`
  - Expected: Calculates hours correctly (e.g., 9:00-17:30 = 8.5)
  
- [ ] **Test EX-003**: Date formatting
  - Column: `Work Date:formatDate(Date)`
  - Expected: Displays formatted dates (e.g., "10/27/2025")
  
- [ ] **Test EX-004**: Day of week function
  - Column: `Day:getDayOfWeek(Date)`
  - Expected: Shows day names (Monday, Tuesday, etc.)

#### Advanced Expression Tests
- [ ] **Test EX-005**: Default value handling
  - Column: `Safe Hours:defaultValue(calculateHours(Time In,Time Out),0)`
  - Test with missing time data
  - Expected: Shows 0 for missing data, calculated hours for valid data
  
- [ ] **Test EX-006**: Conditional logic
  - Column: `Type:stringContains(Project Name,'Development') ? 'Dev' : 'Other'`
  - Expected: Shows 'Dev' for development projects, 'Other' for everything else
  
- [ ] **Test EX-007**: Complex expressions
  - Column: `Summary:Member Name + ' worked ' + calculateHours(Time In,Time Out) + ' hours on ' + getDayOfWeek(Date)`
  - Expected: Descriptive text like "John Doe worked 8.5 hours on Monday"

#### Error Handling Tests
- [ ] **Test EX-008**: Invalid expression syntax
  - Column: `Bad:calculateHours(Time In` (missing closing parenthesis)
  - Expected: Error message displayed, report generation continues
  
- [ ] **Test EX-009**: Invalid function calls
  - Column: `Bad:nonexistentFunction(Date)`
  - Expected: Error message, other columns still work
  
- [ ] **Test EX-010**: Security validation
  - Column: `Bad:eval('dangerous code')`
  - Expected: Expression rejected with security error

## Feature Testing (10 minutes)

### Test 1: Basic Expression Evaluation
```javascript
function testBasicExpressions() {
  // Setup test context
  const context = {
    record: {
      member: "John Doe",
      from_time: "09:00",
      to_time: "17:30",
      project: "alpha project",
      date: "2025-10-27"
    },
    calculateHours: function(start, end) {
      // Simple hour calculation for testing
      const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
      const endMinutes = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
      return (endMinutes - startMinutes) / 60;
    },
    upper: function(value) {
      return String(value || '').toUpperCase();
    },
    getDayOfWeek: function(dateStr) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[new Date(dateStr).getDay()];
    }
  };
  
  // Test different expressions
  const tests = [
    { expr: "record.member", expected: "John Doe" },
    { expr: "calculateHours(record.from_time, record.to_time)", expected: 8.5 },
    { expr: "upper(record.project)", expected: "ALPHA PROJECT" },
    { expr: "getDayOfWeek(record.date)", expected: "Sunday" }
  ];
  
  tests.forEach(test => {
    try {
      const result = evaluateExpression(test.expr, context);
      console.log(`✓ ${test.expr} = ${result} (expected: ${test.expected})`);
    } catch (error) {
      console.log(`✗ ${test.expr} failed: ${error.message}`);
    }
  });
}
```

### Test 2: Column Definition Parsing
```javascript
function testColumnParsing() {
  const testCases = [
    // Simple format (backward compatibility)
    {
      input: "Member Name,Hours,Project Name",
      expectedCount: 3,
      description: "Simple column names"
    },
    // Expression format
    {
      input: "Team Member:upper(record.member),Work Hours:calculateHours(record.from_time,record.to_time),Status:\"Active\"",
      expectedCount: 3,
      description: "Custom expressions"
    },
    // Mixed format
    {
      input: "Member Name,Hours:calculateHours(record.from_time,record.to_time),Project Name",
      expectedCount: 3,
      description: "Mixed simple and expression"
    }
  ];
  
  testCases.forEach(testCase => {
    try {
      const result = parseColumnDefinitions(testCase.input);
      console.log(`✓ ${testCase.description}: ${result.length} columns (expected: ${testCase.expectedCount})`);
      result.forEach(col => {
        console.log(`  - ${col.displayName}: ${col.expression} (custom: ${col.isCustom})`);
      });
    } catch (error) {
      console.log(`✗ ${testCase.description} failed: ${error.message}`);
    }
  });
}
```

### Test 3: Output Structure Planning
```javascript
function testOutputStructure() {
  // Sample data
  const sampleData = [
    { member: "John Doe", project: "Alpha", hours: 8 },
    { member: "Jane Smith", project: "Alpha", hours: 6 },
    { member: "John Doe", project: "Beta", hours: 4 },
    { member: "Jane Smith", project: "Beta", hours: 7 }
  ];
  
  const testConfigs = [
    {
      type: "SINGLE_SHEET",
      description: "Single sheet output"
    },
    {
      type: "SHEET_PER_PROJECT",
      groupingField: "project",
      namingPattern: "Project_{groupValue}",
      description: "Sheet per project"
    },
    {
      type: "FILE_PER_EMPLOYEE",
      groupingField: "member",
      namingPattern: "{groupValue}_Timesheet",
      description: "File per employee"
    }
  ];
  
  testConfigs.forEach(config => {
    try {
      const plan = determineOutputStructure(config, sampleData);
      console.log(`✓ ${config.description}:`);
      console.log(`  Strategy: ${plan.strategy}`);
      console.log(`  Groups: ${plan.groups.length}`);
      console.log(`  Files: ${plan.totalFiles}, Sheets: ${plan.totalSheets}`);
    } catch (error) {
      console.log(`✗ ${config.description} failed: ${error.message}`);
    }
  });
}
```

## Integration Testing

### Test 4: End-to-End Report Generation
```javascript
function testReportGeneration() {
  // This test should be run with actual timesheet data
  try {
    // 1. Read enhanced configuration
    const configResult = readReportConfigurations();
    if (!configResult.success) {
      throw new Error("Failed to read configurations: " + configResult.errors.join(", "));
    }
    
    // 2. Find our test configuration
    const testConfig = configResult.configurations.find(c => c.reportName === "Enhanced Hours Report");
    if (!testConfig) {
      throw new Error("Test configuration not found");
    }
    
    // 3. Get sample aggregated data (use existing function)
    const monthFolder = "2025-10"; // Adjust to your test data
    const aggregatedData = aggregateMonthlyTimesheets(monthFolder);
    
    if (!aggregatedData || !aggregatedData.entries || aggregatedData.entries.length === 0) {
      console.log("⚠ No timesheet data found for testing. Using mock data.");
      // Use mock data for testing
      aggregatedData.entries = [
        {
          member: "Test User",
          date: "2025-10-27",
          from_time: "09:00",
          to_time: "17:00",
          project: "Test Project",
          task_type: "Development",
          description: "Testing enhanced configuration"
        }
      ];
    }
    
    // 4. Generate report with new configuration
    const reportResult = generateConfigurableReport(aggregatedData.entries, testConfig);
    
    if (reportResult.success) {
      console.log("✓ Report generation successful:");
      console.log(`  Records processed: ${reportResult.reportData.length}`);
      console.log(`  Processing time: ${reportResult.metadata.processingTimeMs}ms`);
      console.log(`  Columns: ${Object.keys(reportResult.reportData[0] || {}).join(", ")}`);
    } else {
      console.log("✗ Report generation failed:", reportResult.errors.join(", "));
    }
    
  } catch (error) {
    console.log("✗ End-to-end test failed:", error.message);
  }
}
```

## Validation Checklist

After running the tests above, verify:

### ✅ Expression System
- [ ] Simple expressions evaluate correctly (record.field access)
- [ ] Built-in functions work (calculateHours, upper, formatDate)
- [ ] Static values work ("Active", 123, true)
- [ ] Error handling graceful for invalid expressions
- [ ] Context variables properly isolated

### ✅ Configuration Parsing
- [ ] Backward compatibility with simple column names
- [ ] Expression format "Name:expression" parsed correctly
- [ ] Mixed simple/expression formats work
- [ ] Invalid configurations properly rejected
- [ ] Error messages clear and actionable

### ✅ Output Structure
- [ ] Single sheet mode works (default behavior)
- [ ] Multi-sheet planning calculates groups correctly
- [ ] File naming patterns apply properly
- [ ] Group limits enforced
- [ ] Empty data handled gracefully

### ✅ Integration
- [ ] Enhanced configurations save/load correctly
- [ ] Report generation produces expected columns
- [ ] Performance acceptable for typical datasets
- [ ] UI functions work with new configuration format
- [ ] Error reporting clear to end users

## Performance Verification

Run these performance tests with larger datasets:

```javascript
function testPerformance() {
  const startTime = Date.now();
  
  // Generate test data (1000 records)
  const testData = [];
  for (let i = 0; i < 1000; i++) {
    testData.push({
      member: `User ${i % 10}`,
      project: `Project ${i % 5}`,
      date: "2025-10-27",
      from_time: "09:00",
      to_time: "17:00"
    });
  }
  
  // Test expression evaluation performance
  const context = {
    record: testData[0],
    calculateHours: function(start, end) { return 8; }
  };
  
  const expressionStartTime = Date.now();
  for (let i = 0; i < 1000; i++) {
    evaluateExpression("calculateHours(record.from_time, record.to_time)", context);
  }
  const expressionTime = Date.now() - expressionStartTime;
  
  console.log(`Expression evaluation: ${expressionTime}ms for 1000 calls (${expressionTime/1000}ms per call)`);
  console.log(`Target: <5ms per call - ${expressionTime/1000 < 5 ? '✓ PASS' : '✗ FAIL'}`);
  
  const totalTime = Date.now() - startTime;
  console.log(`Total test time: ${totalTime}ms`);
}
```

## Troubleshooting

### Common Issues

**Expression Evaluation Errors**:
- Check that all referenced functions are registered
- Verify record field names match aggregated data structure
- Ensure expressions don't use unsupported JavaScript features

**Configuration Parsing Issues**:
- Verify column header format matches expected pattern
- Check for special characters in expressions
- Ensure proper comma separation between columns

**Performance Problems**:
- Reduce expression complexity for large datasets
- Consider caching compiled expressions
- Monitor Google Apps Script execution time limits

### Debug Functions

```javascript
function debugConfiguration() {
  const configResult = readReportConfigurations();
  console.log("Configuration result:", JSON.stringify(configResult, null, 2));
}

function debugExpressionContext(expression) {
  // Test with sample context
  const context = {
    record: { member: "Test", from_time: "09:00", to_time: "17:00" },
    calculateHours: function(s, e) { return 8; }
  };
  
  try {
    const result = evaluateExpression(expression, context);
    console.log(`Expression "${expression}" = ${result}`);
  } catch (error) {
    console.log(`Expression "${expression}" failed: ${error.message}`);
  }
}
```

## Next Steps

Once quickstart testing is complete:

1. **Create Production Configurations**: Replace test configuration with real report definitions
2. **Train Users**: Provide documentation on expression syntax and examples  
3. **Monitor Performance**: Track report generation times and optimize as needed
4. **Gather Feedback**: Collect user feedback on configuration complexity and ease of use
5. **Extend Functions**: Add more built-in transformation functions based on user needs

**Success Criteria**: All tests pass, performance within targets, users can create custom reports without code changes.
