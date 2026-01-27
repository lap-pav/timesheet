# Tasks: Timesheet Aggregation and Data Normalization

**Input**: Design documents from `/specs/feature/aggregate-timesheet/`
**Prerequisites**: plan.md (✅), research.md (✅), data-model.md (✅), contracts/ (✅)

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✅ COMPLETE - Google Apps Script implementation plan loaded
2. Load optional design documents:
   ✅ data-model.md: Entities extracted → 4 core entities identified
   ✅ contracts/: 2 contract files → 2 contract test tasks
   ✅ research.md: Technology decisions → setup tasks
   ✅ quickstart.md: Implementation approach → task priorities
3. Generate tasks by category:
   ✅ Setup: Google Apps Script project, testing environment, linting
   ✅ Tests: Contract tests for main functions, integration scenarios
   ✅ Core: Data models, validation functions, aggregation workflow
   ✅ Integration: Google Drive/Sheets API integration, error handling
   ✅ Polish: Unit tests, performance optimization, documentation
4. Apply task rules:
   ✅ Different functions = mark [P] for parallel
   ✅ Same file (script/Code.gs) = sequential for core functions
   ✅ Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   ✅ All contracts have tests
   ✅ All entities have implementation tasks
   ✅ All functions have validation
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Google Apps Script**: `script/Code.gs` for main implementation
- **Testing**: `tests/` for local JavaScript unit tests
- **Documentation**: `docs/` for deployment and API reference
- All code must be compatible with Google Apps Script runtime environment

## Phase 3.1: Setup
- [x] T001 Create Google Apps Script project structure in script/ directory with Code.gs file
- [x] T002 Set up local development environment with Node.js and Jest for testing Google Apps Script functions
- [x] T003 [P] Configure ESLint rules compatible with Google Apps Script JavaScript subset
- [x] T004 [P] Create deployment documentation in docs/deployment.md for Google Apps Script editor
- [x] T005 [P] Set up test data structure with sample monthly folder and timesheet files

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [x] T006 [P] Contract test for aggregateMonthlyTimesheets function in tests/contract/test_main_aggregation.js
- [x] T007 [P] Contract test for validateTimesheetEntry function in tests/contract/test_data_validation.js
- [x] T008 [P] Integration test for complete aggregation workflow in tests/integration/test_full_workflow.js
- [x] T009 [P] Integration test for error handling scenarios in tests/integration/test_error_handling.js
- [x] T010 [P] Integration test for large dataset processing in tests/integration/test_performance.js

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [x] T011 [P] Constants and configuration section at top of script/Code.gs
- [x] T012 Month folder discovery function getMonthlyFolder(yearMonth) in script/Code.gs
- [x] T013 Timesheet file enumeration function getTimesheetFiles(folder) in script/Code.gs
- [x] T014 File reading function readTimesheetData(file) in script/Code.gs
- [x] T015 Entry validation function validateTimesheetEntry(entry, memberName) in script/Code.gs
- [x] T016 Entry normalization function normalizeTimesheetEntry(entry, memberName) in script/Code.gs
- [x] T017 File processing function processTimesheetFile(file) in script/Code.gs
- [x] T018 Main aggregation function aggregateMonthlyTimesheets(monthFolder) in script/Code.gs

## Phase 3.4: Integration
- [x] T019 Google Drive API integration with proper error handling in script/Code.gs
- [x] T020 Google Sheets API integration with column detection in script/Code.gs
- [x] T021 Comprehensive error logging and reporting system in script/Code.gs
- [x] T022 Progress tracking for long-running operations in script/Code.gs
- [x] T023 Memory management and batch processing optimization in script/Code.gs
- [x] T032 Add menu item for aggregateMonthlyTimesheets in onOpen function in script/Code.gs

## Phase 3.5: Polish
- [x] T024 [P] Unit tests for time standardization utilities in tests/unit/test_time_utils.js
- [x] T025 [P] Unit tests for date normalization functions in tests/unit/test_date_utils.js
- [x] T026 [P] Unit tests for validation rule enforcement in tests/unit/test_validation_rules.js
- [x] T027 [P] Performance testing with 20,000 entry dataset in tests/performance/test_scale.js
- [x] T028 [P] Update docs/api-reference.md with function documentation
- [x] T029 [P] Create Google Apps Script deployment guide in docs/deployment.md
- [x] T030 Code review for Google Apps Script best practices and constitution compliance
- [x] T031 End-to-end testing with real Google Drive data

