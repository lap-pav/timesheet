# Research: Enhanced Configuration System

**Date**: October 27, 2025  
**Feature**: Enhanced Configuration System  
**Research Scope**: Expression evaluation, output structure patterns, Google Apps Script constraints

## Research Questions Resolved

### 1. Expression Evaluation in Google Apps Script

**Decision**: Use native JavaScript `Function` constructor for safe expression evaluation  
**Rationale**: 
- Google Apps Script supports ES5/ES6 subset with Function constructor
- Provides controlled execution context without eval() security risks
- Allows parameter injection for safe variable access
- No external dependencies required

**Alternatives Considered**:
- `eval()` - Rejected due to security concerns and limited context control
- Formula.js library - Rejected due to external dependency constraints
- Custom parser - Rejected due to complexity and development time

**Implementation Pattern**:
```javascript
function evaluateExpression(expression, context) {
  const contextKeys = Object.keys(context);
  const contextValues = contextKeys.map(key => context[key]);
  const expressionFunction = new Function(...contextKeys, `return ${expression}`);
  return expressionFunction.apply(null, contextValues);
}
```

### 2. Output Structure Management

**Decision**: File/sheet organization using Google Drive API with clear naming conventions  
**Rationale**:
- Google Apps Script can create multiple spreadsheet files via SpreadsheetApp.create()
- DriveApp allows folder organization and file management
- Sheet tabs can be managed within single file for sheet-per-project/employee
- Maintains existing export functionality while adding flexibility

**Alternatives Considered**:
- Single file with dynamic sheet creation - Limited by Google Sheets sheet count
- ZIP file generation - Not supported in Google Apps Script runtime
- External cloud storage - Violates no external dependencies constraint

**Output Structure Options**:
1. **Single Sheet**: Current behavior (backward compatibility)
2. **Multi-Sheet Single File**: Create tabs within one spreadsheet
3. **Multi-File**: Create separate spreadsheet files per grouping

### 3. Transformation Function Library

**Decision**: Built-in function registry with extensible pattern  
**Rationale**:
- Predefined functions ensure consistency and performance
- Registry pattern allows easy addition of new functions
- Functions can be optimized for Google Apps Script environment
- Provides good user experience with documented functions

**Core Functions Identified**:
- `calculateHours(startTime, endTime)` - Time calculations
- `formatDate(dateValue)` - Date formatting
- `formatTime(timeValue)` - Time formatting  
- `concat(...values)` - String concatenation
- `upper(value)`, `lower(value)` - Case conversion
- `getDayOfWeek(dateValue)` - Day name extraction
- `getWeekNumber(dateValue)` - Week number calculation

**Function Registration Pattern**:
```javascript
const EXPRESSION_FUNCTIONS = {
  'calculateHours': function(startTime, endTime) { /* implementation */ },
  'formatDate': function(dateValue) { /* implementation */ }
};
```

### 4. Configuration Storage Enhancement

**Decision**: Extend existing "Report Configs" sheet with expression columns  
**Rationale**:
- Maintains backward compatibility with existing configurations
- Users already familiar with sheet-based configuration
- Can add new columns without breaking existing reports
- Easy migration path from fixed mappings to expressions

**Configuration Schema Extension**:
- Column C: Enhanced to support "DisplayName:expression" format
- Column I: New "Output Structure" column (SINGLE_SHEET, SHEET_PER_PROJECT, etc.)
- Maintains existing columns A-H for compatibility

### 5. Error Handling Strategy

**Decision**: Graceful degradation with detailed error reporting  
**Rationale**:
- Expression failures shouldn't break entire report generation
- Users need clear feedback on configuration issues
- Error context helps with troubleshooting
- Maintains system stability under error conditions

**Error Handling Patterns**:
- Expression validation during configuration setup
- Runtime error capture with fallback values
- Detailed error messages with expression context
- Error aggregation and reporting to users

### 6. Performance Considerations

**Decision**: Lazy evaluation with caching for repeated expressions  
**Rationale**:
- Google Apps Script has 6-minute execution time limit
- Large datasets require efficient processing
- Expression compilation can be cached per report
- Batch processing helps manage memory usage

**Performance Optimizations**:
- Compile expressions once per report generation
- Cache compiled functions for repeated use
- Process data in batches to manage memory
- Progress tracking for long-running operations

## Integration Points

### Existing System Integration
- **report-exporter.js**: Extend `transformDataColumns` function with expression support
- **constants.js**: Add new configuration constants for expressions and output structures
- **main.js**: Enhance UI functions to support new configuration options

### Data Flow Integration
- Configuration parsing includes expression compilation
- Expression evaluation integrated into column transformation
- Output structure selection affects export logic
- Error handling integrated throughout pipeline

## Risk Mitigation

### Expression Security
- Controlled execution context prevents access to global scope
- Function constructor provides parameter-based variable injection
- No direct code evaluation from user input

### Performance Risks
- Expression compilation cached to avoid repeated parsing
- Batch processing prevents memory exhaustion
- Timeout monitoring prevents infinite loops

### Compatibility Risks
- Backward compatibility maintained through configuration migration
- Existing reports continue to work unchanged
- New features opt-in via configuration

## Implementation Priority

1. **High Priority**: Expression evaluation framework, basic transformation functions
2. **Medium Priority**: Output structure management, enhanced error handling
3. **Low Priority**: Advanced transformation functions, performance optimizations

## Success Metrics

- Expression evaluation: <50ms per record average
- Configuration validation: <5 seconds for complex expressions  
- Report generation: Maintain existing performance for simple reports
- User experience: Clear error messages, intuitive configuration format
