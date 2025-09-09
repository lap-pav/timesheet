# ⏰ Timesheet Management System

A comprehensive Google Apps Script solution for managing timesheets in Google Sheets. This system provides an intuitive web interface and powerful automation features for tracking work hours, calculating totals, and generating reports.

## 🚀 Features

- **Easy Time Entry**: Simple web interface for adding timesheet entries
- **Automatic Calculations**: Automatically calculates total hours worked including break deductions
- **Smart Validation**: Validates time formats and prevents invalid entries
- **Project Suggestions**: Auto-suggests project names based on work descriptions
- **Monthly Reports**: Generate detailed monthly summaries
- **Email Reports**: Send timesheet reports via email
- **Data Export**: Export timesheet data to CSV format
- **Backup System**: Create backups of your timesheet data
- **Professional UI**: Clean, responsive web interface

## 📋 Setup Instructions

### 1. Create a New Google Sheets Document
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it "My Timesheet" or your preferred name

### 2. Set Up Apps Script
1. In your Google Sheet, go to `Extensions > Apps Script`
2. Delete the default `Code.gs` content
3. Create the following files by clicking the "+" button next to "Files":

#### Files to Create:
- **Code.gs** - Main timesheet functions
- **Utils.gs** - Utility and helper functions  
- **WebApp.gs** - Web application interface handlers
- **Index.html** - Web interface HTML
- **appsscript.json** - Apps Script configuration

4. Copy the content from each file in this repository to the corresponding file in Apps Script

### 3. Configure Permissions
1. Save all files in Apps Script editor
2. Click "Run" on any function to trigger authorization
3. Grant necessary permissions for:
   - Google Sheets access
   - Gmail sending (for email reports)
   - External requests

### 4. Deploy Web App (Optional)
1. Click "Deploy" > "New Deployment"
2. Choose "Web app" as type
3. Set execute as "Me" and access to "Anyone"
4. Click "Deploy" and copy the web app URL

## 🖥️ Usage

### Method 1: Custom Menu (Recommended)
1. Refresh your Google Sheet
2. Look for the "⏰ Timesheet" menu in the menu bar
3. Click "📊 Open Web Interface" to open the timesheet manager

### Method 2: Apps Script Functions
Run these functions directly from the Apps Script editor:
- `initializeTimesheet()` - Set up the spreadsheet headers and formatting
- `openWebInterface()` - Open the web interface in a dialog

### Method 3: Deployed Web App
If you deployed the web app, use the deployment URL to access the interface from any browser.

## 📊 Web Interface Features

### Add Timesheet Entries
- **Date**: Select the work date
- **Start/End Time**: Enter your work hours
- **Break Duration**: Specify break time in minutes
- **Project/Task**: Categorize your work
- **Description**: Add detailed work notes

### Quick Actions
- **Fill Current Time**: Automatically fills current date and time
- **Monthly Summary**: View current month statistics
- **Initialize Sheet**: Set up or reset the spreadsheet

### Monthly Summary
View comprehensive statistics including:
- Total hours worked
- Number of days worked
- Average hours per day

## 🔧 Available Functions

### Core Functions
- `initializeTimesheet()` - Initialize spreadsheet with headers and formatting
- `addTimesheetEntry(date, startTime, endTime, breakDuration, project, description)` - Add new entry
- `calculateTotalHours(startTime, endTime, breakDuration)` - Calculate work hours
- `generateMonthlySummary()` - Generate current month summary

### Utility Functions
- `validateTimesheetEntry(entry)` - Validate entry data
- `createBackup()` - Create spreadsheet backup
- `exportToCSV(startDate, endDate)` - Export data to CSV
- `sendEmailReport(emailAddress, startDate, endDate)` - Send email report
- `suggestProject(description)` - Auto-suggest project names

### Menu Functions
- `onOpen()` - Creates custom menu when spreadsheet opens
- `showMonthlySummaryDialog()` - Display summary in dialog
- `showEmailReportDialog()` - Show email report interface
- `createBackupWithDialog()` - Create backup with confirmation

## 📈 Data Format

The timesheet uses the following column structure:

| Column | Description | Format |
|--------|-------------|---------|
| A | Date | YYYY-MM-DD |
| B | Start Time | HH:MM |
| C | End Time | HH:MM |
| D | Break Duration | Minutes (number) |
| E | Total Hours | Decimal hours |
| F | Project/Task | Text |
| G | Description | Text |
| H | Status | Text (default: "Active") |

## 🔒 Security & Privacy

- All data is stored in your personal Google Sheets
- Email reports use your Gmail account
- No external services or third-party data sharing
- Apps Script runs with your Google account permissions

## 🛠️ Customization

### Time Zone
Update the time zone in `appsscript.json`:
```json
{
  "timeZone": "Your/Timezone"
}
```

### Project Categories
Modify the `suggestProject()` function in `Utils.gs` to add custom project keywords.

### Email Templates
Customize email report content in the `sendEmailReport()` function in `Utils.gs`.

## 🐛 Troubleshooting

### Common Issues

1. **"Authorization required" error**
   - Solution: Run any function and grant necessary permissions

2. **Menu not appearing**
   - Solution: Refresh the spreadsheet or run `onOpen()` manually

3. **Web interface not loading**
   - Solution: Check that all HTML and GS files are saved correctly

4. **Email reports not sending**
   - Solution: Ensure Gmail permissions are granted

### Getting Help
- Check the Apps Script execution log for detailed error messages
- Ensure all files are properly saved in the Apps Script editor
- Verify that permissions are granted for all required services

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues, feature requests, or pull requests.

---

**Happy time tracking! ⏰**