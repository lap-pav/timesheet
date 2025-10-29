# AI Report Generation API Contracts

## Main Entry Point Contract

### generateReportFromNaturalLanguage()
**Purpose**: Main UI function called from Google Sheets menu to create report from natural language

**Input Parameters**:
```javascript
// No direct parameters - function prompts user for input
```

**Process Flow**:
1. Display input dialog to collect natural language description
2. Validate and clean user input  
3. Generate report configuration using AI
4. Validate generated configuration
5. Store configuration in Report Configs Sheet
6. Display success/error message to user

**Output**:
```javascript
// No return value - side effects only:
// - New row added to Report Configs Sheet
// - User feedback via UI alert
```

**Error Handling**:
- Empty/invalid input → User prompt for retry
- AI service failure → Try fallback service, then error message
- Validation failure → Show specific errors, allow retry
- Sheet access failure → System error message

---

## Core Processing Contracts

### processNaturalLanguageRequest(userInput)
**Purpose**: Convert natural language to structured AI request

**Input**:
```javascript
{
  userInput: string,        // Raw natural language text
  sessionId?: string        // Optional session identifier  
}
```

**Output**:
```javascript
{
  success: boolean,
  data: {
    processedInput: string,     // Cleaned and validated input
    context: string,            // Full context for AI prompt
    cacheKey: string           // Hash for cache lookup
  },
  error?: string
}
```

**Validation**:
- Input must be non-empty string, max 1000 characters
- Must contain report-related keywords
- Context must include examples and field mappings

---

### callAIService(request, service)
**Purpose**: Make HTTP request to AI service with proper formatting

**Input**:
```javascript
{
  request: {
    prompt: string,           // Complete prompt with context
    naturalInput: string,     // Original user input
    service: "gemini"|"claude" // Target service
  }
}
```

**Output**:
```javascript
{
  success: boolean,
  data: {
    rawResponse: string,      // Complete AI response
    service: string,          // Service that responded
    responseTime: number,     // Milliseconds taken
    confidence?: number       // Confidence score if available
  },
  error?: {
    type: "network"|"auth"|"rate_limit"|"service_error",
    message: string,
    retryable: boolean
  }
}
```

**Error Handling**:
- Network errors → Retry with exponential backoff
- Authentication errors → Check API keys, alert admin
- Rate limiting → Use cache, try fallback service
- Service errors → Parse error response, provide details

---

### parseAIResponse(response)
**Purpose**: Parse AI response into structured configuration

**Input**:
```javascript
{
  rawResponse: string,      // Raw text/JSON from AI
  service: string,          // Which service responded  
  originalRequest: string   // Original natural language
}
```

**Output**:
```javascript
{
  success: boolean,
  data: {
    reportName: string,
    description: string,
    columns: string,          // Expression format
    filters?: string,
    sortBy?: string,
    sortOrder?: "ASC"|"DESC",
    summaryType: "NONE"|"MEMBER_TOTALS"|"DAILY_TOTALS"|"PROJECT_TOTALS",
    outputStructure: string,  // SINGLE_SHEET, etc.
    groupingField?: string
  },
  error?: {
    type: "parse_error"|"missing_fields"|"invalid_format",
    message: string,
    suggestions?: string[]
  }
}
```

**Validation**:
- Response must be parseable structure
- Required fields must be present
- Field values must match expected formats

---

### validateConfiguration(config)
**Purpose**: Perform full semantic validation of generated configuration

**Input**:
```javascript
{
  reportName: string,
  description: string,
  columns: string,
  filters?: string,
  sortBy?: string,
  sortOrder?: string,
  summaryType: string,
  outputStructure: string,
  groupingField?: string
}
```

**Output**:
```javascript
{
  isValid: boolean,
  errors: string[],         // Blocking validation errors
  warnings: string[],       // Non-blocking issues
  fieldErrors: {            // Field-specific errors
    [fieldName]: string[]
  },
  suggestions: string[]     // Suggested corrections
}
```

**Validation Checks**:
- Report name uniqueness in existing configs
- Column expressions syntax and field references
- Function names and parameter counts
- Filter syntax and operators
- Sort column exists in column list
- Output structure and grouping field compatibility

---

### storeConfiguration(config)
**Purpose**: Add validated configuration to Report Configs Sheet

**Input**:
```javascript
{
  reportName: string,
  description: string,
  columns: string,
  filters?: string,
  sortBy?: string,
  sortOrder?: string,
  summaryType: string,
  enabled: boolean,         // Always true for new configs
  outputStructure: string,
  groupingField?: string
}
```

**Output**:
```javascript
{
  success: boolean,
  data: {
    rowNumber: number,      // Sheet row where stored
    configId: string        // Unique identifier if needed
  },
  error?: {
    type: "sheet_access"|"duplicate_name"|"validation_failed",
    message: string
  }
}
```

**Side Effects**:
- New row added to Report Configs Sheet
- Configuration becomes available in export menu

---

## Cache Management Contracts

### getCachedConfiguration(cacheKey)
**Purpose**: Retrieve cached configuration if available

**Input**:
```javascript
{
  cacheKey: string          // Hash of natural language input
}
```

**Output**:
```javascript
{
  found: boolean,
  data?: {
    configuration: object,   // Cached config
    timestamp: Date,        // When cached
    hitCount: number        // Access count
  }
}
```

### setCachedConfiguration(cacheKey, config)
**Purpose**: Store configuration in cache for future use

**Input**:
```javascript
{
  cacheKey: string,
  configuration: object,    // Complete config to cache
  service: string          // AI service that generated it
}
```

**Output**:
```javascript
{
  success: boolean,
  cached: boolean          // Whether actually stored
}
```

---

## Error Recovery Contracts

### handleAIServiceFailure(error, originalRequest)
**Purpose**: Implement fallback strategy when AI service fails

**Input**:
```javascript
{
  error: {
    type: string,
    message: string,
    service: string,        // Failed service
    retryable: boolean
  },
  originalRequest: object   // Original user request
}
```

**Output**:
```javascript
{
  action: "retry"|"fallback"|"fail",
  nextService?: string,     // For fallback
  userMessage: string,      // Message to display
  retryDelay?: number      // Milliseconds to wait
}
```

**Recovery Strategy**:
- Gemini fails → Try Claude
- Both fail → Cache partial results, show error
- Rate limit → Use cache if available
- Network issues → Retry with backoff

---

## UI Integration Contracts

### showReportCreationDialog()
**Purpose**: Display input dialog for natural language report description

**Output**:
```javascript
{
  cancelled: boolean,
  userInput?: string       // Natural language input
}
```

### showValidationErrors(errors)
**Purpose**: Display validation errors to user with retry option

**Input**:
```javascript
{
  errors: string[],
  warnings: string[],
  suggestions: string[]
}
```

### showSuccessMessage(reportName)
**Purpose**: Confirm successful report creation

**Input**:
```javascript
{
  reportName: string,
  message?: string         // Optional additional details
}
```
