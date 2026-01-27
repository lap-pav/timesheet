# Contract: Expression Evaluation System

**Date**: October 27, 2025  
**Component**: Expression Evaluation Engine  
**Consumer**: Report Configuration Module

## Function Contracts

### parseColumnDefinitions(columnsText: string): ColumnDefinition[]

**Purpose**: Parse column configuration text into structured column definitions

**Input Contract**:
```javascript
{
  "columnsText": "string", // Format: "Name:expression,Name2:expression2" or "SimpleName,SimpleName2"
  "required": true,
  "constraints": {
    "maxLength": 2000,
    "pattern": "comma-separated column definitions"
  }
}
```

**Output Contract**:
```javascript
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "displayName": {"type": "string", "minLength": 1, "maxLength": 50},
      "expression": {"type": "string", "minLength": 1},
      "isCustom": {"type": "boolean"},
      "validated": {"type": "boolean", "default": false},
      "errorMessage": {"type": "string", "nullable": true}
    },
    "required": ["displayName", "expression", "isCustom"]
  },
  "minItems": 1
}
```

**Error Conditions**:
- Empty input → `ValidationError: "Columns text cannot be empty"`
- Invalid format → `ParseError: "Invalid column definition format"`
- Duplicate names → `ValidationError: "Duplicate column name: {name}"`

### evaluateExpression(expression: string, context: ExpressionContext): any

**Purpose**: Safely evaluate transformation expression with provided context

**Input Contract**:
```javascript
{
  "expression": {
    "type": "string",
    "required": true,
    "constraints": {
      "maxLength": 500,
      "pattern": "valid JavaScript expression"
    }
  },
  "context": {
    "type": "object",
    "properties": {
      "record": {"type": "object", "required": true},
      "functions": {"type": "object", "required": true},
      "constants": {"type": "object"},
      "metadata": {"type": "object"}
    },
    "required": ["record", "functions"]
  }
}
```

**Output Contract**:
```javascript
{
  "type": "any", // Expression result can be string, number, boolean, null
  "constraints": {
    "serializable": true, // Must be JSON serializable for spreadsheet output
    "notUndefined": true  // Undefined values converted to empty string
  }
}
```

**Error Conditions**:
- Syntax error → `ExpressionError: "Invalid expression syntax: {details}"`
- Reference error → `ExpressionError: "Unknown variable or function: {name}"`
- Runtime error → `ExpressionError: "Expression execution failed: {details}"`

### validateTransformationExpression(expression: string, availableFunctions: string[]): ValidationResult

**Purpose**: Validate expression syntax and function references without execution

**Input Contract**:
```javascript
{
  "expression": {
    "type": "string",
    "required": true,
    "maxLength": 500
  },
  "availableFunctions": {
    "type": "array",
    "items": {"type": "string"},
    "required": true
  }
}
```

**Output Contract**:
```javascript
{
  "type": "object",
  "properties": {
    "isValid": {"type": "boolean"},
    "errors": {
      "type": "array",
      "items": {"type": "string"}
    },
    "warnings": {
      "type": "array", 
      "items": {"type": "string"}
    },
    "referencedFunctions": {
      "type": "array",
      "items": {"type": "string"}
    },
    "referencedFields": {
      "type": "array",
      "items": {"type": "string"}
    }
  },
  "required": ["isValid", "errors", "warnings"]
}
```

**Error Conditions**:
- Never throws exceptions (all errors captured in result)

## Integration Contracts

### Enhanced Report Configuration Interface

**Configuration Storage Contract**:
```javascript
// Google Sheets row format
{
  "columns": {
    "A": "reportName",        // string, required, unique
    "B": "description",       // string, required
    "C": "columnDefinitions", // string, "Name:expr,Name2:expr2" format
    "D": "filters",           // string, JSON serialized
    "E": "sortBy",           // string, optional
    "F": "sortOrder",        // string, "ASC"|"DESC"
    "G": "summaryType",      // string, enum value
    "H": "enabled",          // string, "TRUE"|"FALSE"
    "I": "outputStructure",  // string, enum value
    "J": "groupingField"     // string, optional
  }
}
```

**Configuration Parsing Contract**:
```javascript
{
  "input": "Google Sheets row array",
  "output": {
    "type": "object",
    "properties": {
      "success": {"type": "boolean"},
      "configuration": {
        "type": "object",
        "properties": {
          "reportName": {"type": "string"},
          "description": {"type": "string"},
          "columnDefinitions": {
            "type": "array",
            "items": {"$ref": "#/definitions/ColumnDefinition"}
          },
          "outputStructure": {"$ref": "#/definitions/OutputStructureConfig"},
          "filters": {"type": "object"},
          "sortBy": {"type": "string"},
          "sortOrder": {"type": "string"},
          "summaryType": {"type": "string"},
          "enabled": {"type": "boolean"}
        }
      },
      "errors": {
        "type": "array",
        "items": {"type": "string"}
      }
    }
  }
}
```

## Performance Contracts

### Expression Compilation Caching

**Cache Interface Contract**:
```javascript
{
  "cacheKey": "string", // expression hash
  "compiledFunction": "Function", // compiled expression
  "expiresAt": "number", // timestamp
  "hitCount": "number", // usage tracking
  "lastUsed": "number" // timestamp
}
```

**Performance Guarantees**:
- Expression compilation: <10ms per expression (cached after first use)
- Expression evaluation: <5ms per record (simple expressions)
- Cache memory usage: <10MB for 1000 unique expressions

### Transformation Processing Contract

**Batch Processing Interface**:
```javascript
{
  "batchSize": {"type": "number", "default": 100},
  "maxBatchTime": {"type": "number", "default": 30000}, // 30 seconds
  "progressCallback": {
    "type": "function",
    "signature": "(processed: number, total: number) => void"
  }
}
```

**Memory Management**:
- Maximum expression context size: 1MB
- Garbage collection triggered every 1000 records
- Memory usage monitoring with degradation warnings

## Error Handling Contracts

### Error Categories and Responses

**Expression Validation Errors** (Config Time):
```javascript
{
  "category": "VALIDATION_ERROR",
  "severity": "ERROR",
  "userMessage": "Clear description for non-technical users",
  "technicalDetails": "Detailed error for debugging",
  "suggestedFix": "Actionable suggestion for user"
}
```

**Expression Runtime Errors** (Report Generation):
```javascript
{
  "category": "RUNTIME_ERROR",
  "severity": "WARNING", // Don't fail entire report
  "fallbackValue": "any", // Value used when expression fails
  "errorMessage": "string", // Added to error log
  "continueProcessing": true // Always continue with other records
}
```

**System Errors** (Infrastructure):
```javascript
{
  "category": "SYSTEM_ERROR",
  "severity": "CRITICAL",
  "action": "ABORT_PROCESSING", // Stop report generation
  "userMessage": "System error occurred. Please try again.",
  "retryable": "boolean"
}
```
