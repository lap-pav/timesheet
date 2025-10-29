# Tasks: AI-Powered Report Generation

**Input**: Design documents from `/Users/lap/pav/projects/training/ai/tools/timesheet/specs/feature/add-report/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: JavaScript ES5/ES6 subset (Google Apps Script runtime)
   → Libraries: Google Workspace APIs, Gemini AI API, Claude AI API
   → Structure: Single Google Apps Script project with integrated sheets
2. Load optional design documents:
   → data-model.md: Extract entities → 7 entity model tasks
   → contracts/: ai-report-generation.md → 8 contract test tasks
   → research.md: Extract decisions → AI integration setup tasks
3. Generate tasks by category:
   → Setup: Google Apps Script project, API keys, dependencies
   → Tests: UI function tests, contract tests, integration tests
   → Core: AI integration, validation, caching, UI handlers
   → Integration: Google Sheets API, Properties Service, error handling
   → Polish: documentation, performance optimization, manual testing
4. Apply task rules:
   → Different functions = mark [P] for parallel
   → Same script/Code.gs file = sequential coordination needed
   → Tests before implementation (TDD for UI functions only)
5. Number tasks sequentially (T001, T002...)
6. Focus on UI-interactive functions for rapid demo development
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different functions, no dependencies)
- Include exact file paths in descriptions
- Focus on UI functions testing per constitution

## Path Conventions
- **Google Apps Script**: `script/main.js` for main implementation (single file deployment)
- **Testing**: `tests/unit/` for Jest-based JavaScript unit tests with GAS API mocks
- **Documentation**: `docs/` for deployment and API reference
- All code must be compatible with Google Apps Script runtime environment

## Phase 3.1: Setup & Configuration
- [x] **T001** Create Google Apps Script project structure in script/ directory with main.js
- [x] **T002** Set up API key configuration constants for Gemini and Claude services
- [x] **T003** [P] Configure Properties Service integration for secure API key storage
- [x] **T004** [P] Set up local Jest testing environment with Google Apps Script API mocks
- [x] **T005** [P] Create deployment documentation in docs/deployment.md for Google Apps Script editor

## Phase 3.2: UI Function Tests (Constitutional Focus)
**CRITICAL: Only UI-interactive functions need tests for rapid development**
- [x] **T006** [P] Unit test for generateReportFromNaturalLanguage() UI function in tests/unit/test_ai_report_ui.js
- [x] **T007** [P] Unit test for showReportCreationDialog() UI function in tests/unit/test_ai_report_ui.js
- [x] **T008** [P] Unit test for showValidationErrors() UI function in tests/unit/test_ai_report_ui.js
- [x] **T009** [P] Unit test for showSuccessMessage() UI function in tests/unit/test_ai_report_ui.js
- [x] **T010** [P] Unit test for onOpen() menu integration in tests/unit/test_ai_report_ui.js
- [x] **T011** [P] Mock Google Apps Script APIs (SpreadsheetApp, PropertiesService, UrlFetchApp) in tests/unit/mocks.js

## Phase 3.3: Contract Tests (TDD for API Functions)
- [x] **T012** [P] Contract test for processNaturalLanguageRequest() in tests/contract/test_request_processing.js
- [x] **T013** [P] Contract test for callAIService() Gemini integration in tests/contract/test_ai_service_gemini.js
- [x] **T014** [P] Contract test for callAIService() Claude integration in tests/contract/test_ai_service_claude.js
- [x] **T015** [P] Contract test for parseAIResponse() in tests/contract/test_response_parsing.js
- [x] **T016** [P] Contract test for validateConfiguration() in tests/contract/test_configuration_validation.js
- [x] **T017** [P] Contract test for storeConfiguration() in tests/contract/test_configuration_storage.js
- [x] **T018** [P] Contract test for cache management functions in tests/contract/test_cache_management.js
- [x] **T019** [P] Contract test for handleAIServiceFailure() in tests/contract/test_error_recovery.js

## Phase 3.4: Core Implementation (After Tests Fail)
- [x] **T020** Implement main entry point generateReportFromNaturalLanguage() in script/main.js
- [x] **T021** Implement processNaturalLanguageRequest() function in script/main.js  
- [x] **T022** Implement buildAIContext() with REPORT_CONFIGS_EXAMPLES.md content in script/main.js
- [x] **T023** Implement buildAIPrompt() for structured AI requests in script/main.js
- [x] **T024** Implement callAIService() with Gemini integration in script/main.js
- [x] **T025** Implement callAIService() Claude fallback logic in script/main.js
- [x] **T026** Implement parseAIResponse() for structured configuration parsing in script/main.js
- [x] **T027** Implement validateConfiguration() with semantic validation in script/main.js

## Phase 3.5: Data Management & Validation
- [x] **T028** Implement field mapping validation against data-model.md entities in script/main.js
- [x] **T029** Implement expression function validation (calculateHours, formatDate, etc.) in script/main.js
- [x] **T030** Implement output structure validation (SINGLE_SHEET, SHEET_PER_PROJECT, etc.) in script/main.js
- [x] **T031** Implement storeConfiguration() for Report Configs Sheet integration in script/main.js
- [x] **T032** Implement duplicate report name detection and handling in script/main.js

## Phase 3.6: Caching & Performance
- [x] **T033** [P] Implement getCachedConfiguration() using Properties Service in script/main.js
- [x] **T034** [P] Implement setCachedConfiguration() with expiration logic in script/main.js
- [x] **T035** [P] Implement clearExpiredCache() for cache maintenance in script/main.js
- [x] **T036** [P] Add cache hit/miss metrics to AI report logging in script/main.js

## Phase 3.7: Error Handling & Recovery
- [x] **T037** Implement handleAIServiceFailure() with fallback strategy in script/main.js
- [x] **T038** Implement network error handling with retry logic in script/main.js
- [x] **T039** Implement rate limiting detection and cache fallback in script/main.js
- [x] **T040** Implement user-friendly error message generation in script/main.js

## Phase 3.8: UI Integration & User Experience
- [x] **T041** Implement showReportCreationDialog() with input validation in script/main.js
- [x] **T042** Implement showValidationErrors() with actionable feedback in script/main.js
- [x] **T043** Implement showSuccessMessage() with report creation confirmation in script/main.js
- [x] **T044** Integrate AI report menu into existing onOpen() function in script/main.js

## Phase 3.9: Integration Tests (End-to-End Scenarios)
- [ ] **T045** [P] Integration test: Simple report generation workflow in tests/integration/test_simple_report.js
- [ ] **T046** [P] Integration test: Complex expression-based report in tests/integration/test_complex_report.js
- [ ] **T047** [P] Integration test: AI service failure and fallback in tests/integration/test_service_fallback.js
- [ ] **T048** [P] Integration test: Cache hit and performance in tests/integration/test_cache_performance.js
- [ ] **T049** [P] Integration test: Validation error handling in tests/integration/test_validation_errors.js

## Phase 3.10: Polish & Documentation
- [ ] **T050** [P] Create comprehensive function documentation with JSDoc comments in script/main.js
- [ ] **T051** [P] Update docs/api-reference.md with AI report generation functions
- [ ] **T052** [P] Performance optimization for large prompt contexts in script/main.js
- [ ] **T053** [P] Remove debugging code and optimize console.log statements
- [ ] **T054** Create manual testing checklist in docs/testing-ai-reports.md
- [ ] **T055** [P] Update REPORT_CONFIGS_EXAMPLES.md with AI-generated examples
- [ ] **T056** Create troubleshooting guide for common AI generation issues

## Dependencies

### Critical Path Dependencies
- **Setup → Tests → Implementation → Integration**
- T001-T005 (Setup) before all other phases
- T006-T011 (UI Tests) before T020 (Main Implementation)
- T012-T019 (Contract Tests) before T021-T027 (Core Implementation)
- T020-T044 (Implementation) before T045-T049 (Integration Tests)
- T045-T049 (Integration) before T050-T056 (Polish)

### Specific Blocking Dependencies
- T002 (API Config) blocks T003 (Properties Service)
- T004 (Jest Setup) blocks T006-T011 (All Tests)
- T011 (Mocks) blocks all contract tests T012-T019
- T020 (Main Entry) blocks T021-T027 (Core Functions)
- T022 (AI Context) blocks T023 (AI Prompt) blocks T024-T025 (AI Service)
- T026 (Parse Response) blocks T027 (Validation)
- T031 (Store Config) blocks T032 (Duplicate Detection)

### Same File Coordination (script/main.js)
**Note**: Tasks T020-T044 all modify script/main.js and must be coordinated sequentially within logical groups, but different logical groups can proceed in parallel once their dependencies are met.

## Parallel Execution Examples

### Phase 3.2: UI Tests (All Parallel)
```bash
# Launch T006-T010 together:
Task: "Unit test for generateReportFromNaturalLanguage() UI function in tests/unit/test_ai_report_ui.js"
Task: "Unit test for showReportCreationDialog() UI function in tests/unit/test_ai_report_ui.js"
Task: "Unit test for showValidationErrors() UI function in tests/unit/test_ai_report_ui.js"
Task: "Unit test for showSuccessMessage() UI function in tests/unit/test_ai_report_ui.js"
Task: "Unit test for onOpen() menu integration in tests/unit/test_ai_report_ui.js"
```

### Phase 3.3: Contract Tests (All Parallel)
```bash
# Launch T012-T019 together:
Task: "Contract test for processNaturalLanguageRequest() in tests/contract/test_request_processing.js"
Task: "Contract test for callAIService() Gemini integration in tests/contract/test_ai_service_gemini.js"
Task: "Contract test for callAIService() Claude integration in tests/contract/test_ai_service_claude.js"
Task: "Contract test for parseAIResponse() in tests/contract/test_response_parsing.js"
```

### Phase 3.6: Caching (Functions T033-T035 Parallel)
```bash
# Launch caching functions together:
Task: "Implement getCachedConfiguration() using Properties Service in script/main.js"
Task: "Implement setCachedConfiguration() with TTL management in script/main.js"  
Task: "Implement cache key generation using MD5 hashing in script/main.js"
```

### Phase 3.9: Integration Tests (All Parallel)
```bash
# Launch T045-T049 together:
Task: "Integration test: Simple report generation workflow in tests/integration/test_simple_report.js"
Task: "Integration test: Complex expression-based report in tests/integration/test_complex_report.js"
Task: "Integration test: AI service failure and fallback in tests/integration/test_service_fallback.js"
```

## Validation Checklist
*GATE: Checked before task execution*

- [x] All contracts have corresponding tests (T012-T019 cover all contracts)
- [x] All entities have implementation tasks (T028-T031 cover data model entities)
- [x] All UI tests come before implementation (T006-T011 before T020-T044)
- [x] Parallel tasks truly independent (different files or different logical functions)
- [x] Each task specifies exact file path (script/main.js, tests/unit/, tests/contract/, etc.)
- [x] No task modifies same file section as another [P] task (coordinated via dependencies)
- [x] Constitutional focus on UI function testing only (T006-T011)
- [x] Google Apps Script single-file deployment compatibility maintained

## Notes
- **[P] tasks** = different files or independent functions, no dependencies
- **Verify tests fail** before implementing (TDD approach for UI functions)
- **Commit after each task** to track progress
- **Focus on UI functions** per constitutional requirements for rapid demo development
- **Single script/main.js file** coordination required for implementation tasks
- **Google Apps Script compatibility** maintained throughout all tasks
