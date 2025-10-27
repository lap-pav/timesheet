# Expression Functions Documentation

**Version**: Enhanced Configuration System v1.0  
**Date**: October 27, 2025  
**System**: Google Apps Script Timesheet Application

## Overview

The enhanced configuration system provides powerful expression-based column transformations using JavaScript-like syntax. These expressions allow you to perform calculations, format data, and create dynamic columns without modifying the core application code.

## Security & Safety

- **Secure Execution**: All expressions run in a restricted sandbox environment
- **Input Validation**: Comprehensive validation prevents malicious code execution
- **Error Handling**: Failed expressions display helpful error messages instead of breaking reports
- **Performance**: Expression caching ensures fast execution for repeated operations

## Built-in Transformation Functions

### Time & Duration Functions

#### `calculateHours(timeIn, timeOut)`
**Purpose**: Calculate duration between two time values  
**Parameters**:
- `timeIn` (string): Start time in HH:MM format
- `timeOut` (string): End time in HH:MM format
**Returns**: Number of hours as decimal (e.g., 8.5 for 8 hours 30 minutes)  
**Examples**:
```javascript
calculateHours("09:00", "17:30")  // Returns: 8.5
calculateHours("08:15", "12:00")  // Returns: 3.75
calculateHours("23:00", "07:00")  // Returns: 8 (handles overnight)
```

#### `formatTime(minutes)`
**Purpose**: Format minutes as HH:MM time string  
**Parameters**:
- `minutes` (number): Minutes to format
**Returns**: Time string in HH:MM format  
**Examples**:
```javascript
formatTime(510)  // Returns: "08:30"
formatTime(90)   // Returns: "01:30"
formatTime(0)    // Returns: "00:00"
```

### Date Functions

#### `formatDate(date, format)`
**Purpose**: Format date values for display  
**Parameters**:
- `date` (string|Date): Date to format
- `format` (string, optional): Format pattern (defaults to locale format)
**Returns**: Formatted date string  
**Examples**:
```javascript
formatDate("2025-10-27")                    // Returns: "10/27/2025"
formatDate("2025-10-27", "YYYY-MM-DD")     // Returns: "2025-10-27"
formatDate("2025-10-27", "DD/MM/YYYY")     // Returns: "27/10/2025"
```

#### `getDayOfWeek(date)`
**Purpose**: Get the day name for a date  
**Parameters**:
- `date` (string|Date): Date to analyze
**Returns**: Day name (Monday, Tuesday, etc.)  
**Examples**:
```javascript
getDayOfWeek("2025-10-27")  // Returns: "Sunday"
getDayOfWeek("2025-10-28")  // Returns: "Monday"
```

#### `getMonthName(date)`
**Purpose**: Get the month name for a date  
**Parameters**:
- `date` (string|Date): Date to analyze
**Returns**: Month name (January, February, etc.)  
**Examples**:
```javascript
getMonthName("2025-10-27")  // Returns: "October"
getMonthName("2025-01-15")  // Returns: "January"
```

#### `addDays(date, days)`
**Purpose**: Add or subtract days from a date  
**Parameters**:
- `date` (string|Date): Starting date
- `days` (number): Days to add (positive) or subtract (negative)
**Returns**: New Date object  
**Examples**:
```javascript
addDays("2025-10-27", 7)   // Returns: Date for 2025-11-03
addDays("2025-10-27", -3)  // Returns: Date for 2025-10-24
```

### Text Functions

#### `stringContains(text, substring)`
**Purpose**: Check if text contains a specific substring  
**Parameters**:
- `text` (string): Text to search in
- `substring` (string): Text to search for
**Returns**: Boolean (true if found, false if not)  
**Examples**:
```javascript
stringContains("Development Project", "Development")  // Returns: true
stringContains("Marketing Task", "Development")       // Returns: false
stringContains("project management", "Project")       // Returns: true (case-insensitive)
```

### Utility Functions

#### `defaultValue(value, fallback)`
**Purpose**: Provide fallback value for empty or null data  
**Parameters**:
- `value` (any): Primary value to check
- `fallback` (any): Value to use if primary is empty/null
**Returns**: Primary value if valid, otherwise fallback  
**Examples**:
```javascript
defaultValue("", "No data")           // Returns: "No data"
defaultValue(null, "Unknown")         // Returns: "Unknown"
defaultValue("John Doe", "No name")   // Returns: "John Doe"
defaultValue(0, "No hours")           // Returns: 0 (zero is valid)
```

