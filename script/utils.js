// ============================================================================
// SHARED UTILITY SYSTEMS
// ============================================================================

// ============================================================================
// COMPREHENSIVE ERROR LOGGING AND REPORTING SYSTEM
// ============================================================================

/**
 * Advanced error logging and reporting system for Google Apps Script
 * Provides structured logging, error aggregation, and detailed reporting
 */
const ErrorReportingSystem = {
  
  // Error storage (in-memory for Google Apps Script session)
  errorLog: [],
  sessionId: null,
  
  /**
   * Initialize the error reporting system
   */
  initialize: function() {
    this.sessionId = Utilities.getUuid();
    this.errorLog = [];
    console.log(`Error reporting system initialized. Session ID: ${this.sessionId}`);
  },
  
  /**
   * Log a structured error with contextual information
   * @param {Object} error - Error object with type, source, message, etc.
   * @param {Object} context - Additional context information
   */
  logError: function(error, context = {}) {
    try {
      const enrichedError = {
        id: Utilities.getUuid(),
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        type: error.type || ERROR_TYPES.SYSTEM_FAILURE,
        source: error.source || 'UNKNOWN',
        message: error.message || 'No message provided',
        severity: error.severity || SEVERITY_LEVELS.ERROR,
        context: context,
        stackTrace: this.getStackTrace()
      };
      
      this.errorLog.push(enrichedError);
      
      // Console logging based on severity
      switch (error.severity) {
        case SEVERITY_LEVELS.CRITICAL:
          console.error(`CRITICAL: ${error.source}: ${error.message}`, context);
          break;
        case SEVERITY_LEVELS.ERROR:
          console.error(`ERROR: ${error.source}: ${error.message}`, context);
          break;
        case SEVERITY_LEVELS.WARNING:
          console.warn(`WARNING: ${error.source}: ${error.message}`, context);
          break;
        default:
          console.log(`INFO: ${error.source}: ${error.message}`, context);
      }
      
      // Immediate notification for critical errors
      if (error.severity === SEVERITY_LEVELS.CRITICAL) {
        this.notifyCriticalError(enrichedError);
      }
      
    } catch (loggingError) {
      console.error('Error in error logging system:', loggingError);
    }
  },
  
  /**
   * Generate comprehensive error report
   * @param {Object} options - Report generation options
   * @returns {Object} Detailed error report
   */
  generateReport: function(options = {}) {
    const report = {
      sessionId: this.sessionId,
      generatedAt: new Date().toISOString(),
      summary: {
        totalMessages: this.errorLog.length,
        criticalErrors: 0,
        errors: 0,
        warnings: 0,
        infoMessages: 0
      },
      errorsByType: {},
      errorsBySource: {},
      errorsBySeverity: {},
      timeline: [],
      recommendations: [],
      systemHealth: {
        overallStatus: 'HEALTHY',
        issues: []
      }
    };
    
    try {
      // Analyze errors
      for (const error of this.errorLog) {
        // Count by severity
        switch (error.severity) {
          case SEVERITY_LEVELS.CRITICAL:
            report.summary.criticalErrors++;
            break;
          case SEVERITY_LEVELS.ERROR:
            report.summary.errors++;
            break;
          case SEVERITY_LEVELS.WARNING:
            report.summary.warnings++;
            break;
          default:
            report.summary.infoMessages++;
        }
        
        // Count by type
        report.errorsByType[error.type] = (report.errorsByType[error.type] || 0) + 1;
        
        // Count by source
        report.errorsBySource[error.source] = (report.errorsBySource[error.source] || 0) + 1;
        
        // Count by severity
        report.errorsBySeverity[error.severity] = (report.errorsBySeverity[error.severity] || 0) + 1;
        
        // Add to timeline
        report.timeline.push({
          timestamp: error.timestamp,
          type: error.type,
          source: error.source,
          severity: error.severity,
          message: error.message
        });
      }
      
      // Sort timeline by timestamp
      report.timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // System health assessment
      if (report.summary.criticalErrors > 0) {
        report.systemHealth.overallStatus = 'CRITICAL';
        report.systemHealth.issues.push(`${report.summary.criticalErrors} critical errors detected`);
      } else if (report.summary.errors > 5) {
        report.systemHealth.overallStatus = 'DEGRADED';
        report.systemHealth.issues.push(`High error count: ${report.summary.errors} errors`);
      } else if (report.summary.warnings > 10) {
        report.systemHealth.overallStatus = 'WARNING';
        report.systemHealth.issues.push(`High warning count: ${report.summary.warnings} warnings`);
      }
      
      // Generate recommendations
      report.recommendations = this.generateRecommendations(report);
      
    } catch (reportError) {
      console.error('Error generating error report:', reportError);
      report.reportGenerationError = reportError.message;
    }
    
    return report;
  },
  
  /**
   * Generate actionable recommendations based on error patterns
   * @param {Object} report - Error report data
   * @returns {Array} Array of recommendation objects
   */
  generateRecommendations: function(report) {
    const recommendations = [];
    
    try {
      // File access issues
      if (report.errorsByType[ERROR_TYPES.FILE_ACCESS] > 2) {
        recommendations.push({
          priority: 'HIGH',
          category: 'PERMISSIONS',
          action: 'Review file permissions and ensure the script has access to all required files and folders.'
        });
      }
      
      // Timeout warnings
      if (report.errorsByType[ERROR_TYPES.TIMEOUT_WARNING] > 0) {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'PERFORMANCE',
          action: 'Reduce batch size or implement progressive processing for large datasets.'
        });
      }
      
      // Memory constraints
      if (report.errorsByType[ERROR_TYPES.MEMORY_CONSTRAINT] > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'PERFORMANCE',
          action: 'Implement more aggressive memory management and reduce data retention during processing.'
        });
      }
      
      // Data validation issues
      if (report.errorsByType[ERROR_TYPES.INVALID_ENTRY] > 10) {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'DATA_QUALITY',
          action: 'Review data entry guidelines and consider implementing stricter validation in source spreadsheets.'
        });
      }
      
      // System failures
      if (report.errorsByType[ERROR_TYPES.SYSTEM_FAILURE] > 0) {
        recommendations.push({
          priority: 'CRITICAL',
          category: 'SYSTEM',
          action: 'Review system logs and consider implementing additional error recovery mechanisms.'
        });
      }
      
    } catch (error) {
      console.error('Error generating recommendations:', error);
    }
    
    return recommendations;
  },
  
  /**
   * Get current stack trace for debugging
   * @returns {string} Stack trace string
   */
  getStackTrace: function() {
    try {
      throw new Error('Stack trace');
    } catch (e) {
      return e.stack || 'Stack trace not available';
    }
  },
  
  /**
   * Handle critical error notifications
   * @param {Object} error - Critical error object
   */
  notifyCriticalError: function(error) {
    try {
      // In Google Apps Script, we can use the UI to show critical errors
      const message = `CRITICAL ERROR: ${error.type}\n${error.message}\n\nSession: ${error.sessionId}\nTime: ${error.timestamp}`;
      
      // Try to show UI alert if available
      try {
        SpreadsheetApp.getUi().alert('Critical Error', message, SpreadsheetApp.getUi().ButtonSet.OK);
      } catch (uiError) {
        console.error('Cannot show UI alert:', uiError);
      }
      
      // Log to console with enhanced formatting
      console.error('='.repeat(80));
      console.error('CRITICAL ERROR DETECTED');
      console.error('='.repeat(80));
      console.error(`Type: ${error.type}`);
      console.error(`Source: ${error.source}`);
      console.error(`Message: ${error.message}`);
      console.error(`Session ID: ${error.sessionId}`);
      console.error(`Timestamp: ${error.timestamp}`);
      console.error('='.repeat(80));
      
    } catch (notificationError) {
      console.error('Error in critical error notification:', notificationError);
    }
  },
  
  /**
   * Clear error log (use with caution)
   */
  clearLog: function() {
    const previousCount = this.errorLog.length;
    this.errorLog = [];
    console.log(`Error log cleared. Previous error count: ${previousCount}`);
  }
};

