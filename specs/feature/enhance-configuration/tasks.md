# Tasks: Enhanced Configuration System

**Input**: Design documents from `/specs/feature/enhance-configuration/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: JavaScript ES5/ES6 subset (Google Apps Script runtime)
   → Libraries: Google Workspace APIs (SpreadsheetApp, DriveApp)
   → Structure: Single Google Apps Script project with modular functions
2. Load optional design documents:
   → data-model.md: 5 entities → ColumnDefinition, OutputStructureConfig, TransformationFunction, ExpressionContext, EnhancedReportConfiguration
   → contracts/: 2 files → expression-evaluation.md, output-structure.md
   → research.md: Expression evaluation with Function constructor, output structure management
3. Generate tasks by category:
   → Setup: Google Apps Script structure, testing framework, constants enhancement
   → Tests: contract tests for expression evaluation and output structure
   → Core: expression system, configuration parsing, output structure engine
   → Integration: report generation pipeline, UI enhancements
   → Polish: error handling, performance optimization, documentation
4. Apply task rules:
   → Different files/modules = mark [P] for parallel
   → Same file modifications = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests? ✓
   → All entities have implementation? ✓
   → All user scenarios covered? ✓
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Google Apps Script**: Modular `.ts` files in `script/` directory for development, deployed to single `Code.gs`
- **Testing**: `tests/unit/` for UI function tests using Jest framework  
- **Documentation**: `docs/` for deployment and API reference
- All code must be compatible with Google Apps Script runtime environment

## Phase 3.1: Setup & Infrastructure
- [x] T001 Enhance constants.js with expression system configuration and output structure constants  
- [x] T002 Set up Jest testing framework for UI function testing with Google Apps Script API mocks
- [x] T003 [P] Create transformation function registry structure in constants.js
- [x] T004 [P] Add new configuration columns to REPORT_CONFIG constant (output structure, grouping field)

## Phase 3.2: Contract Tests (UI Functions Only - Focused for Demo)
**CRITICAL: Only UI-interactive functions need tests for rapid development**
- [x] T005 [P] Contract test for parseColumnDefinitions() function in tests/unit/test_configuration_parsing.js ✅
- [x] T006 [P] Contract test for validateTransformationExpression() function in tests/unit/test_expression_validation.js ✅
- [x] T007 [P] Contract test for determineOutputStructure() function in tests/unit/test_output_structure.js ✅
- [x] T008 [P] Contract test for enhanced exportConfigurableReportUI() function in tests/unit/test_ui_functions.js ✅
- [x] T009 [P] Mock Google Apps Script APIs (SpreadsheetApp, DriveApp, Logger) in tests/unit/mocks.js ✅

## Phase 3.3: Core Expression System Implementation
- [x] T010 [P] Implement parseColumnDefinitions() function in report-exporter.js ✅
- [x] T011 [P] Implement evaluateExpression() function with Function constructor in report-exporter.js ✅
- [x] T012 [P] Implement validateTransformationExpression() function in report-exporter.js ✅
- [x] T013 [P] Create built-in transformation functions registry (calculateHours, formatDate, etc.) in constants.js ✅
- [x] T014 Implement expression compilation caching system in report-exporter.js ✅
- [x] T015 Update transformDataColumns() to use expression-based column transformation in report-exporter.js ✅

## Phase 3.4: Output Structure Engine Implementation  
- [x] T016 [P] Implement determineOutputStructure() function in report-exporter.js ✅
- [x] T017 [P] Implement createOutputFiles() function with Google Drive integration in report-exporter.js ✅
- [x] T018 [P] Implement generateFileName() function with pattern substitution in report-exporter.js ✅
- [x] T019 Enhance exportReportToGoogleSheets() to support multi-file/sheet output in report-exporter.js ✅
- [x] T020 Add file organization and folder management using DriveApp in report-exporter.js ✅

## Phase 3.5: Configuration System Enhancement
- [x] T021 Update parseConfigurationRow() to handle expression-based columns in report-exporter.js ✅
- [x] T022 Enhance readReportConfigurations() to support new output structure columns in report-exporter.js ✅
- [x] T023 Implement backward compatibility for legacy column configurations in report-exporter.js ✅
- [x] T024 Add configuration migration utilities for existing reports in report-exporter.js ✅

## Phase 3.6: UI Integration & Error Handling
- [x] T025 Update exportConfigurableReportUI() to use enhanced configuration system in main.js ✅
- [x] T026 Enhance error messages for expression validation in report-exporter.js ✅
- [x] T027 Add user-friendly setup guidance for expression configuration in report-exporter.js ✅
- [x] T028 Implement expression preview/testing functionality for configuration validation in main.js ✅

## Phase 3.7: Integration & Pipeline Enhancement
- [x] T029 Update generateConfigurableReport() to use expression-based transformations in report-exporter.js ✅
- [x] T030 Enhance progress tracking for complex report generation with multiple outputs in main.js ✅
- [x] T031 Add memory management for large dataset processing in report-exporter.js ✅
- [x] T032 Implement graceful degradation for expression evaluation failures in report-exporter.js ✅

## Phase 3.8: Polish & Documentation
- [x] T033 [P] Update REPORT_CONFIGS_EXAMPLES.md with expression-based examples in script/ ✅
- [x] T034 [P] Create expression function documentation with usage examples in docs/ ✅
- [x] T035 [P] Update README.md with enhanced configuration system documentation in script/ ✅
- [x] T036 [P] Performance optimization for expression evaluation and caching in report-exporter.js ✅
- [x] T037 Manual testing checklist for enhanced configuration features in quickstart.md format ✅

## Dependencies

### Critical Path
- T001 (constants) → T003, T004, T013 (configuration setup)
- T002 (testing setup) → T005-T009 (contract tests)
- T005-T009 (contract tests) → T010-T015 (expression system)
- T010-T015 (expression system) → T021-T024 (configuration enhancement)
- T016-T020 (output structure) can run parallel with T021-T024
- T025-T028 (UI integration) requires T021-T024 complete
- T029-T032 (pipeline integration) requires all core systems complete
- T033-T037 (polish) can start after core implementation

### Parallel Groups
**Setup Phase** (can run together):
```
T003: "Create transformation function registry in constants.js"
T004: "Add output structure constants to REPORT_CONFIG in constants.js"  
```

**Contract Testing Phase** (can run together):
```
T005: "Contract test parseColumnDefinitions() in tests/unit/test_configuration_parsing.js"
T006: "Contract test validateTransformationExpression() in tests/unit/test_expression_validation.js"
T007: "Contract test determineOutputStructure() in tests/unit/test_output_structure.js"
T008: "Contract test exportConfigurableReportUI() in tests/unit/test_ui_functions.js"
T009: "Mock Google Apps Script APIs in tests/unit/mocks.js"
```

**Core Implementation Phase** (different functions, can run together):
```
T010: "Implement parseColumnDefinitions() in report-exporter.js"
T011: "Implement evaluateExpression() in report-exporter.js"
T012: "Implement validateTransformationExpression() in report-exporter.js"
T013: "Create transformation functions registry in constants.js"
```

**Output Structure Phase** (different functions, can run together):
```
T016: "Implement determineOutputStructure() in report-exporter.js"
T017: "Implement createOutputFiles() in report-exporter.js"
T018: "Implement generateFileName() in report-exporter.js"
```

**Documentation Phase** (different files, can run together):
```
T033: "Update REPORT_CONFIGS_EXAMPLES.md with expression examples"
T034: "Create expression function documentation in docs/"
T035: "Update README.md with enhanced configuration documentation"
```

## Task Generation Rules Applied

### Contract-Based Tasks
- expression-evaluation.md → T005, T006, T010, T011, T012 (parsing, validation, evaluation)
- output-structure.md → T007, T016, T017, T018 (structure planning, file creation, naming)

### Entity-Based Tasks  
- ColumnDefinition → T010, T021 (parsing and configuration enhancement)
- OutputStructureConfig → T016, T022 (structure planning and configuration)
- TransformationFunction → T013 (function registry implementation)
- ExpressionContext → T011, T014 (evaluation context and caching)
- EnhancedReportConfiguration → T022, T023, T024 (configuration system)

### User Story Integration Tests
- Custom expression configuration → T008, T025, T028 (UI testing and integration)
- Multi-output structure selection → T007, T025 (structure testing and UI)
- Expression validation and preview → T006, T028 (validation testing and preview UI)
- Backward compatibility → T023, T024 (migration and compatibility)

### File Organization
- **Same file tasks**: Sequential (T010-T012, T014-T015, T016-T020, T021-T024, T029-T032)
- **Different file tasks**: Parallel [P] (T003-T004, T005-T009, T033-T035)
- **Independent modules**: Can be developed in parallel (expression system vs output structure)

## Validation Checklist
- [x] All contracts have corresponding tests (T005-T008)
- [x] All entities have implementation tasks (T010-T024)  
- [x] All user scenarios covered by integration tasks (T025-T032)
- [x] UI functions have focused tests only (T008, constitutional compliance)
- [x] Google Apps Script constraints considered (single file deployment, API limits)
- [x] Backward compatibility maintained (T023, T024)
- [x] Performance requirements addressed (T031, T036)
- [x] Documentation and examples provided (T033-T035)

## Notes
- [P] tasks target different files/functions with no shared dependencies
- All tests must fail initially (TDD approach) - implement test assertions first
- Commit after each task completion for incremental progress
- Expression system can be developed independently of output structure system
- Focus on UI function testing only per constitutional requirements for rapid demo readiness
- All code must be Google Apps Script compatible (no external dependencies, function-based architecture)
