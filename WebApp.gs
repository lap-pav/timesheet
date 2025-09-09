/**
 * Web App functions for serving the timesheet interface
 */

/**
 * Serve the main timesheet interface
 * @return {HtmlOutput} The HTML interface
 */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setTitle('Timesheet Manager');
}

/**
 * Include external files in HTML templates
 * @param {string} filename - Name of the file to include
 * @return {string} File content
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Handle menu creation when spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('⏰ Timesheet')
    .addItem('📊 Open Web Interface', 'openWebInterface')
    .addItem('🔧 Initialize Timesheet', 'initializeTimesheet')
    .addSeparator()
    .addItem('📈 Monthly Summary', 'showMonthlySummaryDialog')
    .addItem('📧 Email Report', 'showEmailReportDialog')
    .addSeparator()
    .addItem('💾 Create Backup', 'createBackupWithDialog')
    .addItem('📤 Export to CSV', 'exportToCSVDialog')
    .addToUi();
}

/**
 * Open the web interface in a dialog
 */
function openWebInterface() {
  const html = HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setWidth(850)
    .setHeight(700);
    
  SpreadsheetApp.getUi().showModalDialog(html, 'Timesheet Manager');
}

/**
 * Show monthly summary in a dialog
 */
function showMonthlySummaryDialog() {
  try {
    const summary = generateMonthlySummary();
    
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>📊 Monthly Summary - ${summary.month}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Total Hours</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${summary.totalHours}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Days Worked</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${summary.daysWorked}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Average Hours/Day</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${summary.averageHoursPerDay}</td>
          </tr>
        </table>
        <br>
        <button onclick="google.script.host.close()" style="background-color: #4285f4; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
    `;
    
    const htmlOutput = HtmlService.createHtmlOutput(html)
      .setWidth(400)
      .setHeight(250);
      
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Monthly Summary');
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error', `Failed to generate summary: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Show email report dialog
 */
function showEmailReportDialog() {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h3>📧 Send Email Report</h3>
      <form>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Email Address:</label>
          <input type="email" id="emailAddress" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" required>
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Start Date:</label>
          <input type="date" id="startDate" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" required>
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">End Date:</label>
          <input type="date" id="endDate" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" required>
        </div>
        <button type="button" onclick="sendReport()" style="background-color: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Send Report</button>
        <button type="button" onclick="google.script.host.close()" style="background-color: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
      </form>
    </div>
    
    <script>
      // Set default dates (current month)
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      document.getElementById('startDate').value = firstDay.toISOString().split('T')[0];
      document.getElementById('endDate').value = lastDay.toISOString().split('T')[0];
      
      function sendReport() {
        const email = document.getElementById('emailAddress').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (!email || !startDate || !endDate) {
          alert('Please fill in all fields');
          return;
        }
        
        google.script.run
          .withSuccessHandler(() => {
            alert('Report sent successfully!');
            google.script.host.close();
          })
          .withFailureHandler((error) => {
            alert('Error sending report: ' + error.message);
          })
          .sendEmailReport(email, startDate, endDate);
      }
    </script>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(400)
    .setHeight(350);
    
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Send Email Report');
}

/**
 * Create backup with confirmation dialog
 */
function createBackupWithDialog() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    'Create Backup',
    'Do you want to create a backup of this timesheet?',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    try {
      const backupUrl = createBackup();
      ui.alert('Backup Created', `Backup created successfully!\n\nURL: ${backupUrl}`, ui.ButtonSet.OK);
    } catch (error) {
      ui.alert('Error', `Failed to create backup: ${error.message}`, ui.ButtonSet.OK);
    }
  }
}

/**
 * Export to CSV with dialog
 */
function exportToCSVDialog() {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h3>📤 Export to CSV</h3>
      <form>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Start Date (optional):</label>
          <input type="date" id="startDate" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">End Date (optional):</label>
          <input type="date" id="endDate" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <p style="font-size: 12px; color: #666;">Leave dates empty to export all data</p>
        <button type="button" onclick="exportCSV()" style="background-color: #17a2b8; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Export CSV</button>
        <button type="button" onclick="google.script.host.close()" style="background-color: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
      </form>
      <div id="output" style="margin-top: 20px;"></div>
    </div>
    
    <script>
      function exportCSV() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        google.script.run
          .withSuccessHandler(showCSVOutput)
          .withFailureHandler((error) => {
            document.getElementById('output').innerHTML = '<p style="color: red;">Error: ' + error.message + '</p>';
          })
          .exportToCSV(startDate || null, endDate || null);
      }
      
      function showCSVOutput(csvData) {
        document.getElementById('output').innerHTML = 
          '<h4>CSV Data (copy and paste into a file):</h4>' +
          '<textarea style="width: 100%; height: 200px; font-family: monospace; font-size: 12px;">' + 
          csvData + '</textarea>';
      }
    </script>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(500)
    .setHeight(450);
    
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Export to CSV');
}