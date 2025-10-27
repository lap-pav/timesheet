
# Implementation Plan: Enhanced Configuration System

**Branch**: `feature/enhance-configuration` | **Date**: October 27, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/feature/enhance-configuration/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Replace fixed column mapping system with dynamic transformation expressions and add flexible output structure options. Users can define custom data transformations using JavaScript-like expressions and choose how report output is organized (single sheet, by project, by employee, separate files).

## Technical Context
**Language/Version**: JavaScript ES5/ES6 subset (Google Apps Script runtime)  
**Primary Dependencies**: Google Workspace APIs (SpreadsheetApp, DriveApp), minimal external dependencies per constitution  
**Storage**: Google Sheets (configuration), Google Drive (report output files)  
**Testing**: Jest framework for UI function testing, mock Google Apps Script APIs  
**Target Platform**: Google Apps Script runtime environment
**Project Type**: single (Google Apps Script project with modular structure)  
**Performance Goals**: Expression evaluation <50ms per record, report generation <5min for 1000 records  
**Constraints**: Google Apps Script 6-minute execution limit, no external libraries, function-based architecture  
**Scale/Scope**: Support 100+ transformation expressions, handle 10k+ timesheet records, generate reports with multiple output formats

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Google Apps Script Structure Compliance
- [x] Code structured for single-file deployment to Google Apps Script (modular .ts files for development, deployable to single Code.gs)
- [x] No external dependencies beyond Google Workspace APIs (expression evaluation uses native JavaScript)
- [x] Functions are standalone and self-contained (transformation functions independent)
- [x] Constants declared at top level for easy configuration (transformation functions, output structure options)

### Function-Based Architecture Compliance  
- [x] Features implemented as independent functions with clear naming (parseColumnDefinitions, transformDataColumnsWithExpressions, etc.)
- [x] camelCase naming convention followed (evaluateExpression, validateTransformation)
- [x] Single responsibility per function (expression parsing, validation, transformation separate)
- [x] No complex class hierarchies or unsupported JavaScript features (pure function approach)

### Data Flow Clarity
- [x] Read → Process → Output pattern maintained (config → transform → export)
- [x] Consistent variable naming throughout (columnDefinitions, transformedRecord)
- [x] Minimal nesting levels (expression evaluation contained in helper functions)
- [x] Explicit and traceable data transformation steps (each transformation logged)

### Error Handling & Logging
- [x] Try-catch blocks implemented where necessary (expression evaluation, file operations)
- [x] console.log() used for debugging, Logger.log() for production
- [x] Graceful degradation where possible (fallback to empty values for failed expressions)
- [x] User-facing errors via SpreadsheetApp.getUi().alert() (expression validation messages)

### Documentation & Comments
- [x] Inline comments explain business logic and Google Apps Script specifics
- [x] Function documentation includes purpose, parameters, return values
- [x] Configuration constants documented with usage examples (transformation function examples)

### Testing Requirements for UI Functions
- [x] UI-interactive functions (menu handlers, configuration UI) have unit tests only
- [x] Non-UI utility functions exempt from testing for rapid development
- [x] Tests mock Google Apps Script APIs (SpreadsheetApp, DriveApp) using Jest
- [x] Focus on success paths and critical error conditions only

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Google Apps Script Project Structure
script/
├── Code.gs              # Main Google Apps Script file
├── appsscript.json      # Google Apps Script manifest (if needed)
└── README.md            # Deployment instructions

# Local Development Support
tests/
├── unit/                # Local unit tests (JavaScript)
└── integration/         # Integration test scenarios

docs/
├── deployment.md        # Google Apps Script deployment guide
└── api-reference.md     # Function documentation
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh copilot`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Expression evaluation contract → expression engine test tasks [P]
- Output structure contract → output management test tasks [P]
- Data model entities → entity implementation tasks [P]
- UI enhancement tasks for configuration interface
- Integration tasks for enhanced report generation pipeline

**Specific Task Categories**:
1. **Expression System Tasks** (5-7 tasks):
   - Expression parsing and validation functions
   - Built-in transformation function registry
   - Expression evaluation engine with error handling
   - Expression compilation caching system

2. **Configuration Enhancement Tasks** (4-6 tasks):
   - Enhanced configuration parsing for new column format  
   - Backward compatibility layer for existing configurations
   - Configuration validation with expression syntax checking
   - Migration utilities for legacy configurations

3. **Output Structure Tasks** (6-8 tasks):
   - Output planning engine implementation
   - File/sheet creation with naming patterns
   - Google Apps Script integration for multi-file exports
   - Performance optimization for large datasets

4. **UI Integration Tasks** (3-4 tasks):
   - Enhanced configuration interface updates
   - Error message improvements for expression validation
   - User documentation and examples integration
   - Testing interface for expression preview

5. **Testing Tasks** (6-8 tasks):
   - Unit tests for UI functions (menu handlers, configuration dialogs)
   - Integration tests for end-to-end report generation
   - Performance tests for expression evaluation
   - Contract compliance tests for all major interfaces

**Ordering Strategy**:
- **Phase 1**: Core expression system (parsing, validation, evaluation) [P]
- **Phase 2**: Configuration enhancements and backward compatibility [depends on Phase 1]
- **Phase 3**: Output structure implementation [P with Phase 2]
- **Phase 4**: UI integration and error handling [depends on all previous]
- **Phase 5**: Testing and performance optimization [throughout]

**Constitutional Compliance Tasks**:
- Ensure function-based architecture for Google Apps Script compatibility
- Implement proper error handling with UI alerts
- Add comprehensive logging and documentation
- Focus testing on UI-interactive functions only

**Estimated Output**: 24-33 numbered, ordered tasks in tasks.md

**Key Dependencies**:
- Expression evaluation must be complete before configuration parsing
- Configuration parsing must be complete before report generation
- Output structure planning can be developed in parallel with expression system
- UI integration requires all backend components to be functional

**Risk Mitigation Tasks**:
- Early performance testing to ensure Google Apps Script time limits
- Expression security validation to prevent code injection
- Fallback mechanisms for expression evaluation failures
- Memory management for large dataset processing

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none identified)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
