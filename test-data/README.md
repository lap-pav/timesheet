# Test Data Structure

This directory contains sample data for testing the timesheet aggregation functionality.

## Sample Monthly Folder Structure

```
test-data/
├── 2025-09/                     # Monthly folder (YYYY-MM format)
│   ├── Timesheet_2025-09_JohnDoe.json     # Sample timesheet data
│   ├── Timesheet_2025-09_JaneSmith.json   # Sample timesheet data
│   └── Timesheet_2025-09_BobWilson.json   # Sample timesheet data
├── sample-entries.json          # Individual entry examples
└── expected-output.json         # Expected aggregated output format
```

## Data Format Examples

### Individual Timesheet Entry Format
Each timesheet file should contain daily entries with these fields:
- date: Work date
- fromTime: Start time
- toTime: End time
- project: Project name
- taskType: Type of task
- description: Work description
- tcFromTime: Time correction start (optional)
- tcToTime: Time correction end (optional)

### Test Scenarios Covered
- Valid entries with all required fields
- Entries with time corrections
- Invalid entries (missing fields, wrong formats)
- Edge cases (overtime, weekend work)
- Large dataset simulation (performance testing)

## Usage in Tests
These sample files are used by the integration and performance tests to validate the aggregation functionality without requiring access to real Google Drive data during development.
