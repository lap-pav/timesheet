# Tasks: Configuration-Driven Report Export

**Input**: Design documents from `/Users/lap/pav/projects/training/ai/tools/timesheet/specs/feature/configuration-export/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Google Apps Script**: `script/Code.gs` for main implementation
- **Testing**: `tests/unit/` for local JavaScript unit tests
- **Documentation**: `docs/` for deployment and API reference
- All code must be compatible with Google Apps Script runtime environment

## Phase 3.1: Setup
- [x] T001 Add configuration export constants to script/Code.gs (REPORT_CONFIG_SHEET_NAME, etc.)
- [x] T002 [P] Set up Jest testing environment for configuration export UI functions in tests/unit/test_configuration_export_ui.js
- [x] T003 [P] Create Google Apps Script API mocks for configuration export testing
- [x] T004 [P] Update deployment documentation in docs/deployment.md for configuration export feature

## Phase 3.2: UI Function Tests Only (Focused for Demo)
**CRITICAL: Only UI-interactive functions need tests for rapid development**
- [x] T005 [P] Unit test for exportConfigurableReportUI() function in tests/unit/test_configuration_export_ui.js
- [x] T006 [P] Unit test for selectReportConfigurationUI() dialog function in tests/unit/test_configuration_export_ui.js
- [x] T007 [P] Unit test for onOpen() menu addition for export function in tests/unit/test_configuration_export_ui.js
- [x] T008 [P] Mock SpreadsheetApp.getUi() and progress dialog interactions for testing

## Phase 3.3: Core Implementation (ONLY after UI tests are failing)
- [x] T009 Implement readReportConfigurations() function in script/Code.gs according to configuration-reader.md contract
- [x] T010 Implement generateConfigurableReport() function in script/Code.gs according to report-generator.md contract
- [x] T011 Implement exportReportToGoogleSheets() function in script/Code.gs according to export-manager.md contract
- [x] T012 Implement exportConfigurableReportUI() main UI handler function in script/Code.gs
- [x] T013 Add "Export Configurable Report" menu item to onOpen() function in script/Code.gs
- [x] T014 Implement configuration validation logic with user-friendly error messages in script/Code.gs

## Phase 3.4: Integration (Google Apps Script Specific)
- [x] T015 Integrate configuration reader with "Report Configs" sheet using SpreadsheetApp.getSheetByName()
- [x] T016 Integrate report export with Google Drive folder detection using DriveApp APIs
- [x] T017 Add progress tracking with SpreadsheetApp.getUi().alert() for operations longer than 30 seconds
- [x] T018 Implement memory management and batch processing for large datasets in report generation

## Phase 3.5: Polish (Demo Ready)
- [x] T019 [P] Add comprehensive error handling with specific user messages for common configuration errors
- [x] T020 Optimize performance with chunked data processing and minimal Google Apps Script API calls
- [x] T021 [P] Update docs/api-reference.md with configuration export function documentation
- [x] T022 Remove debugging console.log() statements and add production Logger.log() calls
- [x] T023 Create manual testing checklist in docs/testing-configuration-export.md

## Dependencies

### Critical Path
```
T001 (constants) → T009,T010,T011 (core functions) → T012,T013 (UI integration) → T015,T016,T017,T018 (Google APIs)
```

### Testing Path
```
T002,T003 (test setup) → T005,T006,T007,T008 (UI tests) → T009,T010,T011 (implementation to make tests pass)
```

### Parallel Opportunities
- **Setup Phase**: T002, T003, T004 can run in parallel
- **Testing Phase**: T005, T006, T007, T008 can run in parallel (all in different test files or test suites)
- **Polish Phase**: T019, T021, T023 can run in parallel (different files)

## Parallel Execution Examples

### Phase 3.1 Parallel Tasks
```bash
# All setup tasks can run simultaneously
Task T002: Set up Jest configuration export testing
Task T003: Create Google Apps Script mocks
Task T004: Update deployment documentation
```

### Phase 3.2 Parallel Tasks
```bash
# UI test tasks can run in parallel as they test different functions
Task T005: Test exportConfigurableReportUI() 
Task T006: Test selectReportConfigurationUI()
Task T007: Test onOpen() menu integration
Task T008: Mock SpreadsheetApp.getUi()
```

### Phase 3.5 Parallel Tasks
```bash
# Polish tasks in different files
Task T019: Error handling improvements
Task T021: API documentation updates  
Task T023: Manual testing checklist
```

## Validation Checklist
- [x] All contracts have corresponding implementation tasks: T009 (config reader), T010 (report generator), T011 (export manager)
- [x] All UI functions have unit tests: T005 (main UI), T006 (dialog), T007 (menu)
- [x] Core entities covered: Report Configuration (T009), Report Data (T010), Export Job (T011)
- [x] Google Apps Script integration: T015 (Sheets), T016 (Drive), T017 (UI), T018 (performance)
- [x] Documentation and polish: T021 (docs), T022 (cleanup), T023 (testing)

## Implementation Notes
- Focus on UI function testing only per constitutional requirements
- All core functions in single script/Code.gs file for Google Apps Script deployment
- Configuration-driven approach allows adding new report types without code changes
- Error handling prioritized for user experience in Google Apps Script environment
- Performance optimized for Google Apps Script 6-minute execution limit
