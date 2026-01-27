# Contract: Output Structure Management

**Date**: October 27, 2025  
**Component**: Output Structure Engine  
**Consumer**: Report Export Module

## Function Contracts

### determineOutputStructure(configuration: OutputStructureConfig, data: Array): OutputPlan

**Purpose**: Analyze data and create execution plan for output structure

**Input Contract**:
```javascript
{
  "configuration": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "enum": ["SINGLE_SHEET", "SHEET_PER_PROJECT", "SHEET_PER_EMPLOYEE", "FILE_PER_PROJECT", "FILE_PER_EMPLOYEE"]
      },
      "groupingField": {"type": "string"},
      "namingPattern": {"type": "string"},
      "maxGroupsLimit": {"type": "number", "default": 50}
    },
    "required": ["type"]
  },
  "data": {
    "type": "array",
    "items": {"type": "object"},
    "minItems": 1
  }
}
```

**Output Contract**:
```javascript
{
  "type": "object",
  "properties": {
    "strategy": {
      "type": "string",
      "enum": ["SINGLE_FILE_SINGLE_SHEET", "SINGLE_FILE_MULTI_SHEET", "MULTI_FILE"]
    },
    "groups": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "groupKey": {"type": "string"},
          "displayName": {"type": "string"},
          "fileName": {"type": "string"},
          "sheetName": {"type": "string"},
          "data": {"type": "array"},
          "recordCount": {"type": "number"}
        }
      }
    },
    "totalFiles": {"type": "number"},
    "totalSheets": {"type": "number"},
    "estimatedSize": {"type": "string"} // "Small", "Medium", "Large"
  },
  "required": ["strategy", "groups", "totalFiles", "totalSheets"]
}
```

**Error Conditions**:
- Too many groups → `ValidationError: "Group count {count} exceeds limit {limit}"`
- Missing grouping field → `ValidationError: "Grouping field '{field}' not found in data"`
- Empty groups → `ValidationError: "No data found for output structure"`

### createOutputFiles(outputPlan: OutputPlan): ExportResult

**Purpose**: Execute the output plan and create actual files/sheets

**Input Contract**:
```javascript
{
  "outputPlan": {
    "type": "object",
    "$ref": "#/contracts/OutputPlan"
  }
}
```

**Output Contract**:
```javascript
{
  "type": "object",
  "properties": {
    "success": {"type": "boolean"},
    "files": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "fileName": {"type": "string"},
          "fileId": {"type": "string"}, // Google Drive file ID
          "fileUrl": {"type": "string"}, // Shareable URL
          "sheets": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "sheetName": {"type": "string"},
                "recordCount": {"type": "number"},
                "columns": {"type": "array", "items": {"type": "string"}}
              }
            }
          }
        }
      }
    },
    "summary": {
      "type": "object",
      "properties": {
        "totalFiles": {"type": "number"},
        "totalSheets": {"type": "number"},
        "totalRecords": {"type": "number"},
        "processingTimeMs": {"type": "number"}
      }
    },
    "errors": {
      "type": "array",
      "items": {"type": "string"}
    }
  },
  "required": ["success", "files", "summary", "errors"]
}
```

**Error Conditions**:
- Google Drive quota exceeded → `QuotaError: "Drive storage limit reached"`
- File creation failure → `FileError: "Failed to create file: {reason}"`
- Sheet limit exceeded → `SheetError: "Cannot create more than 200 sheets per file"`

### generateFileName(pattern: string, context: FileNamingContext): string

**Purpose**: Generate file names using naming pattern and context data

**Input Contract**:
```javascript
{
  "pattern": {
    "type": "string",
    "required": true,
    "constraints": {
      "maxLength": 100,
      "allowedTokens": ["{groupValue}", "{timestamp}", "{reportName}", "{recordCount}"]
    }
  },
  "context": {
    "type": "object",
    "properties": {
      "groupValue": {"type": "string"},
      "timestamp": {"type": "string"},
      "reportName": {"type": "string"},
      "recordCount": {"type": "number"},
      "dateGenerated": {"type": "string"}
    },
    "required": ["reportName"]
  }
}
```

**Output Contract**:
```javascript
{
  "type": "string",
  "constraints": {
    "maxLength": 100,
    "pattern": "valid filename (no special characters)",
    "uniqueness": "guaranteed within generation session"
  }
}
```

