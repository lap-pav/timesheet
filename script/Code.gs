const TEMPLATE_FILE_ID = "1VK1fZU9QCTobVN2vUJ-FPcjf5BhAr75zUfPWzlXyHH4";

const MEMBER_SHEET_NAME = "Members";
const MAIN_SHEET_NAME = "Main";

const MEMBER_COLUMNS = {
  NO: 0,
  PAV_ID: 1,
  NAME: 2,
  POSITION: 3,
  COMPANY: 4,
  EMAIL: 5,
  IN_ACTIVE: 6,
}

function onOpen() {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('Custom Menu')
      .addItem('Generate Timesheet Files', 'generateTimesheetFiles')
      .addToUi();
}

function generateTimesheetFiles() {
  const time = readTime();
  const members = readMembers();
  console.log(`Time: ${time}`, `Members: `, members);
  const folder = createTimesheetFolder(time);
  members.forEach(member => {
    createTimesheetFile(folder, member, time);
  });
  SpreadsheetApp.getUi().alert(`Timesheet files generated in folder: ${folder.getName()}`);
}

function readTime() {
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MAIN_SHEET_NAME);
  const year = mainSheet.getRange("B1").getValue();
  const month = mainSheet.getRange("B2").getValue();
  const paddedMonth = month.toString().padStart(2, '0');
  return `${year}-${paddedMonth}`;
}

function readMembers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MEMBER_SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  // filter data with In-active = false, find column index of In-active
  data.shift(); // remove header row
  data = data.filter(row => !row[MEMBER_COLUMNS.IN_ACTIVE]);

  return data;
}

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

function createTimesheetFile(folder, member, time) {
  //copy from template file
  const fileName = `Timesheet_${time}_${member[MEMBER_COLUMNS.NAME]}`;
  //check if file was existed
  
  const templateFile = DriveApp.getFileById(TEMPLATE_FILE_ID);
  const newFile = templateFile.makeCopy(fileName, folder);
  //move new file to folder
  newFile.moveTo(folder);
}