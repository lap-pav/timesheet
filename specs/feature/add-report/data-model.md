# Data Model: AI-Powered Report Generation

## Core Entities

### NaturalLanguageRequest
Represents user's textual description of desired report functionality.

**Fields**:
- `text`: String - Raw natural language input from user
- `timestamp`: Date - When request was made
- `userId`: String - User identifier (if available)
- `sessionId`: String - Unique session identifier for tracking

**Validation Rules**:
- `text` must be non-empty, max 1000 characters
- `text` must contain some report-related keywords
- `timestamp` automatically set to current time

**State Transitions**:
- Created → Processing → (Success/Failed)

### AIServiceRequest
Structured request sent to AI service with context and examples.

**Fields**:
- `service`: String - "gemini" or "claude" 
- `prompt`: String - Complete prompt with context and examples
- `naturalLanguageInput`: String - Original user input
- `contextHash`: String - Hash of context for caching
- `requestId`: String - Unique request identifier

**Validation Rules**:
- `service` must be "gemini" or "claude"
- `prompt` must include required context sections
- `contextHash` used for cache lookup

### AIServiceResponse
Raw response from AI service before processing.

**Fields**:
- `service`: String - Which service provided response
- `rawResponse`: String - Complete response from AI
- `confidence`: Number - Confidence score if provided
- `alternatives`: Array - Alternative suggestions if provided
- `requestId`: String - Matching request identifier
- `responseTime`: Number - Time taken in milliseconds

**Validation Rules**:
- `rawResponse` must be parseable JSON or structured text
- `confidence` between 0.0 and 1.0 if present
- `responseTime` positive integer

### AIGeneratedConfig
Parsed and structured configuration from AI response.

**Fields**:
- `reportName`: String - Generated report name
- `description`: String - Generated description
- `columns`: String - Column expressions in correct format
- `filters`: String - Filter expressions (optional)
- `sortBy`: String - Sort column name (optional)
- `sortOrder`: String - "ASC" or "DESC" (optional)  
- `summaryType`: String - "NONE", "MEMBER_TOTALS", "DAILY_TOTALS", "PROJECT_TOTALS"
- `enabled`: Boolean - Always TRUE for new reports
- `outputStructure`: String - "SINGLE_SHEET", "SHEET_PER_PROJECT", etc.
- `groupingField`: String - Field name for grouping (optional)
- `generatedBy`: String - AI service that generated it
- `sourceRequest`: String - Original natural language input

**Validation Rules**:
- `reportName` required, max 50 characters, must be unique
- `description` required, max 200 characters
- `columns` required, must follow expression format
- `summaryType` must be one of valid enum values
- `outputStructure` must be one of valid enum values
- `sortOrder` must be "ASC" or "DESC" if `sortBy` specified

### ReportConfiguration
Final validated configuration ready for storage in Report Configs Sheet.

**Fields** (matches Report Configs Sheet columns):
- `reportName`: String - Column A
- `description`: String - Column B  
- `columns`: String - Column C (expressions)
- `filters`: String - Column D (optional)
- `sortBy`: String - Column E (optional)
- `sortOrder`: String - Column F (optional)
- `summaryType`: String - Column G
- `enabled`: Boolean - Column H (TRUE)
- `outputStructure`: String - Column I
- `groupingField`: String - Column J (optional)

**Validation Rules**:
- All fields must pass Report Configs Sheet validation
- Column expressions must reference valid field names
- Functions must exist in expression library
- Filter syntax must be valid
- No duplicate report names in sheet

### ValidationResult
Result of semantic validation process.

**Fields**:
- `isValid`: Boolean - Overall validation result
- `errors`: Array - List of validation error messages
- `warnings`: Array - List of validation warnings
- `fieldErrors`: Object - Field-specific error details
- `suggestions`: Array - Suggested corrections

**Validation Rules**:
- `errors` array must be empty for `isValid` = true
- `fieldErrors` keys must match ReportConfiguration fields
- `suggestions` should provide actionable corrections

### CacheEntry
Cached AI response for performance optimization.

**Fields**:
- `key`: String - Hash of natural language input
- `configuration`: AIGeneratedConfig - Cached configuration
- `timestamp`: Date - When cached
- `hitCount`: Number - Number of times accessed
- `service`: String - AI service that generated it

**Validation Rules**:
- `key` must be valid hash string
- `timestamp` used for cache expiration (24 hour TTL)
- `hitCount` incremented on each access

## Data Relationships

### Request Flow
```
NaturalLanguageRequest 
  → AIServiceRequest 
    → AIServiceResponse 
      → AIGeneratedConfig 
        → ValidationResult 
          → ReportConfiguration
```

### Caching Flow  
```
NaturalLanguageRequest 
  → (check cache) CacheEntry 
    → (if hit) ReportConfiguration
    → (if miss) AIServiceRequest → ...
```

## Field Mappings

### Internal to Display Names
Based on REPORT_CONFIGS_EXAMPLES.md field mapping:

| Display Name | Internal Field Name | Expression Usage |
|--------------|-------------------|-------------------|
| Member Name | member | `record.member` |
| Date | date | `record.date` |
| Start Time | from_time | `record.from_time` |
| End Time | to_time | `record.to_time` |
| Project Name | project | `record.project` |
| Task Type | task_type | `record.task_type` |
| Task Description | description | `record.description` |

### Expression Functions
Available functions for column expressions:
- `calculateHours(timeIn, timeOut)` - Calculate duration
- `formatDate(date)` - Format dates as ISO string
- `getDayOfWeek(date)` - Get day name  
- `getMonthName(date)` - Get month name
- `defaultValue(value, fallback)` - Use fallback if empty
- `stringContains(text, substring)` - Text contains check
- `upper(text)`, `lower(text)` - Case conversion
- `concat(...)` - Concatenate with spaces

### Output Structure Options
- `SINGLE_SHEET` - All data in one sheet
- `SHEET_PER_PROJECT` - Separate sheet per project
- `SHEET_PER_EMPLOYEE` - Separate sheet per employee  
- `FILE_PER_PROJECT` - Separate file per project
- `FILE_PER_EMPLOYEE` - Separate file per employee

### Summary Type Options
- `NONE` - Individual entries
- `MEMBER_TOTALS` - Grouped by member
- `DAILY_TOTALS` - Grouped by date
- `PROJECT_TOTALS` - Grouped by project
