# timesheet Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-07

## Active Technologies
- JavaScript (Google Apps Script ES5/ES6 subset) + Google Workspace APIs (minimal external dependencies per constitution) (test)
- JavaScript ES5/ES6 subset (Google Apps Script runtime) + Google Workspace APIs (SpreadsheetApp, DriveApp), minimal external dependencies per constitution (feature/enhance-configuration)
- Google Sheets (configuration), Google Drive (report output files) (feature/enhance-configuration)
- JavaScript ES5/ES6 subset (Google Apps Script runtime) + Google Workspace APIs (SpreadsheetApp, DriveApp), Gemini AI API, Claude AI API (feature/add-report)
- Google Sheets (Report Configs Sheet), Google Apps Script Properties Service (encrypted API keys), local cache (feature/add-report)

## Project Structure
```
src/
tests/
```

## Commands
npm test [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] npm run lint

## Code Style
JavaScript (Google Apps Script ES5/ES6 subset): Follow standard conventions

## Recent Changes
- feature/add-report: Added JavaScript ES5/ES6 subset (Google Apps Script runtime) + Google Workspace APIs (SpreadsheetApp, DriveApp), Gemini AI API, Claude AI API
- feature/enhance-configuration: Added JavaScript ES5/ES6 subset (Google Apps Script runtime) + Google Workspace APIs (SpreadsheetApp, DriveApp), minimal external dependencies per constitution
- test: Added JavaScript (Google Apps Script ES5/ES6 subset) + Google Workspace APIs (minimal external dependencies per constitution)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