// ============================================================================
// PROGRESS TRACKING FOR LONG-RUNNING OPERATIONS
// ============================================================================

/**
 * Advanced progress tracking system for Google Apps Script operations
 * Provides real-time progress monitoring, ETA calculation, and performance metrics
 */
const ProgressTracker = {
  
  // Active operation tracking
  operations: {},
  
  /**
   * Start tracking a new operation
   * @param {string} operationId - Unique identifier for the operation
   * @param {Object} config - Operation configuration
   * @returns {string} Operation ID
   */
  startOperation: function(operationId, config = {}) {
    const operation = {
      id: operationId,
      name: config.name || operationId,
      startTime: Date.now(),
      totalItems: config.totalItems || 0,
      completedItems: 0,
      currentItem: '',
      stages: config.stages || ['Processing'],
      currentStage: 0,
      status: 'RUNNING',
      errors: [],
      warnings: [],
      checkpoints: [],
      metadata: {
        batchSize: config.batchSize || 1,
        estimatedDuration: config.estimatedDuration || null
      }
    };
    
    this.operations[operationId] = operation;
    
    console.log(`Started operation: ${operation.name} (ID: ${operationId})`);
    return operationId;
  },
  
  /**
   * Update progress for an operation
   * @param {string} operationId - Operation identifier
   * @param {Object} update - Progress update data
   */
  updateProgress: function(operationId, update = {}) {
    const operation = this.operations[operationId];
    if (!operation) {
      console.error(`Operation ${operationId} not found`);
      return;
    }
    
    try {
      // Update completed items
      if (update.completedItems !== undefined) {
        operation.completedItems = update.completedItems;
      } else if (update.increment) {
        operation.completedItems += update.increment;
      }
      
      // Update current item
      if (update.currentItem) {
        operation.currentItem = update.currentItem;
      }
      
      // Update stage
      if (update.currentStage !== undefined) {
        operation.currentStage = Math.min(update.currentStage, operation.stages.length - 1);
      }
      
      // Add errors
      if (update.errors) {
        operation.errors.push(...(Array.isArray(update.errors) ? update.errors : [update.errors]));
      }
      
      // Add warnings
      if (update.warnings) {
        operation.warnings.push(...(Array.isArray(update.warnings) ? update.warnings : [update.warnings]));
      }
      
      // Create checkpoint
      const checkpoint = {
        timestamp: Date.now(),
        completedItems: operation.completedItems,
        currentStage: operation.currentStage,
        currentItem: operation.currentItem,
        elapsedTimeMs: Date.now() - operation.startTime
      };
      
      operation.checkpoints.push(checkpoint);
      
      // Calculate progress metrics
      const progress = this.calculateProgress(operation);
      
      // Log progress at intervals
      if (this.shouldLogProgress(operation)) {
        this.logProgress(operation, progress);
      }
      
      // Check for completion
      if (operation.completedItems >= operation.totalItems && operation.totalItems > 0) {
        this.completeOperation(operationId);
      }
      
    } catch (error) {
      console.error(`Error updating progress for ${operationId}:`, error);
      ErrorReportingSystem.logError({
        type: ERROR_TYPES.SYSTEM_FAILURE,
        source: 'PROGRESS_TRACKER',
        message: `Progress update failed: ${error.message}`,
        severity: SEVERITY_LEVELS.WARNING,
        timestamp: new Date().toISOString()
      }, { operationId: operationId });
    }
  },
  
  /**
   * Calculate comprehensive progress metrics
   * @param {Object} operation - Operation object
   * @returns {Object} Progress metrics
   */
  calculateProgress: function(operation) {
    const now = Date.now();
    const elapsedTimeMs = now - operation.startTime;
    const elapsedSeconds = elapsedTimeMs / 1000;
    
    const metrics = {
      percentage: operation.totalItems > 0 ? (operation.completedItems / operation.totalItems) * 100 : 0,
      elapsedTimeMs: elapsedTimeMs,
      elapsedTimeFormatted: this.formatDuration(elapsedTimeMs),
      itemsPerSecond: elapsedSeconds > 0 ? operation.completedItems / elapsedSeconds : 0,
      estimatedTotalTimeMs: null,
      estimatedRemainingTimeMs: null,
      estimatedCompletionTime: null,
      currentStage: operation.stages[operation.currentStage] || 'Unknown',
      stageProgress: `${operation.currentStage + 1}/${operation.stages.length}`
    };
    
    // Calculate ETA if we have enough data
    if (operation.completedItems > 0 && operation.totalItems > 0) {
      const remainingItems = operation.totalItems - operation.completedItems;
      metrics.estimatedTotalTimeMs = (elapsedTimeMs / operation.completedItems) * operation.totalItems;
      metrics.estimatedRemainingTimeMs = (elapsedTimeMs / operation.completedItems) * remainingItems;
      metrics.estimatedCompletionTime = new Date(now + metrics.estimatedRemainingTimeMs).toISOString();
    }
    
    return metrics;
  },
  
  /**
   * Check if progress should be logged based on intervals
   * @param {Object} operation - Operation object
   * @returns {boolean} Whether to log progress
   */
  shouldLogProgress: function(operation) {
    const checkpointInterval = AGGREGATION_CONFIG.CHECKPOINT_INTERVAL || 10;
    
    // Log at percentage intervals
    const percentage = operation.totalItems > 0 ? (operation.completedItems / operation.totalItems) * 100 : 0;
    const lastLoggedPercentage = operation.lastLoggedPercentage || 0;
    
    if (percentage - lastLoggedPercentage >= 10) {
      operation.lastLoggedPercentage = Math.floor(percentage / 10) * 10;
      return true;
    }
    
    // Log at item intervals
    if (operation.completedItems > 0 && operation.completedItems % checkpointInterval === 0) {
      return true;
    }
    
    // Log stage changes
    if (operation.currentStage !== operation.lastLoggedStage) {
      operation.lastLoggedStage = operation.currentStage;
      return true;
    }
    
    return false;
  },
  
  /**
   * Log progress information to console
   * @param {Object} operation - Operation object
   * @param {Object} progress - Progress metrics
   */
  logProgress: function(operation, progress) {
    const message = [
      `[${operation.name}]`,
      `${operation.completedItems}/${operation.totalItems}`,
      `(${Math.round(progress.percentage)}%)`,
      `Stage: ${progress.currentStage}`,
      `Elapsed: ${progress.elapsedTimeFormatted}`,
      progress.estimatedRemainingTimeMs ? `ETA: ${this.formatDuration(progress.estimatedRemainingTimeMs)}` : '',
      progress.itemsPerSecond > 0 ? `Rate: ${Math.round(progress.itemsPerSecond * 100) / 100}/s` : ''
    ].filter(Boolean).join(' | ');
    
    console.log(message);
    
    // Current item if specified
    if (operation.currentItem) {
      console.log(`  Current: ${operation.currentItem}`);
    }
  },
  
  /**
   * Complete an operation
   * @param {string} operationId - Operation identifier
   */
  completeOperation: function(operationId) {
    const operation = this.operations[operationId];
    if (!operation) {
      console.error(`Operation ${operationId} not found`);
      return;
    }
    
    operation.status = 'COMPLETED';
    operation.endTime = Date.now();
    operation.totalDurationMs = operation.endTime - operation.startTime;
    
    const finalMetrics = this.calculateProgress(operation);
    
    console.log(`=== Operation Completed: ${operation.name} ===`);
    console.log(`Total Duration: ${this.formatDuration(operation.totalDurationMs)}`);
    console.log(`Items Processed: ${operation.completedItems}/${operation.totalItems}`);
    console.log(`Average Rate: ${Math.round(finalMetrics.itemsPerSecond * 100) / 100} items/second`);
    console.log(`Errors: ${operation.errors.length}, Warnings: ${operation.warnings.length}`);
    console.log(`Status: ${operation.status}`);
    console.log('='.repeat(50));
  },
  
  /**
   * Fail an operation with error details
   * @param {string} operationId - Operation identifier
   * @param {Object} error - Error information
   */
  failOperation: function(operationId, error) {
    const operation = this.operations[operationId];
    if (!operation) {
      console.error(`Operation ${operationId} not found`);
      return;
    }
    
    operation.status = 'FAILED';
    operation.endTime = Date.now();
    operation.totalDurationMs = operation.endTime - operation.startTime;
    operation.failureReason = error;
    
    console.error(`=== Operation Failed: ${operation.name} ===`);
    console.error(`Duration: ${this.formatDuration(operation.totalDurationMs)}`);
    console.error(`Items Processed: ${operation.completedItems}/${operation.totalItems}`);
    console.error(`Failure Reason: ${error.message || error}`);
    console.error('='.repeat(50));
    
    ErrorReportingSystem.logError({
      type: ERROR_TYPES.SYSTEM_FAILURE,
      source: 'PROGRESS_TRACKER',
      message: `Operation failed: ${error.message || error}`,
      severity: SEVERITY_LEVELS.ERROR,
      timestamp: new Date().toISOString()
    }, { operationId: operationId, operation: operation });
  },
  
  /**
   * Format duration in milliseconds to human-readable string
   * @param {number} durationMs - Duration in milliseconds
   * @returns {string} Formatted duration string
   */
  formatDuration: function(durationMs) {
    if (!durationMs || durationMs < 0) return '0s';
    
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  },
  
  /**
   * Clean up completed operations (optional memory management)
   * @param {number} maxAge - Maximum age in milliseconds
   */
  cleanupOperations: function(maxAge = 3600000) { // Default 1 hour
    const now = Date.now();
    const toRemove = [];
    
    for (const [id, operation] of Object.entries(this.operations)) {
      if (operation.status !== 'RUNNING' && (now - operation.startTime) > maxAge) {
        toRemove.push(id);
      }
    }
    
    toRemove.forEach(function(id) {
      delete this.operations[id];
    }.bind(this));
    
    if (toRemove.length > 0) {
      console.log(`Cleaned up ${toRemove.length} old operations`);
    }
  }
};

