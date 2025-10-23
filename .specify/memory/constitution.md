<!--
Sync Impact Report:
Version change: 1.0.0 → 1.1.0 (added UI testing principle for rapid development)
Added sections: Testing Requirements for UI Functions
Modified principles: None renamed
Templates requiring updates: ✅ updated plan-template.md, ✅ updated tasks-template.md
Follow-up TODOs: Create unit tests for UI-interactive functions only
-->

# Timesheet Constitution

## Core Principles

### I. Google Apps Script Structure (NON-NEGOTIABLE)
All code MUST be structured for seamless Google Apps Script deployment. Functions must be standalone and self-contained. No external dependencies beyond Google Workspace APIs. Single-file architecture preferred with clear function separation. Constants declared at top level for easy configuration.

**Rationale**: Google Apps Script has specific constraints - no module system, limited runtime environment, and deployment requires copy-paste friendly code structure.

### II. Function-Based Architecture
Each feature MUST be implemented as independent functions with clear naming conventions. Functions should follow Google Apps Script patterns (camelCase, descriptive names). Global constants for configuration at file top. No complex class hierarchies or advanced JavaScript features that may not be supported.

**Rationale**: Google Apps Script runtime is limited and function-based architecture ensures compatibility and maintainability.

### III. Clear Data Flow
Data processing MUST follow readable patterns: read → process → output. Use consistent variable naming. Minimize nesting levels. Each function should have single responsibility. Data transformation steps should be explicit and traceable.

**Rationale**: Debugging in Google Apps Script environment is limited, so code clarity is essential for maintenance.

### IV. Error Handling & Logging
All functions MUST include appropriate error handling using try-catch blocks where necessary. Use console.log() for debugging and Logger.log() for production logging. Graceful degradation when possible. User-facing error messages through SpreadsheetApp.getUi().alert().

**Rationale**: Google Apps Script error reporting is basic, so proactive error handling and logging are critical.

### V. Documentation & Comments
Code MUST include inline comments explaining business logic and Google Apps Script specific implementations. Function documentation with purpose, parameters, and return values. Configuration constants must be documented with usage examples.

**Rationale**: Google Apps Script code is often maintained by different team members with varying technical backgrounds.

### VI. Testing Requirements for UI Functions
Only UI-interactive functions (menu handlers, event triggers, user-facing operations) MUST have unit tests for rapid development and demo readiness. Non-UI utility functions are exempt to prioritize feature implementation speed. Tests must mock Google Apps Script APIs (SpreadsheetApp, DriveApp) using Jest framework. Focus on success paths and critical error conditions only.

**Rationale**: Demo timelines require focused testing strategy. UI functions represent the primary user interaction points and need reliability assurance, while utility function testing can be deferred for rapid prototype delivery.

## Code Organization

Code structure MUST follow this pattern:
- Constants and configuration at top
- Utility functions grouped logically  
- Main workflow functions
- Google Apps Script event handlers (onOpen, onEdit, etc.)
- Helper functions at bottom

File organization: Single Code.gs file for core functionality, separate files only when Google Apps Script project structure requires it.

## Development Workflow

Local development MUST maintain compatibility with Google Apps Script editor. Code should be copy-paste ready without modification. Testing can be done locally but deployment verification MUST be done in Google Apps Script environment. Version control of .gs files with clear commit messages.

## Governance

This constitution supersedes all other development practices. All code changes MUST comply with Google Apps Script structure requirements. Amendments require documentation of Google Apps Script compatibility impact. Use this constitution for all implementation decisions.

**Version**: 1.1.0 | **Ratified**: 2025-10-06 | **Last Amended**: 2025-10-24