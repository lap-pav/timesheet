/**
 * Update Options and README sheets from template to all member timesheet files
 * Created: 2026-01-19
 * 
 * Dependencies:
 * - constants.js: TEMPLATE_FILE_ID constant
 * - timesheet-aggregator.js: getMonthlyFolder(), getTimesheetFiles() functions
 * 
 * Functions:
 * - updateNewProjects20260119(): Pre-configured update for 2026-01 folder
 * - updateTimesheetSheetsInteractive(): Interactive UI for custom parameters
 * - updateSheetsInMemberTimesheets(): Batch update multiple files
 * - updateSheetsInFile(): Copy specific sheets from template to target file
 */
function updateNewProjects20260119() {
  const folder = '2026-01';
  const updatedSheets = ['Options', 'README'];
  
  try {
    Logger.log('Starting sheet update process...');
    
    // Update all member timesheets in the specified folder
    const result = updateSheetsInMemberTimesheets(folder, updatedSheets);
    
    // Show results to user
    if (result.success) {
      const message = `Successfully updated ${updatedSheets.join(' and ')} sheets in ${result.filesUpdated} timesheet files.`;
      Logger.log(message);
    } else {
      const message = `Update failed: ${result.error}\n\nFiles processed: ${result.filesProcessed}\nFiles updated: ${result.filesUpdated}`;
      Logger.log(message);
    }
    
  } catch (error) {
    Logger.log(`Error in updateNewProjects20260119: ${error.message}`);
    SpreadsheetApp.getUi().alert('Error', `Failed to update sheets: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Update specified sheets from template to all member timesheet files in a folder
 * @param {string} folderName - Name of the folder containing timesheet files
 * @param {Array<string>} sheetNames - Array of sheet names to update
 * @returns {Object} Result object with success status and statistics
 */
function updateSheetsInMemberTimesheets(folderName, sheetNames) {
  try {
    Logger.log(`Updating sheets [${sheetNames.join(', ')}] in folder: ${folderName}`);
    
    // Get the template file
    const templateSpreadsheet = SpreadsheetApp.openById(TEMPLATE_FILE_ID);
    Logger.log(`Opened template file: ${templateSpreadsheet.getName()}`);
    
    // Validate that all specified sheets exist in template
    const templateSheets = templateSpreadsheet.getSheets();
    const templateSheetNames = templateSheets.map(sheet => sheet.getName());
    
    for (const sheetName of sheetNames) {
      if (!templateSheetNames.includes(sheetName)) {
        throw new Error(`Sheet '${sheetName}' not found in template file`);
      }
    }
    Logger.log(`All sheets found in template: ${sheetNames.join(', ')}`);
    
    // Find the timesheet folder
    const timesheetFolderResult = getMonthlyFolder(folderName);
    Logger.log(`Found timesheet folder: ${folderName}`);
    
    // Get all timesheet files in the folder
    const timesheetFilesResult = getTimesheetFiles(timesheetFolderResult.folder);
    
    const timesheetFiles = timesheetFilesResult.files;
    Logger.log(`Found ${timesheetFiles.length} timesheet files to update`);
    
    if (timesheetFiles.length === 0) {
      return {
        success: true,
        filesProcessed: 0,
        filesUpdated: 0,
        error: null,
        message: 'No timesheet files found in folder'
      };
    }
    
    // Update each timesheet file
    let filesUpdated = 0;
    let filesProcessed = 0;
    const errors = [];
    
    for (const file of timesheetFiles) {
      try {
        filesProcessed++;
        Logger.log(`Processing file ${filesProcessed}/${timesheetFiles.length}: ${file.fileName}`);
        
        const updated = updateSheetsInFile(file, templateSpreadsheet, sheetNames);
        if (updated) {
          filesUpdated++;
          Logger.log(`✓ Successfully updated: ${file.fileName}`);
        } else {
          Logger.log(`- Skipped (no changes needed): ${file.fileName}`);
        }
        
        // Add a small delay to avoid hitting quota limits
        if (filesProcessed % 10 === 0) {
          Utilities.sleep(1000); // 1 second pause every 10 files
        }
        
      } catch (error) {
        const errorMsg = `Failed to update ${file.fileName}: ${error.message}`;
        Logger.log(`✗ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    // Return results
    const result = {
      success: errors.length === 0,
      filesProcessed: filesProcessed,
      filesUpdated: filesUpdated,
      errors: errors,
      error: errors.length > 0 ? `${errors.length} files failed to update. See logs for details.` : null
    };
    
    Logger.log(`Update complete: ${filesUpdated}/${filesProcessed} files updated successfully`);
    if (errors.length > 0) {
      Logger.log(`Errors encountered: ${JSON.stringify(errors)}`);
    }
    
    return result;
    
  } catch (error) {
    Logger.log(`Error in updateSheetsInMemberTimesheets: ${error.message}`);
    return {
      success: false,
      filesProcessed: 0,
      filesUpdated: 0,
      error: error.message
    };
  }
}

/**
 * Update specified sheets in a timesheet file by copying values only from template
 * @param {Object} file - The timesheet file object with fileId and fileName
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} templateSpreadsheet - The template spreadsheet
 * @param {Array<string>} sheetNames - Array of sheet names to update
 * @returns {boolean} True if any sheets were updated, false if no changes needed
 */
function updateSheetsInFile(file, templateSpreadsheet, sheetNames) {
  try {
    Logger.log('Opening file: ' + file.fileName);
    var targetSpreadsheet = SpreadsheetApp.openById(file.fileId);
    
    var sheetsUpdated = 0;
    
    for (var i = 0; i < sheetNames.length; i++) {
      var sheetName = sheetNames[i];
      try {
        Logger.log('Processing sheet: ' + sheetName);
        
        // Get the template sheet
        var templateSheet = templateSpreadsheet.getSheetByName(sheetName);
        if (!templateSheet) {
          Logger.log('⚠️ Template sheet \'' + sheetName + '\' not found, skipping');
          continue;
        }
        
        // Get or create the target sheet
        var targetSheet = targetSpreadsheet.getSheetByName(sheetName);
        if (!targetSheet) {
          Logger.log('Creating new sheet: ' + sheetName);
          targetSheet = targetSpreadsheet.insertSheet(sheetName);
        }
        
        // Copy only values from template to target
        var updated = copyValuesOnly(templateSheet, targetSheet);
        
        if (updated) {
          sheetsUpdated++;
          Logger.log('✓ Successfully updated values in sheet \'' + sheetName + '\' in ' + file.fileName);
        } else {
          Logger.log('- No values to copy in sheet \'' + sheetName + '\'');
        }
        
      } catch (sheetError) {
        Logger.log('✗ Error updating sheet \'' + sheetName + '\' in ' + file.fileName + ': ' + sheetError.message);
        throw sheetError;
      }
    }
    
    if (sheetsUpdated > 0) {
      SpreadsheetApp.flush();
      Logger.log('💾 Saved ' + sheetsUpdated + ' sheet updates to ' + file.fileName);
    }
    
    return sheetsUpdated > 0;
    
  } catch (error) {
    Logger.log('Error in updateSheetsInFile for ' + file.fileName + ': ' + error.message);
    throw error;
  }
}

/**
 * Copy only values from source sheet to target sheet, preserving time formats for specific range
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sourceSheet - Template sheet to copy from
 * @param {GoogleAppsScript.Spreadsheet.Sheet} targetSheet - Target sheet to copy to
 * @returns {boolean} True if values were copied, false if no data to copy
 */
function copyValuesOnly(sourceSheet, targetSheet) {
  try {
    Logger.log('Copying values from ' + sourceSheet.getName() + ' to ' + targetSheet.getName());
    
    // Get source sheet dimensions
    var sourceLastRow = sourceSheet.getLastRow();
    var sourceLastColumn = sourceSheet.getLastColumn();
    
    if (sourceLastRow === 0 || sourceLastColumn === 0) {
      Logger.log('Source sheet is empty, clearing target sheet');
      targetSheet.clear();
      return false;
    }
    
    // Clear target sheet first
    targetSheet.clear();
    
    // Get source data range
    var sourceRange = sourceSheet.getRange(1, 1, sourceLastRow, sourceLastColumn);
    
    // Ensure target sheet has enough rows and columns
    var targetMaxRows = targetSheet.getMaxRows();
    var targetMaxCols = targetSheet.getMaxColumns();
    
    // Add rows if needed
    if (sourceLastRow > targetMaxRows) {
      targetSheet.insertRows(targetMaxRows, sourceLastRow - targetMaxRows);
    }
    
    // Add columns if needed  
    if (sourceLastColumn > targetMaxCols) {
      targetSheet.insertColumns(targetMaxCols, sourceLastColumn - targetMaxCols);
    }
    
    // Get target range with same dimensions
    var targetRange = targetSheet.getRange(1, 1, sourceLastRow, sourceLastColumn);
    
    // DEBUG: Check K4 cell before copying
    if (sourceLastRow >= 4 && sourceLastColumn >= 11) {
      var sourceK4 = sourceSheet.getRange('K4');
      Logger.log('=== K4 BEFORE COPY ===');
      Logger.log('Source K4 Display Value: "' + sourceK4.getDisplayValue() + '"');
      Logger.log('Source K4 Number Format: "' + sourceK4.getNumberFormat() + '"');
      
      // Check if there are any data validation rules on this cell
      var validation = sourceK4.getDataValidation();
      if (validation) {
        Logger.log('Source K4 Has Validation: YES');
        Logger.log('Validation Type: ' + validation.getCriteriaType());
        var helpText = validation.getHelpText();
        if (helpText) {
          Logger.log('Validation Help Text: "' + helpText + '"');
        }
      } else {
        Logger.log('Source K4 Has Validation: NO');
      }
    }
    
    // Copy values
    var values = sourceRange.getValues();
    targetRange.setValues(values);
    
    // Copy number formats only for range K2:K70 (column 11, rows 2-70)
    var formatStartRow = 2;
    var formatEndRow = 70;
    var formatColumn = 11; // Column K
    
    // Check if the range exists in both source and target
    if (sourceLastRow >= formatEndRow && sourceLastColumn >= formatColumn &&
        targetSheet.getMaxRows() >= formatEndRow && targetSheet.getMaxColumns() >= formatColumn) {
      
      try {
        var sourceFormatRange = sourceSheet.getRange(formatStartRow, formatColumn, formatEndRow - formatStartRow + 1, 1);
        var targetFormatRange = targetSheet.getRange(formatStartRow, formatColumn, formatEndRow - formatStartRow + 1, 1);
        
        var numberFormats = sourceFormatRange.getNumberFormats();
        targetFormatRange.setNumberFormats(numberFormats);
        
        Logger.log('Applied number formats to range K2:K70');
        
        // DEBUG: Check K4 cell after all operations
        if (sourceLastRow >= 4 && sourceLastColumn >= 11) {
          var targetK4After = targetSheet.getRange('K4');
          var sourceK4After = sourceSheet.getRange('K4');
          
          Logger.log('=== K4 FINAL COMPARISON ===');
          Logger.log('Source Display: "' + sourceK4After.getDisplayValue() + '"');
          Logger.log('Target Display: "' + targetK4After.getDisplayValue() + '"');
          Logger.log('Display Values Match: ' + (sourceK4After.getDisplayValue() === targetK4After.getDisplayValue()));
          Logger.log('Number Formats Match: ' + (sourceK4After.getNumberFormat() === targetK4After.getNumberFormat()));
          
          // Proper Date comparison
          var sourceValue = sourceK4After.getValue();
          var targetValue = targetK4After.getValue();
          if (sourceValue instanceof Date && targetValue instanceof Date) {
            var timesMatch = sourceValue.getTime() === targetValue.getTime();
            Logger.log('Date Times Match: ' + timesMatch);
            if (!timesMatch) {
              Logger.log('  Source Time: ' + sourceValue.getTime() + ' (' + sourceValue.toISOString() + ')');
              Logger.log('  Target Time: ' + targetValue.getTime() + ' (' + targetValue.toISOString() + ')');
            }
          }
          
          // Check validation on target after copy
          var targetValidation = targetK4After.getDataValidation();
          if (targetValidation) {
            Logger.log('Target K4 Has Validation: YES');
            Logger.log('Target Validation Type: ' + targetValidation.getCriteriaType());
          } else {
            Logger.log('Target K4 Has Validation: NO');
          }
        }
        
      } catch (formatError) {
        Logger.log('Warning: Could not copy number formats for K2:K70: ' + formatError.message);
      }
    } else {
      Logger.log('Range K2:K70 not available for number format copying');
    }
    
    Logger.log('Copied values (' + sourceLastRow + 'x' + sourceLastColumn + ')');
    
    return true;
    
  } catch (error) {
    Logger.log('Error in copyValuesOnly: ' + error.message);
    throw error;
  }
}
