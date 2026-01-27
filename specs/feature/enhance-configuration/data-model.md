# Data Model: Enhanced Configuration System

**Date**: October 27, 2025  
**Feature**: Enhanced Configuration System  
**Source**: Extracted from feature specification and research findings

## Core Entities

### ColumnDefinition
**Purpose**: Represents a user-defined column with transformation expression

**Fields**:
- `displayName` (string, required): User-friendly column name displayed in reports
- `expression` (string, required): JavaScript expression for data transformation
- `isCustom` (boolean): True if user-defined expression, false if default mapping
- `validated` (boolean): True if expression passed validation
- `errorMessage` (string, optional): Validation error details if applicable

**Validation Rules**:
- Display name must be 1-50 characters
- Expression must be valid JavaScript syntax
- Expression can only reference allowed context variables
- No malicious code patterns (eval, Function constructor calls by user)

**State Transitions**:
- Created → Validating → Valid/Invalid
- Valid → Compiled (during report generation)

**Example**:
```javascript
{
  displayName: "Hours Worked",
  expression: "calculateHours(record.from_time, record.to_time)",
  isCustom: true,
  validated: true,
  errorMessage: null
}
```

### OutputStructureConfig
**Purpose**: Defines how report data is organized in output files/sheets

**Fields**:
- `type` (enum, required): Output organization type
  - `SINGLE_SHEET`: All data in one sheet (default)
  - `SHEET_PER_PROJECT`: Separate sheet for each project
  - `SHEET_PER_EMPLOYEE`: Separate sheet for each employee
  - `FILE_PER_PROJECT`: Separate file for each project
  - `FILE_PER_EMPLOYEE`: Separate file for each employee
- `groupingField` (string, conditional): Field used for grouping (required for multi-sheet/file)
- `namingPattern` (string): Template for sheet/file names
- `maxGroupsLimit` (integer): Maximum number of groups allowed (default: 50)

**Validation Rules**:
- Type must be valid enum value
- Grouping field required for multi-sheet/file options
- Naming pattern must be valid template string
- Max groups limit between 1-100

**Example**:
```javascript
{
  type: "SHEET_PER_PROJECT",
  groupingField: "project",
  namingPattern: "Project_{groupValue}_{timestamp}",
  maxGroupsLimit: 25
}
```

### TransformationFunction
**Purpose**: Built-in functions available in expressions

**Fields**:
- `name` (string, required): Function name used in expressions
- `signature` (string, required): Function signature for documentation
- `description` (string, required): User-friendly description
- `implementation` (function, required): JavaScript function implementation
- `category` (string): Function category (time, text, date, etc.)

**Validation Rules**:
- Name must be valid JavaScript identifier
- Implementation must be pure function (no side effects)
- Must handle null/undefined inputs gracefully

**Example**:
```javascript
{
  name: "calculateHours",
  signature: "calculateHours(startTime, endTime)",
  description: "Calculate hours between start and end time",
  implementation: function(startTime, endTime) { /* ... */ },
  category: "time"
}
```

### ExpressionContext
**Purpose**: Runtime context available to expressions during evaluation

**Fields**:
- `record` (object, required): Current timesheet record being processed
- `functions` (object, required): Available transformation functions
- `constants` (object, optional): System constants accessible to expressions
- `metadata` (object, optional): Processing metadata (row index, file info)

**Validation Rules**:
- Record must contain all expected timesheet fields
- Functions object must contain all registered transformation functions
- Context is read-only during expression evaluation

**Example**:
```javascript
{
  record: {
    member: "John Doe",
    date: "2025-10-27",
    from_time: "09:00",
    to_time: "17:00",
    project: "Project Alpha"
  },
  functions: { calculateHours: Function, formatDate: Function },
  constants: { COMPANY_NAME: "Acme Corp" },
  metadata: { rowIndex: 5, fileName: "John_Timesheet.json" }
}
```

### EnhancedReportConfiguration
**Purpose**: Extended report configuration including expressions and output structure

**Fields**:
- `reportName` (string, required): Unique report identifier
- `description` (string, required): Report description
- `columnDefinitions` (array<ColumnDefinition>, required): Column definitions with expressions
- `outputStructure` (OutputStructureConfig, required): Output organization settings
- `filters` (object, optional): Data filtering criteria
- `sortBy` (string, optional): Column to sort by
- `sortOrder` (enum, optional): ASC/DESC
- `summaryType` (enum, optional): Aggregation type
- `enabled` (boolean, required): Whether configuration is active
- `version` (integer): Configuration version for migration
- `createdAt` (datetime): Creation timestamp
- `updatedAt` (datetime): Last modification timestamp

**Relationships**:
- Contains multiple ColumnDefinition entities
- Contains one OutputStructureConfig entity
- References transformation functions by name

**Validation Rules**:
- Report name must be unique within configuration sheet
- At least one column definition required
- All referenced transformation functions must exist
- Output structure type must be compatible with data

## Entity Relationships

```
EnhancedReportConfiguration (1) —— (many) ColumnDefinition
EnhancedReportConfiguration (1) —— (1) OutputStructureConfig
ColumnDefinition (many) —— (many) TransformationFunction [references by name]
ExpressionContext (1) —— (many) TransformationFunction [runtime composition]
```

## Data Storage Mapping

### Google Sheets Storage
**Report Configs Sheet Structure**:
- Column A: Report Name → `reportName`
- Column B: Description → `description`
- Column C: Columns → `columnDefinitions` (serialized as "Name:expression,Name2:expression2")
- Column D: Filters → `filters` (serialized as JSON)
- Column E: Sort By → `sortBy`
- Column F: Sort Order → `sortOrder`
- Column G: Summary Type → `summaryType`
- Column H: Enabled → `enabled`
- Column I: Output Structure → `outputStructure.type`
- Column J: Grouping Field → `outputStructure.groupingField`

### Memory Storage
**Runtime Object Cache**:
- Compiled expressions cached per report generation
- Transformation functions loaded once at startup
- Configuration objects cached until sheet modification

## Migration Strategy

### Backward Compatibility
- Existing configurations without expressions use default mappings
- Simple column names automatically mapped to default expressions
- Version field tracks configuration format

### Migration Path
1. Detect legacy configuration (no version field)
2. Convert simple column names to default expressions
3. Set default output structure to SINGLE_SHEET
4. Mark as migrated with version = 1

**Example Migration**:
```javascript
// Legacy: "Member Name,Hours,Project Name"
// Migrated: "Member Name:record.member,Hours:calculateHours(record.from_time,record.to_time),Project Name:record.project"
```

## Validation Framework

### Expression Validation
- Syntax validation using try-catch with Function constructor
- Context variable validation (ensure referenced fields exist)
- Function availability validation (ensure called functions are registered)
- Security validation (prevent dangerous patterns)

### Configuration Validation
- Required field validation
- Data type validation
- Business rule validation (unique names, valid enums)
- Cross-field validation (grouping field exists when needed)

### Runtime Validation
- Expression execution error handling
- Data type conversion for output
- Graceful degradation for invalid expressions
