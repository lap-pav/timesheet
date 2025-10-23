# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
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
- **Testing**: `tests/` for local JavaScript unit tests
- **Documentation**: `docs/` for deployment and API reference
- All code must be compatible with Google Apps Script runtime environment

## Phase 3.1: Setup
- [ ] T001 Create Google Apps Script project structure in script/ directory
- [ ] T002 Set up local development environment with JavaScript testing framework
- [ ] T003 [P] Configure Google Apps Script compatible code formatting and linting
- [ ] T004 [P] Create deployment documentation for Google Apps Script editor

## Phase 3.2: UI Function Tests Only (Focused for Demo)
**CRITICAL: Only UI-interactive functions need tests for rapid development**
- [ ] T005 [P] Unit test for generateTimesheetFiles() function in tests/unit/test_ui_functions.js
- [ ] T006 [P] Unit test for aggregateMonthlyTimesheetsUI() function in tests/unit/test_ui_functions.js  
- [ ] T007 [P] Unit test for onOpen() menu creation in tests/unit/test_ui_functions.js
- [ ] T008 [P] Mock Google Apps Script APIs (SpreadsheetApp, DriveApp) for testing

## Phase 3.3: Core Implementation (ONLY after UI tests are failing)
- [ ] T009 [P] Main aggregation logic in script/Code.gs
- [ ] T010 [P] Data processing functions in script/Code.gs
- [ ] T011 [P] UI menu handlers in script/Code.gs
- [ ] T012 Error handling for user operations
- [ ] T013 Input validation for spreadsheet data
- [ ] T014 User feedback via SpreadsheetApp.getUi().alert()

## Phase 3.4: Integration (Google Apps Script Specific)
- [ ] T015 Google Sheets API integration
- [ ] T016 Google Drive API integration  
- [ ] T017 Progress tracking for long operations
- [ ] T018 Memory management for large datasets

## Phase 3.5: Polish (Demo Ready)
- [ ] T019 [P] Enhanced error messages for users
- [ ] T020 Performance optimization for batch processing
- [ ] T021 [P] Update docs/deployment.md for Google Apps Script
- [ ] T022 Remove debugging code and console.log statements
- [ ] T023 Manual testing checklist for Google Apps Script environment

## Dependencies
- Tests (T004-T007) before implementation (T008-T014)
- T008 blocks T009, T015
- T016 blocks T018
- Implementation before polish (T019-T023)

## Parallel Example
```
# Launch T004-T007 together:
Task: "Contract test POST /api/users in tests/contract/test_users_post.py"
Task: "Contract test GET /api/users/{id} in tests/contract/test_users_get.py"
Task: "Integration test registration in tests/integration/test_registration.py"
Task: "Integration test auth in tests/integration/test_auth.py"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Avoid: vague tasks, same file conflicts

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each contract file → contract test task [P]
   - Each endpoint → implementation task
   
2. **From Data Model**:
   - Each entity → model creation task [P]
   - Relationships → service layer tasks
   
3. **From User Stories**:
   - Each story → integration test [P]
   - Quickstart scenarios → validation tasks

4. **Ordering**:
   - Setup → Tests → Models → Services → Endpoints → Polish
   - Dependencies block parallel execution

## Validation Checklist
*GATE: Checked by main() before returning*

- [ ] All contracts have corresponding tests
- [ ] All entities have model tasks
- [ ] All tests come before implementation
- [ ] Parallel tasks truly independent
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task