## Dependencies
- Setup (T001-T005) before everything else
- Tests (T006-T010) before implementation (T011-T018)
- T011 (Constants) before all other implementation tasks
- T012-T016 (Core functions) before T017-T018 (Integration functions)
- T017 (File processing) requires T012-T016 (individual functions)
- T018 (Main aggregation) requires T017 (file processing)
- Implementation (T011-T018) before integration (T019-T023, T032)
- T032 (Menu integration) requires T018 (aggregateMonthlyTimesheets function)
- Integration (T019-T023, T032) before polish (T024-T031)

## Parallel Execution Examples

### Phase 3.1 (Setup) - Parallel Tasks
```bash
# Launch T003-T005 together:
Task: "Configure ESLint rules compatible with Google Apps Script JavaScript subset"
Task: "Create deployment documentation in docs/deployment.md for Google Apps Script editor"  
Task: "Set up test data structure with sample monthly folder and timesheet files"
```

### Phase 3.2 (Contract Tests) - All Parallel
```bash
# Launch T006-T010 together:
Task: "Contract test for aggregateMonthlyTimesheets function in tests/contract/test_main_aggregation.js"
Task: "Contract test for validateTimesheetEntry function in tests/contract/test_data_validation.js"
Task: "Integration test for complete aggregation workflow in tests/integration/test_full_workflow.js"
Task: "Integration test for error handling scenarios in tests/integration/test_error_handling.js"
Task: "Integration test for large dataset processing in tests/integration/test_performance.js"
```

### Phase 3.3 (Core Functions) - Some Parallel
```bash
# Launch T012-T016 together (after T011 constants):
Task: "Month folder discovery function getMonthlyFolder(yearMonth) in script/Code.gs"
Task: "Timesheet file enumeration function getTimesheetFiles(folder) in script/Code.gs"
Task: "File reading function readTimesheetData(file) in script/Code.gs"
Task: "Entry validation function validateTimesheetEntry(entry, memberName) in script/Code.gs"
Task: "Entry normalization function normalizeTimesheetEntry(entry, memberName) in script/Code.gs"
```

### Phase 3.5 (Polish) - All Parallel
```bash
# Launch T024-T029 together:
Task: "Unit tests for time standardization utilities in tests/unit/test_time_utils.js"
Task: "Unit tests for date normalization functions in tests/unit/test_date_utils.js"
Task: "Unit tests for validation rule enforcement in tests/unit/test_validation_rules.js"
Task: "Performance testing with 20,000 entry dataset in tests/performance/test_scale.js"
Task: "Update docs/api-reference.md with function documentation"
Task: "Create Google Apps Script deployment guide in docs/deployment.md"
```

## Implementation Notes

### Google Apps Script Specific Considerations
- All functions must be declared in global scope in script/Code.gs
- No module imports/exports - use function-based architecture
- Constants declared at file top for easy configuration
- Use Google Apps Script APIs (DriveApp, SpreadsheetApp) directly
- Handle 6-minute execution timeout with progress tracking
- Memory management crucial for large datasets (20,000 entries)
- Menu integration through onOpen() function for user accessibility

### TDD Approach for Google Apps Script
- Write local JavaScript tests with mocked Google APIs
- Use Jest or similar framework for local testing
- Test function contracts and edge cases locally first
- Deploy to Google Apps Script for integration testing
- Iterate based on runtime environment constraints

### User Interface Integration
- Add menu items to existing onOpen() function following established pattern
- Reference existing generateTimesheetFiles implementation for menu structure
- Ensure menu item calls aggregateMonthlyTimesheets function properly
- Provide user feedback through SpreadsheetApp.getUi().alert() for completion status

### Error Handling Strategy
- Graceful degradation - partial results better than failure
- Comprehensive logging for debugging in Google Apps Script console
- User-friendly error messages via SpreadsheetApp.getUi().alert()
- Detailed error reporting in function return values

### Performance Optimization
- Batch Google Drive API calls to reduce latency
- Process files sequentially to manage memory usage
- Implement progress checkpoints for long operations
- Monitor execution time to avoid timeout

## Validation Checklist
- [x] All contract functions have corresponding test tasks
- [x] All data model entities have implementation tasks
- [x] TDD workflow enforced (tests before implementation)
- [x] Google Apps Script constraints addressed in each task
- [x] Error handling included in integration tasks
- [x] Performance considerations addressed
- [x] Documentation tasks included for deployment
- [x] Constitution compliance verified (single-file, function-based)
- [x] User interface integration included (menu for aggregateMonthlyTimesheets)

## Notes
- [P] tasks target different files and can run in parallel
- Sequential tasks in script/Code.gs due to function dependencies
- All tests must fail before implementation begins (strict TDD)
- Commit after each task completion for incremental progress
- Verify Google Apps Script compatibility after each deployment