// ============================================================================
// GOOGLE DRIVE API INTEGRATION
// ============================================================================

/**
 * Enhanced Google Drive API integration with comprehensive error handling
 * Provides robust file and folder operations with retry logic and detailed error reporting
 */
const DriveAPIIntegration = {
  
  /**
   * Test Drive API connectivity and permissions
   * @returns {Object} Connectivity test result
   */
  testConnectivity: function() {
    const result = {
      isConnected: false,
      permissions: {
        canAccessDrive: false,
        canCreateFolders: false,
        canCreateFiles: false
      },
      errors: []
    };
    
    try {
      // Test basic Drive access
      const rootFolder = DriveApp.getRootFolder();
      if (rootFolder) {
        result.isConnected = true;
        result.permissions.canAccessDrive = true;
        
        // Test folder creation
        try {
          const testFolder = rootFolder.createFolder('TimeSheet_Test_' + Date.now());
          result.permissions.canCreateFolders = true;
          
          // Test file creation
          try {
            const testFile = testFolder.createFile('test.txt', 'test content');
            result.permissions.canCreateFiles = true;
            
            // Clean up test files
            testFile.setTrashed(true);
          } catch (fileError) {
            result.errors.push({
              type: ERROR_TYPES.PERMISSION_DENIED,
              source: 'DRIVE_API_FILE_TEST',
              message: `Cannot create files: ${fileError.message}`,
              severity: SEVERITY_LEVELS.WARNING,
              timestamp: new Date().toISOString()
            });
          }
          
          // Clean up test folder
          testFolder.setTrashed(true);
        } catch (folderError) {
          result.errors.push({
            type: ERROR_TYPES.PERMISSION_DENIED,
            source: 'DRIVE_API_FOLDER_TEST',
            message: `Cannot create folders: ${folderError.message}`,
            severity: SEVERITY_LEVELS.WARNING,
            timestamp: new Date().toISOString()
          });
        }
      }
      
    } catch (error) {
      result.errors.push({
        type: ERROR_TYPES.SYSTEM_FAILURE,
        source: 'DRIVE_API_CONNECTIVITY',
        message: `Drive API connectivity test failed: ${error.message}`,
        severity: SEVERITY_LEVELS.CRITICAL,
        timestamp: new Date().toISOString()
      });
    }
    
    return result;
  }
};

