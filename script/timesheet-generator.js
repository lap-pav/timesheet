// ============================================================================
// TIMESHEET GENERATION MODULE
// ============================================================================

/**
 * Create a timesheet folder for the specified time period
 * @param {string} time - Time period in YYYY-MM format
 * @returns {Object} Google Drive folder object
 */
function createTimesheetFolder(time) {
  const folderName = `${time}`;
  //create folder in current spreadsheet folder
  const parentFolder = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId()).getParents().next();
  let folder;
  //check if folder already exists
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = parentFolder.createFolder(folderName);
  }
  return folder;
}

/**
 * Create a timesheet file for a specific member
 * @param {Object} folder - Google Drive folder object
 * @param {Array} member - Member data array
 * @param {string} time - Time period in YYYY-MM format
 */
function createTimesheetFile(folder, member, time) {
  //copy from template file
  const fileName = `Timesheet_${time}_${member[MEMBER_COLUMNS.NAME]}`;
  //check if file was existed
  
  const templateFile = DriveApp.getFileById(TEMPLATE_FILE_ID);
  const newFile = templateFile.makeCopy(fileName, folder);
  //move new file to folder
  newFile.moveTo(folder);
}