## Expression Syntax

### Basic Syntax
- **Simple Fields**: Use column name directly: `Member Name`
- **Expressions**: Use format: `Display Name:expression`
- **Function Calls**: Use parentheses: `calculateHours(Time In, Time Out)`
- **Field References**: Reference other columns: `record["Field Name"]`

### Complex Examples

#### Multi-Function Expressions
```javascript
// Calculate overtime (hours over 8)
"Overtime:defaultValue(calculateHours(Time In,Time Out)-8,0)"

// Create descriptive text
"Work Description:Member Name + ' worked on ' + Project Name + ' on ' + getDayOfWeek(Date)"

// Conditional formatting
"Status:stringContains(Project Name,'Development') ? 'Dev Work' : 'Other'"
```

#### Date Arithmetic
```javascript
// Future deadline (7 days from task date)
"Deadline:formatDate(addDays(Date,7))"

// Work week analysis
"Week Info:getDayOfWeek(Date) + ' of ' + getMonthName(Date)"
```

## Usage in Report Configurations

### Column Definition Format
In your Report Config sheet, use this format for the Columns field:
```
DisplayName1:expression1,DisplayName2:expression2,SimpleField,DisplayName3:expression3
```

### Real Examples
```
Member Name,Calculated Hours:calculateHours(Time In,Time Out),Day:getDayOfWeek(Date)
Project Name,Hours:calculateHours(Time In,Time Out),Status:defaultValue(Status,Active)
Date,Work Day:getDayOfWeek(Date),Hours:defaultValue(calculateHours(Time In,Time Out),0)
```

## Error Handling

### Common Errors and Solutions

#### "Expression contains restricted pattern"
**Cause**: Expression contains potentially unsafe code  
**Solution**: Use only built-in functions and field references

#### "Syntax error: Unexpected token"
**Cause**: Invalid JavaScript syntax in expression  
**Solution**: Check parentheses, commas, and quotes

#### "Expression evaluation failed"
**Cause**: Runtime error (e.g., invalid time format)  
**Solution**: Use `defaultValue()` for robust error handling

### Best Practices

1. **Test Expressions**: Start with simple expressions and build complexity gradually
2. **Use Default Values**: Always provide fallbacks for potentially empty data
3. **Validate Input**: Check your source data format matches function expectations
4. **Keep It Simple**: Complex expressions are harder to debug and maintain
5. **Document Usage**: Add descriptions to your report configurations

## Performance Considerations

- **Expression Caching**: Compiled expressions are cached for better performance
- **Large Datasets**: For 1000+ records, prefer simple expressions
- **Function Calls**: Built-in functions are optimized for performance
- **Complex Logic**: Break complex expressions into multiple columns if needed

## Integration with Output Structures

Expressions work seamlessly with all output structure options:
- **SINGLE_SHEET**: All expressions evaluated in one sheet
- **SHEET_PER_PROJECT**: Expressions evaluated per project group
- **FILE_PER_EMPLOYEE**: Expressions evaluated per employee file
- **Multi-file outputs**: Each file gets its own expression evaluation

## Migration from Legacy

Existing configurations are automatically migrated:
- Simple column names become: `record["Column Name"]`
- All existing reports continue to work
- Enhanced features available by updating column definitions
- No data loss or downtime during migration

## Support and Debugging

### Enable Debug Logging
Add this to your expressions for debugging:
```javascript
// Log intermediate values
"Debug Hours:console.log('Hours:', calculateHours(Time In,Time Out)) || calculateHours(Time In,Time Out)"
```

### Validation Tool
Use the UI validation to test expressions before saving configurations.

### Common Patterns
```javascript
// Safe hour calculation with fallback
"Hours:defaultValue(calculateHours(Time In,Time Out),0)"

// Formatted date with fallback
"Date Display:formatDate(defaultValue(Date,new Date()))"

// Text search with default
"Project Type:stringContains(Project Name,'Dev') ? 'Development' : 'Other'"
```

## Version History

- **v1.0** (October 2025): Initial release with 8 built-in functions
- Expression system with security validation
- Multi-output structure support
- Automatic migration for legacy configurations