// ============================================================================
// GOOGLE SHEETS API INTEGRATION
// ============================================================================

/**
 * Enhanced Google Sheets API integration with intelligent column detection
 * Provides robust spreadsheet operations with advanced header mapping and data extraction
 */
const SheetsAPIIntegration = {
  
  /**
   * Test Sheets API connectivity and permissions
   * @returns {Object} Connectivity test result
   */
  testConnectivity: function() {
    const result = {
      isConnected: false,
      permissions: {
        canAccessActiveSpreadsheet: false,
        canCreateSpreadsheets: false,
        canAccessMultipleSheets: false
      },
      errors: []
    };
    
    try {
      // Test basic Sheets access
      const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      if (activeSpreadsheet) {
        result.isConnected = true;
        result.permissions.canAccessActiveSpreadsheet = true;
        
        // Test spreadsheet creation
        try {
          const testSpreadsheet = SpreadsheetApp.create('TimeSheet_Test_' + Date.now());
          result.permissions.canCreateSpreadsheets = true;
          
          // Test multiple sheets access
          try {
            const testSheet = testSpreadsheet.insertSheet('Test');
            result.permissions.canAccessMultipleSheets = true;
            
            // Clean up test sheet
            testSpreadsheet.deleteSheet(testSheet);
          } catch (sheetError) {
            result.errors.push({
              type: ERROR_TYPES.PERMISSION_DENIED,
              source: 'SHEETS_API_MULTI_SHEET_TEST',
              message: `Cannot manage multiple sheets: ${sheetError.message}`,
              severity: SEVERITY_LEVELS.WARNING,
              timestamp: new Date().toISOString()
            });
          }
          
          // Clean up test spreadsheet
          DriveApp.getFileById(testSpreadsheet.getId()).setTrashed(true);
        } catch (createError) {
          result.errors.push({
            type: ERROR_TYPES.PERMISSION_DENIED,
            source: 'SHEETS_API_CREATE_TEST',
            message: `Cannot create spreadsheets: ${createError.message}`,
            severity: SEVERITY_LEVELS.WARNING,
            timestamp: new Date().toISOString()
          });
        }
      }
      
    } catch (error) {
      result.errors.push({
        type: ERROR_TYPES.SYSTEM_FAILURE,
        source: 'SHEETS_API_CONNECTIVITY',
        message: `Sheets API connectivity test failed: ${error.message}`,
        severity: SEVERITY_LEVELS.CRITICAL,
        timestamp: new Date().toISOString()
      });
    }
    
    return result;
  }
};


// ============================================================================
// SHARED UTILITY FUNCTIONS
// ============================================================================

/**
 * Read the time period (YYYY-MM format) from the main sheet
 * @returns {string} Time period in YYYY-MM format
 */
function readTime() {
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MAIN_SHEET_NAME);
  const year = mainSheet.getRange("B1").getValue();
  const month = mainSheet.getRange("B2").getValue();
  const paddedMonth = month.toString().padStart(2, '0');
  return `${year}-${paddedMonth}`;
}

/**
 * Read active members from the Members sheet
 * @returns {Array} Array of member data arrays
 */
function readMembers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MEMBER_SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  // filter data with In-active = false, find column index of In-active
  data.shift(); // remove header row
  data = data.filter(function(row) { return !row[MEMBER_COLUMNS.IN_ACTIVE]; });

  return data;
}