**Error Conditions**:
- Invalid pattern token → `ValidationError: "Unknown token {token} in pattern"`
- Filename too long → `ValidationError: "Generated filename exceeds 100 characters"`
- Invalid characters → `ValidationError: "Filename contains invalid characters"`

## Google Apps Script Integration Contracts

### SpreadsheetApp Integration

**File Creation Contract**:
```javascript
{
  "function": "SpreadsheetApp.create(name)",
  "input": {
    "name": {"type": "string", "maxLength": 100}
  },
  "output": {
    "type": "Spreadsheet",
    "properties": {
      "getId()": {"type": "string"},
      "getUrl()": {"type": "string"},
      "getActiveSheet()": {"type": "Sheet"}
    }
  },
  "limitations": {
    "maxSheetsPerFile": 200,
    "maxCellsPerSheet": 5000000,
    "maxColumnsPerSheet": 18278
  }
}
```

**Sheet Management Contract**:
```javascript
{
  "function": "spreadsheet.insertSheet(name)",
  "input": {
    "name": {"type": "string", "maxLength": 100, "unique": true}
  },
  "output": {
    "type": "Sheet",
    "properties": {
      "getName()": {"type": "string"},
      "getRange(row, col, numRows, numCols)": {"type": "Range"}
    }
  },
  "errorHandling": {
    "duplicateName": "Append counter to make unique",
    "sheetLimit": "Use file-per-group strategy instead"
  }
}
```

### DriveApp Integration

**File Organization Contract**:
```javascript
{
  "function": "DriveApp.createFolder(name)",
  "input": {
    "name": {"type": "string", "maxLength": 100}
  },
  "output": {
    "type": "Folder",
    "properties": {
      "getId()": {"type": "string"},
      "addFile(file)": {"type": "File"}
    }
  },
  "folderStructure": {
    "root": "Report Outputs",
    "pattern": "{reportName}_{timestamp}",
    "cleanup": "Keep last 50 report folders"
  }
}
```

## Performance Contracts

### Batch Processing Limits

**Google Apps Script Constraints**:
```javascript
{
  "executionTimeout": 360000, // 6 minutes maximum
  "memoryLimit": "100MB approximate",
  "apiCallLimits": {
    "driveApiCalls": 1000, // per execution
    "sheetsApiCalls": 100  // per minute
  }
}
```

**Performance Guarantees**:
```javascript
{
  "fileCreation": "<30 seconds per file",
  "sheetPopulation": "<2 seconds per 1000 records",
  "totalProcessing": "<5 minutes for 10k records",
  "memoryUsage": "<50MB for typical datasets"
}
```

### Scalability Contracts

**Data Size Limits**:
```javascript
{
  "maxRecordsPerReport": 50000,
  "maxGroupsPerReport": 100,
  "maxFilesPerExecution": 50,
  "maxSheetsPerFile": 200,
  "recommendedBatchSize": 1000
}
```

**Degradation Strategy**:
```javascript
{
  "exceedsGroupLimit": "Switch to single file with warning",
  "exceedsTimeLimit": "Process in chunks with progress tracking",
  "exceedsMemoryLimit": "Enable garbage collection, reduce batch size"
}
```

## Error Recovery Contracts

### Partial Failure Handling

**File Creation Failures**:
```javascript
{
  "strategy": "CONTINUE_WITH_REMAINING",
  "fallback": "Combine failed groups into single sheet",
  "reporting": "List failed groups in summary",
  "retryLogic": "No retries (time constraint)"
}
```

**Data Processing Failures**:
```javascript
{
  "strategy": "SKIP_INVALID_RECORDS",
  "fallback": "Log error and continue processing",
  "reporting": "Include error count in summary",
  "validation": "Pre-validate data structure before processing"
}
```

### User Notification Contract

**Success Notification**:
```javascript
{
  "message": "Report generated successfully: {fileCount} files, {recordCount} records",
  "details": "Links to generated files",
  "timing": "Processing completed in {seconds} seconds"
}
```

**Failure Notification**:
```javascript
{
  "message": "Report generation completed with issues",
  "details": "List of errors and successful parts",
  "recovery": "Suggest alternative output structure if applicable"
}
```
