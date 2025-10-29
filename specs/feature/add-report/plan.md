
# Implementation Plan: AI-Powered Report Generation

**Branch**: `feature/add-report` | **Date**: 2025-10-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/lap/pav/projects/training/ai/tools/timesheet/specs/feature/add-report/spec.md`

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
Enable business users to create custom timesheet reports through natural language input. System uses Gemini (primary) and Claude (fallback) AI services to automatically generate report configurations in the existing Report Configs Sheet format, with full semantic validation and local caching for performance.

## Technical Context
**Language/Version**: JavaScript ES5/ES6 subset (Google Apps Script runtime)  
**Primary Dependencies**: Google Workspace APIs (SpreadsheetApp, DriveApp), Gemini AI API, Claude AI API  
**Storage**: Google Sheets (Report Configs Sheet), Google Apps Script Properties Service (encrypted API keys), local cache  
**Testing**: Jest framework with Google Apps Script API mocks for UI functions only  
**Target Platform**: Google Apps Script cloud runtime with Google Sheets frontend
**Project Type**: single (Google Apps Script project with integrated sheets)  
**Performance Goals**: <3 seconds for AI response with caching, <1 second for cached results  
**Constraints**: Google Apps Script 6-minute execution limit, AI service rate limits, minimal external dependencies per constitution  
**Scale/Scope**: 10-50 concurrent users, support for complex report configurations with expressions from REPORT_CONFIGS_EXAMPLES.md format

**Additional Context from User**: Generate config by AI with context and examples from REPORT_CONFIGS_EXAMPLES.md so AI can generate exact configuration format including expression-based column transformations, filters, grouping, and output structure options.

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Google Apps Script Structure Compliance
- [x] Code structured for single-file deployment to Google Apps Script
- [x] No external dependencies beyond Google Workspace APIs (Gemini/Claude via HTTP)
- [x] Functions are standalone and self-contained
- [x] Constants declared at top level for easy configuration

### Function-Based Architecture Compliance  
- [x] Features implemented as independent functions with clear naming
- [x] camelCase naming convention followed
- [x] Single responsibility per function
- [x] No complex class hierarchies or unsupported JavaScript features

### Data Flow Clarity
- [x] Read → Process → Output pattern maintained (natural language → AI → validation → storage)
- [x] Consistent variable naming throughout
- [x] Minimal nesting levels
- [x] Explicit and traceable data transformation steps

### Error Handling & Logging
- [x] Try-catch blocks implemented where necessary
- [x] console.log() used for debugging, Logger.log() for production
- [x] Graceful degradation where possible (fallback to Claude, detailed error messages)
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
- Core API functions → implementation tasks [P] (independent functions)
- UI integration → menu setup and dialog handling tasks
- AI service integration → API call and response parsing tasks [P]
- Validation logic → semantic validation and error handling tasks [P]
- Caching system → cache management tasks [P]
- Unit tests → UI function testing tasks (per constitution)
- Integration tests → end-to-end workflow testing tasks

**Ordering Strategy**:
- TDD order: Unit tests for UI functions first
- Foundation order: Constants and utilities → Core functions → UI integration
- Google Apps Script constraints: Single-file deployment preparation
- Mark [P] for parallel execution (independent Google Apps Script functions)

**Specific Task Categories**:
1. **Setup Tasks**: API key management, constants configuration
2. **Core Function Tasks**: AI service calls, response parsing, validation  
3. **UI Integration Tasks**: Menu handlers, dialogs, user feedback
4. **Cache Management Tasks**: PropertiesService integration, cache logic
5. **Testing Tasks**: Jest tests for UI functions, integration scenarios
6. **Documentation Tasks**: Function documentation, deployment guide

**Estimated Output**: 20-25 numbered, ordered tasks in tasks.md focused on Google Apps Script function-based implementation

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No constitutional violations detected - all requirements align with Google Apps Script architecture and constraints*

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md generated
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md generated
- [x] Phase 2: Task planning complete (/plan command - approach described below)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS - All requirements compatible with Google Apps Script
- [x] Post-Design Constitution Check: PASS - Design maintains constitutional compliance
- [x] All NEEDS CLARIFICATION resolved - Clarifications session completed
- [x] Complexity deviations documented - No deviations needed

**Artifacts Generated**:
- [x] research.md - AI service integration and implementation decisions
- [x] data-model.md - Complete entity model and field mappings  
- [x] contracts/ai-report-generation.md - Function contracts and API specifications
- [x] quickstart.md - Implementation guide with code examples
- [x] .github/copilot-instructions.md - Updated agent context

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
