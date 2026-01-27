
# Implementation Plan: Configuration-Driven Report Export

**Branch**: `feature/configuration-export` | **Date**: 2025-10-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/lap/pav/projects/training/ai/tools/timesheet/specs/feature/configuration-export/spec.md`

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
Configuration-driven report export system that takes aggregated timesheet data and generates customizable reports based on user-defined configurations stored in Google Sheets. Users can define new report types by adding configurations to a dedicated sheet, enabling extensible reporting without code changes. Reports are exported as new Google Sheets documents with validation and error handling.

## Technical Context
**Language/Version**: JavaScript (Google Apps Script ES5/ES6 subset)  
**Primary Dependencies**: Google Workspace APIs (SpreadsheetApp, DriveApp)  
**Storage**: Google Sheets (configuration sheet, aggregated data input, generated report output)  
**Testing**: Jest framework with Google Apps Script API mocks for UI functions only  
**Target Platform**: Google Apps Script runtime environment  
**Project Type**: single (Google Apps Script add-on)  
**Performance Goals**: Report generation completed within 5 minutes maximum  
**Constraints**: Google Apps Script execution time limits, memory constraints, single-file deployment  
**Scale/Scope**: Handle aggregated timesheet data from existing aggregateMonthlyTimesheets function, support multiple configurable report types

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Google Apps Script Structure Compliance
- [x] Code structured for single-file deployment to Google Apps Script
- [x] No external dependencies beyond Google Workspace APIs
- [x] Functions are standalone and self-contained
- [x] Constants declared at top level for easy configuration

### Function-Based Architecture Compliance  
- [x] Features implemented as independent functions with clear naming
- [x] camelCase naming convention followed
- [x] Single responsibility per function
- [x] No complex class hierarchies or unsupported JavaScript features

### Data Flow Clarity
- [x] Read → Process → Output pattern maintained
- [x] Consistent variable naming throughout
- [x] Minimal nesting levels
- [x] Explicit and traceable data transformation steps

### Error Handling & Logging
- [x] Try-catch blocks implemented where necessary
- [x] console.log() used for debugging, Logger.log() for production
- [x] Graceful degradation where possible
- [x] User-facing errors via SpreadsheetApp.getUi().alert()

### Documentation & Comments
- [x] Inline comments explain business logic and Google Apps Script specifics
- [x] Function documentation includes purpose, parameters, return values
- [x] Configuration constants documented with usage examples

### Testing Requirements for UI Functions
- [x] UI-interactive functions (menu handlers, event triggers) have unit tests only
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
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

## Phase 2: Task Generation Approach

**Implementation Strategy**: Focus on UI functions and configuration-driven architecture
- Main UI function: `exportConfigurableReportUI()` - menu handler with user interaction
- Core business logic: Configuration reader, report generator, export manager  
- Testing: Unit tests for UI function only (per constitution requirement)
- Integration: Extend existing Google Apps Script Code.gs file

**Task Categories**:
1. **Setup Tasks**: Configuration sheet template, menu integration
2. **Core Implementation**: Configuration reader, data processor, report builder, export manager
3. **UI Integration**: Menu handler, progress indicators, error dialogs
4. **Testing**: UI function unit tests with Google Apps Script mocks
5. **Documentation**: Deployment guide updates

**Dependencies**: 
- Existing aggregateMonthlyTimesheets() function
- Current Google Apps Script infrastructure
- Google Workspace APIs (SpreadsheetApp, DriveApp)

**Parallel Execution Opportunities**:
- Configuration reader and report generator can be developed independently
- Unit tests can be written alongside UI function development
- Documentation can be updated in parallel with implementation

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
- [x] Complexity deviations documented (none required)

## Generated Artifacts
- ✅ research.md - Technical approach and architecture decisions
- ✅ data-model.md - Entity definitions and relationships
- ✅ contracts/ - Function contracts for core components
  - ✅ configuration-reader.md
  - ✅ report-generator.md
  - ✅ export-manager.md
- ✅ quickstart.md - User setup and usage guide

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
